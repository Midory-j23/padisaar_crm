from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit_log import AuditAction
from app.models.opportunity import Opportunity, OpportunityStageHistory, SalesStage
from app.models.user import User, UserRole
from app.schemas.opportunity import (
    CLOSED_STAGES,
    KANBAN_STAGES,
    STAGE_PROBABILITY,
    OpportunityCreate,
    OpportunityDetailResponse,
    OpportunityResponse,
    OpportunitySummary,
    OpportunityUpdate,
    StageHistoryResponse,
)
from app.services.access import ensure_account_access
from app.models.notification import NotificationType
from app.services.exceptions import ForbiddenError, NotFoundError
from app.services.notification_service import create_notification_if_not_exists
from app.utils.audit import log_audit


def is_overdue(opp: Opportunity) -> bool:
    if not opp.expected_close_date or opp.sales_stage in CLOSED_STAGES:
        return False
    return opp.expected_close_date.replace(tzinfo=None) < datetime.utcnow()


def to_response(opp: Opportunity) -> OpportunityResponse:
    has_win_loss = opp.win_loss is not None
    pending = opp.sales_stage in CLOSED_STAGES and not has_win_loss
    return OpportunityResponse(
        id=opp.id,
        account_id=opp.account_id,
        account_name=opp.account.name if opp.account else None,
        title=opp.title,
        project_type=opp.project_type,
        sales_stage=opp.sales_stage,
        estimated_value=opp.estimated_value,
        probability=opp.probability,
        lead_source=opp.lead_source,
        expected_close_date=opp.expected_close_date,
        competitors=opp.competitors or [],
        assigned_to_id=opp.assigned_to_id,
        assigned_to_name=opp.assigned_to.name if opp.assigned_to else None,
        is_overdue=is_overdue(opp),
        has_win_loss=has_win_loss,
        pending_win_loss=pending,
        created_at=opp.created_at,
    )


def opp_query():
    return select(Opportunity).options(
        selectinload(Opportunity.account),
        selectinload(Opportunity.assigned_to),
        selectinload(Opportunity.win_loss),
    )


def apply_ownership(query, current_user: User):
    if current_user.role == UserRole.EXPERT:
        query = query.where(Opportunity.assigned_to_id == current_user.id)
    return query


async def _get_opportunity(db: AsyncSession, opp_id: str, current_user: User) -> Opportunity:
    result = await db.execute(opp_query().where(Opportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise NotFoundError("فرصت یافت نشد")
    if current_user.role == UserRole.EXPERT and opp.assigned_to_id != current_user.id:
        raise ForbiddenError()
    return opp


async def get_summary(db: AsyncSession, current_user: User) -> OpportunitySummary:
    query = apply_ownership(opp_query(), current_user)
    result = await db.execute(query)
    opps = result.scalars().unique().all()

    open_opps = [o for o in opps if o.sales_stage not in CLOSED_STAGES]
    total_pipeline = sum(o.estimated_value or 0 for o in open_opps)
    weighted = sum((o.estimated_value or 0) * o.probability / 100 for o in open_opps)

    return OpportunitySummary(
        total_open=len(open_opps),
        total_pipeline_value=Decimal(total_pipeline),
        weighted_pipeline_value=Decimal(weighted),
        total_won=sum(1 for o in opps if o.sales_stage == SalesStage.CLOSED_WON),
        total_lost=sum(1 for o in opps if o.sales_stage == SalesStage.CLOSED_LOST),
    )


async def get_kanban(
    db: AsyncSession, current_user: User, account_id: str | None = None
) -> dict[str, list]:
    query = apply_ownership(opp_query(), current_user)
    if account_id:
        query = query.where(Opportunity.account_id == account_id)
    query = query.order_by(Opportunity.updated_at.desc())
    result = await db.execute(query)
    opps = result.scalars().unique().all()

    board: dict[str, list] = {stage.value: [] for stage in KANBAN_STAGES}
    for opp in opps:
        stage_key = opp.sales_stage.value
        if stage_key in board:
            board[stage_key].append(to_response(opp))
        elif opp.sales_stage == SalesStage.ABANDONED:
            board[SalesStage.CLOSED_LOST.value].append(to_response(opp))

    return board


async def list_opportunities(
    db: AsyncSession,
    current_user: User,
    *,
    stage: SalesStage | None = None,
    account_id: str | None = None,
    assigned_to_id: str | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = apply_ownership(opp_query(), current_user)

    if stage:
        query = query.where(Opportunity.sales_stage == stage)
    if account_id:
        query = query.where(Opportunity.account_id == account_id)
    if assigned_to_id and current_user.role == UserRole.MANAGER:
        query = query.where(Opportunity.assigned_to_id == assigned_to_id)
    if search:
        query = query.where(Opportunity.title.ilike(f"%{search}%"))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        query.order_by(Opportunity.updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    opps = result.scalars().unique().all()

    return {
        "items": [to_response(o) for o in opps],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


async def create_opportunity(
    db: AsyncSession, current_user: User, body: OpportunityCreate
) -> OpportunityResponse:
    await ensure_account_access(db, body.account_id, current_user)
    data = body.model_dump()
    if current_user.role == UserRole.EXPERT:
        data["assigned_to_id"] = current_user.id
    if data.get("probability") is None:
        data["probability"] = STAGE_PROBABILITY.get(body.sales_stage, 10)

    opp = Opportunity(**data)
    db.add(opp)
    await db.flush()

    history = OpportunityStageHistory(
        opportunity_id=opp.id,
        from_stage=None,
        to_stage=opp.sales_stage,
        changed_by_id=current_user.id,
    )
    db.add(history)
    await log_audit(db, "Opportunity", opp.id, AuditAction.CREATE, current_user.id, data)
    await db.commit()

    result = await db.execute(opp_query().where(Opportunity.id == opp.id))
    return to_response(result.scalar_one())


async def get_opportunity_detail(
    db: AsyncSession, current_user: User, opportunity_id: str
) -> OpportunityDetailResponse:
    result = await db.execute(
        opp_query()
        .options(selectinload(Opportunity.stage_history).selectinload(OpportunityStageHistory.changed_by))
        .where(Opportunity.id == opportunity_id)
    )
    opp = result.scalar_one_or_none()
    if not opp:
        raise NotFoundError("فرصت یافت نشد")
    if current_user.role == UserRole.EXPERT and opp.assigned_to_id != current_user.id:
        raise ForbiddenError()

    base = to_response(opp)
    history = sorted(opp.stage_history, key=lambda h: h.changed_at, reverse=True)
    return OpportunityDetailResponse(
        **base.model_dump(),
        stage_history=[
            StageHistoryResponse(
                id=h.id,
                from_stage=h.from_stage,
                to_stage=h.to_stage,
                changed_by_name=h.changed_by.name if h.changed_by else None,
                changed_at=h.changed_at,
            )
            for h in history
        ],
    )


async def update_opportunity(
    db: AsyncSession, current_user: User, opportunity_id: str, body: OpportunityUpdate
) -> OpportunityResponse:
    opp = await _get_opportunity(db, opportunity_id, current_user)
    old_stage = opp.sales_stage
    updates = body.model_dump(exclude_unset=True)

    if "account_id" in updates and updates["account_id"]:
        await ensure_account_access(db, updates["account_id"], current_user)

    old_data = {c.name: getattr(opp, c.name) for c in opp.__table__.columns}
    for field, value in updates.items():
        setattr(opp, field, value)

    new_stage = opp.sales_stage
    if not updates:
        await db.commit()
        result = await db.execute(opp_query().where(Opportunity.id == opportunity_id))
        return to_response(result.scalar_one())

    if old_stage != new_stage:
        history = OpportunityStageHistory(
            opportunity_id=opp.id,
            from_stage=old_stage,
            to_stage=new_stage,
            changed_by_id=current_user.id,
        )
        db.add(history)
        if body.probability is None:
            opp.probability = STAGE_PROBABILITY.get(new_stage, opp.probability)
        if opp.assigned_to_id:
            await create_notification_if_not_exists(
                db,
                opp.assigned_to_id,
                NotificationType.STAGE_CHANGE,
                "Opportunity",
                opp.id,
                title="تغییر مرحله فروش",
                message=f"فرصت «{opp.title}» به مرحله جدید منتقل شد",
            )

    await log_audit(
        db,
        "Opportunity",
        opportunity_id,
        AuditAction.UPDATE,
        current_user.id,
        {"before": old_data, "after": updates, "title": opp.title},
    )
    await db.commit()

    result = await db.execute(opp_query().where(Opportunity.id == opportunity_id))
    return to_response(result.scalar_one())


async def delete_opportunity(db: AsyncSession, current_user: User, opportunity_id: str) -> None:
    result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise NotFoundError("فرصت یافت نشد")
    await log_audit(db, "Opportunity", opportunity_id, AuditAction.DELETE, current_user.id, {})
    await db.delete(opp)
    await db.commit()
