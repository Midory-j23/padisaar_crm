from collections import Counter
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account, Industry
from app.models.audit_log import AuditAction
from app.models.opportunity import Opportunity, ProjectType
from app.models.user import User, UserRole
from app.models.win_loss import FinalStatus, ResultReason, WinLossAnalysis
from app.schemas.win_loss import (
    LessonCard,
    WinLossCreate,
    WinLossResponse,
    WinLossSummary,
    WinLossUpdate,
)
from app.services.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.utils.audit import log_audit
from app.utils.datetime_utils import to_naive_utc


def to_response(analysis: WinLossAnalysis) -> WinLossResponse:
    opp = analysis.opportunity
    return WinLossResponse(
        id=analysis.id,
        opportunity_id=analysis.opportunity_id,
        opportunity_title=opp.title if opp else None,
        account_name=opp.account.name if opp and opp.account else None,
        final_status=analysis.final_status,
        result_reason=analysis.result_reason,
        lessons_learned=analysis.lessons_learned,
        final_contract_value=analysis.final_contract_value,
        analyzed_at=analysis.analyzed_at,
        analyzed_by_name=analysis.analyzed_by.name if analysis.analyzed_by else None,
    )


def base_query():
    return select(WinLossAnalysis).options(
        selectinload(WinLossAnalysis.opportunity).selectinload(Opportunity.account),
        selectinload(WinLossAnalysis.analyzed_by),
    )


def apply_ownership(query, current_user: User):
    if current_user.role == UserRole.EXPERT:
        query = query.join(Opportunity).where(Opportunity.assigned_to_id == current_user.id)
    return query


async def get_summary(db: AsyncSession, current_user: User) -> WinLossSummary:
    query = apply_ownership(base_query(), current_user)
    result = await db.execute(query)
    records = result.scalars().unique().all()

    total_closed = len(records)
    won = [r for r in records if r.final_status == FinalStatus.WON]
    lost = [r for r in records if r.final_status == FinalStatus.LOST]

    win_rate = (len(won) / total_closed * 100) if total_closed else 0.0

    cycle_days = []
    for r in won:
        if r.opportunity and r.opportunity.created_at:
            delta = (r.analyzed_at - r.opportunity.created_at).days
            cycle_days.append(delta)
    avg_cycle = sum(cycle_days) / len(cycle_days) if cycle_days else None

    total_won_value = sum(r.final_contract_value or 0 for r in won) or None

    loss_reasons = [r.result_reason.value for r in lost if r.result_reason]
    top_reason = Counter(loss_reasons).most_common(1)[0][0] if loss_reasons else None

    return WinLossSummary(
        total_closed=total_closed,
        total_won=len(won),
        total_lost=len(lost),
        win_rate=round(win_rate, 1),
        avg_cycle_days=round(avg_cycle, 1) if avg_cycle is not None else None,
        total_won_value=total_won_value,
        top_loss_reason=top_reason,
    )


async def get_lessons(
    db: AsyncSession,
    current_user: User,
    *,
    search: str | None = None,
    industry: Industry | None = None,
    project_type: ProjectType | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = (
        base_query()
        .join(Opportunity, WinLossAnalysis.opportunity_id == Opportunity.id)
        .join(Account, Opportunity.account_id == Account.id, isouter=True)
        .where(
            WinLossAnalysis.lessons_learned.isnot(None),
            WinLossAnalysis.lessons_learned != "",
        )
    )

    if current_user.role == UserRole.EXPERT:
        query = query.where(Opportunity.assigned_to_id == current_user.id)
    if search:
        query = query.where(WinLossAnalysis.lessons_learned.ilike(f"%{search}%"))
    if industry:
        query = query.where(Account.industry == industry)
    if project_type:
        query = query.where(Opportunity.project_type == project_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        query.order_by(WinLossAnalysis.analyzed_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    records = result.scalars().unique().all()

    items = [
        LessonCard(
            id=r.id,
            opportunity_title=r.opportunity.title if r.opportunity else None,
            account_name=r.opportunity.account.name if r.opportunity and r.opportunity.account else None,
            final_status=r.final_status,
            lessons_learned=r.lessons_learned or "",
            analyzed_at=r.analyzed_at,
            analyzed_by_name=r.analyzed_by.name if r.analyzed_by else None,
        )
        for r in records
    ]
    return {"items": items, "total": total}


async def list_win_loss(
    db: AsyncSession,
    current_user: User,
    *,
    status: FinalStatus | None = None,
    reason: ResultReason | None = None,
    opportunity_id: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    assigned_to: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    from_date = to_naive_utc(from_date)
    to_date = to_naive_utc(to_date)
    query = apply_ownership(base_query(), current_user)

    if status:
        query = query.where(WinLossAnalysis.final_status == status)
    if reason:
        query = query.where(WinLossAnalysis.result_reason == reason)
    if opportunity_id:
        query = query.where(WinLossAnalysis.opportunity_id == opportunity_id)
    if from_date:
        query = query.where(WinLossAnalysis.analyzed_at >= from_date)
    if to_date:
        query = query.where(WinLossAnalysis.analyzed_at <= to_date)
    if assigned_to:
        query = query.join(Opportunity, WinLossAnalysis.opportunity_id == Opportunity.id).where(
            Opportunity.assigned_to_id == assigned_to
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        query.order_by(WinLossAnalysis.analyzed_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    records = result.scalars().unique().all()

    return {
        "items": [to_response(r) for r in records],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


async def create_win_loss(
    db: AsyncSession, current_user: User, body: WinLossCreate
) -> WinLossResponse:
    result = await db.execute(select(Opportunity).where(Opportunity.id == body.opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise NotFoundError("فرصت یافت نشد")
    if current_user.role == UserRole.EXPERT and opp.assigned_to_id != current_user.id:
        raise ForbiddenError()

    existing = await db.execute(
        select(WinLossAnalysis).where(WinLossAnalysis.opportunity_id == body.opportunity_id)
    )
    if existing.scalar_one_or_none():
        raise ConflictError("تحلیل برد/باخت قبلاً ثبت شده است")

    analysis = WinLossAnalysis(
        opportunity_id=body.opportunity_id,
        final_status=body.final_status,
        result_reason=body.result_reason,
        lessons_learned=body.lessons_learned,
        final_contract_value=body.final_contract_value,
        analyzed_by_id=current_user.id,
    )
    db.add(analysis)
    await db.flush()
    await log_audit(
        db,
        "WinLoss",
        analysis.id,
        AuditAction.CREATE,
        current_user.id,
        {
            "title": opp.title,
            "opportunity_id": body.opportunity_id,
            "final_status": body.final_status.value,
            "result_reason": body.result_reason.value if body.result_reason else None,
        },
    )
    await db.commit()

    result = await db.execute(base_query().where(WinLossAnalysis.id == analysis.id))
    return to_response(result.scalar_one())


async def get_win_loss(
    db: AsyncSession, current_user: User, analysis_id: str
) -> WinLossResponse:
    result = await db.execute(base_query().where(WinLossAnalysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise NotFoundError("تحلیل یافت نشد")
    if current_user.role == UserRole.EXPERT and analysis.opportunity.assigned_to_id != current_user.id:
        raise ForbiddenError()
    return to_response(analysis)


async def update_win_loss(
    db: AsyncSession, current_user: User, analysis_id: str, body: WinLossUpdate
) -> WinLossResponse:
    result = await db.execute(base_query().where(WinLossAnalysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise NotFoundError("تحلیل یافت نشد")
    if current_user.role == UserRole.EXPERT and analysis.opportunity.assigned_to_id != current_user.id:
        raise ForbiddenError()

    before = {
        "final_status": analysis.final_status.value,
        "result_reason": analysis.result_reason.value if analysis.result_reason else None,
        "lessons_learned": analysis.lessons_learned,
        "final_contract_value": str(analysis.final_contract_value or 0),
    }
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(analysis, field, value)

    await log_audit(
        db,
        "WinLoss",
        analysis_id,
        AuditAction.UPDATE,
        current_user.id,
        {
            "title": analysis.opportunity.title if analysis.opportunity else None,
            "before": before,
            "after": updates,
        },
    )
    await db.commit()
    await db.refresh(analysis, ["opportunity", "analyzed_by"])
    return to_response(analysis)
