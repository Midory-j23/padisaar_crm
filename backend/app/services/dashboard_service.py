from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.activity import Activity
from app.models.opportunity import Opportunity, SalesStage
from app.models.user import User, UserRole
from app.models.win_loss import FinalStatus, WinLossAnalysis
from app.schemas.dashboard import (
    DashboardKpis,
    ExpertOpenOpportunity,
    ExpertSummaryResponse,
    FunnelResponse,
    FunnelStage,
    LossReasonPoint,
    MonthlyTrendPoint,
    TeamMemberPerformance,
    TeamPerformanceResponse,
    TrendsResponse,
)
from app.schemas.opportunity import CLOSED_STAGES, KANBAN_STAGES
from app.services import activity_service, opportunity_service
from app.utils.datetime_utils import to_naive_utc


def period_range(
    period: str, from_date: datetime | None, to_date: datetime | None
) -> tuple[datetime, datetime]:
    from_date = to_naive_utc(from_date)
    to_date = to_naive_utc(to_date)
    now = datetime.utcnow()
    end = to_date or now
    if from_date:
        return from_date, end
    if period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarter":
        start = now - timedelta(days=90)
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now - timedelta(days=30)
    return start, end


def _opp_ownership_filter(current_user: User):
    if current_user.role == UserRole.EXPERT:
        return Opportunity.assigned_to_id == current_user.id
    return True


async def weighted_pipeline(db: AsyncSession, current_user: User) -> Decimal:
    query = select(Opportunity).where(
        Opportunity.sales_stage.notin_(CLOSED_STAGES),
        _opp_ownership_filter(current_user),
    )
    result = await db.execute(query)
    opps = result.scalars().all()
    total = sum((o.estimated_value or 0) * o.probability / 100 for o in opps)
    return Decimal(total)


async def conversion_rate(
    db: AsyncSession, current_user: User, start: datetime, end: datetime
) -> float:
    query = (
        select(WinLossAnalysis)
        .join(Opportunity, WinLossAnalysis.opportunity_id == Opportunity.id)
        .where(
            WinLossAnalysis.analyzed_at >= start,
            WinLossAnalysis.analyzed_at <= end,
            WinLossAnalysis.final_status.in_([FinalStatus.WON, FinalStatus.LOST]),
        )
    )
    if current_user.role == UserRole.EXPERT:
        query = query.where(Opportunity.assigned_to_id == current_user.id)
    result = await db.execute(query)
    records = result.scalars().all()
    won = sum(1 for r in records if r.final_status == FinalStatus.WON)
    lost = sum(1 for r in records if r.final_status == FinalStatus.LOST)
    total = won + lost
    return round((won / total * 100) if total else 0.0, 1)


async def at_risk_count(db: AsyncSession, current_user: User) -> int:
    threshold = datetime.utcnow() + timedelta(days=14)
    query = select(func.count()).select_from(Opportunity).where(
        Opportunity.sales_stage.notin_(CLOSED_STAGES),
        Opportunity.expected_close_date.isnot(None),
        Opportunity.expected_close_date < threshold,
        _opp_ownership_filter(current_user),
    )
    return (await db.execute(query)).scalar() or 0


async def overdue_followups(db: AsyncSession, current_user: User) -> int:
    query = activity_service.apply_ownership(activity_service.activity_query(), current_user).where(
        Activity.follow_up_date < datetime.utcnow(),
        Activity.follow_up_completed.is_(False),
    )
    if current_user.role == UserRole.EXPERT:
        query = query.where(Activity.created_by_id == current_user.id)
    return (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0


async def get_kpis(
    db: AsyncSession,
    current_user: User,
    *,
    period: str = "month",
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> DashboardKpis:
    start, end = period_range(period, from_date, to_date)
    return DashboardKpis(
        weighted_pipeline_value=await weighted_pipeline(db, current_user),
        conversion_rate=await conversion_rate(db, current_user, start, end),
        at_risk_count=await at_risk_count(db, current_user),
        overdue_followups=await overdue_followups(db, current_user),
        period=period,
    )


async def get_funnel(db: AsyncSession, current_user: User) -> FunnelResponse:
    query = (
        select(
            Opportunity.sales_stage,
            func.count(Opportunity.id),
            func.coalesce(func.sum(Opportunity.estimated_value), 0),
        )
        .where(_opp_ownership_filter(current_user))
        .group_by(Opportunity.sales_stage)
    )
    result = await db.execute(query)
    rows = {row[0]: (row[1], row[2]) for row in result.all()}

    stages: list[FunnelStage] = []
    for stage in KANBAN_STAGES:
        count, value = rows.get(stage, (0, 0))
        stages.append(
            FunnelStage(stage=stage.value, count=count, total_value=Decimal(value or 0))
        )
    abandoned = rows.get(SalesStage.ABANDONED, (0, 0))
    if abandoned[0]:
        lost = next(s for s in stages if s.stage == SalesStage.CLOSED_LOST.value)
        idx = stages.index(lost)
        stages[idx] = FunnelStage(
            stage=lost.stage,
            count=lost.count + abandoned[0],
            total_value=lost.total_value + Decimal(abandoned[1] or 0),
        )

    return FunnelResponse(stages=stages)


async def get_team_performance(db: AsyncSession) -> TeamPerformanceResponse:
    users_result = await db.execute(
        select(User).where(User.is_active.is_(True), User.role == UserRole.EXPERT)
    )
    users = users_result.scalars().all()

    members: list[TeamMemberPerformance] = []
    for user in users:
        opps_result = await db.execute(
            select(Opportunity).where(Opportunity.assigned_to_id == user.id)
        )
        opps = opps_result.scalars().all()
        open_opps = [o for o in opps if o.sales_stage not in CLOSED_STAGES]
        pipeline = sum(o.estimated_value or 0 for o in open_opps)

        wl_result = await db.execute(
            select(WinLossAnalysis)
            .join(Opportunity)
            .where(Opportunity.assigned_to_id == user.id)
        )
        wl_records = wl_result.scalars().all()
        won = sum(1 for r in wl_records if r.final_status == FinalStatus.WON)
        closed = sum(1 for r in wl_records if r.final_status in (FinalStatus.WON, FinalStatus.LOST))
        win_rate = round((won / closed * 100) if closed else 0.0, 1)

        last_act_result = await db.execute(
            select(func.max(Activity.activity_date)).where(Activity.created_by_id == user.id)
        )
        last_activity = last_act_result.scalar()

        members.append(
            TeamMemberPerformance(
                user_id=user.id,
                user_name=user.name,
                open_count=len(open_opps),
                pipeline_value=Decimal(pipeline),
                win_rate=win_rate,
                last_activity_date=last_activity,
            )
        )

    members.sort(key=lambda m: m.pipeline_value, reverse=True)
    return TeamPerformanceResponse(members=members)


async def get_trends(db: AsyncSession, current_user: User) -> TrendsResponse:
    now = datetime.utcnow()
    monthly: list[MonthlyTrendPoint] = []

    ref = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    for i in range(11, -1, -1):
        month_start = ref
        for _ in range(i):
            month_start = (month_start - timedelta(days=1)).replace(day=1)
        if month_start.month == 12:
            next_month = month_start.replace(year=month_start.year + 1, month=1)
        else:
            next_month = month_start.replace(month=month_start.month + 1)
        month_end = next_month - timedelta(seconds=1)

        query = (
            select(WinLossAnalysis)
            .join(Opportunity)
            .where(
                WinLossAnalysis.final_status == FinalStatus.WON,
                WinLossAnalysis.analyzed_at >= month_start,
                WinLossAnalysis.analyzed_at <= month_end,
            )
        )
        if current_user.role == UserRole.EXPERT:
            query = query.where(Opportunity.assigned_to_id == current_user.id)
        result = await db.execute(query)
        won_records = result.scalars().all()
        label = f"{month_start.year}-{month_start.month:02d}"
        monthly.append(
            MonthlyTrendPoint(
                month=label,
                won_count=len(won_records),
                won_value=Decimal(sum(r.final_contract_value or 0 for r in won_records)),
            )
        )

    loss_query = (
        select(WinLossAnalysis.result_reason, func.count())
        .join(Opportunity)
        .where(
            WinLossAnalysis.final_status == FinalStatus.LOST,
            WinLossAnalysis.result_reason.isnot(None),
        )
    )
    if current_user.role == UserRole.EXPERT:
        loss_query = loss_query.where(Opportunity.assigned_to_id == current_user.id)
    loss_query = loss_query.group_by(WinLossAnalysis.result_reason)
    loss_result = await db.execute(loss_query)
    loss_reasons = [
        LossReasonPoint(reason=row[0].value if row[0] else "OTHER", count=row[1])
        for row in loss_result.all()
    ]
    loss_reasons.sort(key=lambda x: x.count, reverse=True)

    return TrendsResponse(monthly_won=monthly, loss_reasons=loss_reasons)


async def get_recent_activities(db: AsyncSession, current_user: User, limit: int = 10) -> dict:
    query = (
        activity_service.apply_ownership(activity_service.activity_query(), current_user)
        .order_by(Activity.activity_date.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    activities = result.scalars().unique().all()
    return {"items": [activity_service.to_response(a) for a in activities]}


async def get_expert_summary(db: AsyncSession, current_user: User) -> ExpertSummaryResponse:
    start, end = period_range("month", None, None)

    opps_result = await db.execute(
        select(Opportunity)
        .options(selectinload(Opportunity.account))
        .where(
            Opportunity.assigned_to_id == current_user.id,
            Opportunity.sales_stage.notin_(CLOSED_STAGES),
        )
        .order_by(Opportunity.updated_at.desc())
    )
    open_opps = opps_result.scalars().all()

    overdue_query = (
        activity_service.apply_ownership(activity_service.activity_query(), current_user)
        .where(
            Activity.follow_up_date < datetime.utcnow(),
            Activity.follow_up_completed.is_(False),
            Activity.created_by_id == current_user.id,
        )
        .order_by(Activity.follow_up_date.asc())
        .limit(10)
    )
    overdue_result = await db.execute(overdue_query)
    overdue_activities = overdue_result.scalars().unique().all()

    week_end = datetime.utcnow() + timedelta(days=7)
    upcoming_query = (
        activity_service.apply_ownership(activity_service.activity_query(), current_user)
        .where(
            Activity.created_by_id == current_user.id,
            Activity.activity_date >= datetime.utcnow(),
            Activity.activity_date <= week_end,
        )
        .order_by(Activity.activity_date.asc())
        .limit(10)
    )
    upcoming_result = await db.execute(upcoming_query)
    upcoming_activities = upcoming_result.scalars().unique().all()

    return ExpertSummaryResponse(
        weighted_pipeline_value=await weighted_pipeline(db, current_user),
        open_opportunities_count=len(open_opps),
        conversion_rate=await conversion_rate(db, current_user, start, end),
        overdue_followups=await overdue_followups(db, current_user),
        open_opportunities=[
            ExpertOpenOpportunity(
                id=o.id,
                title=o.title,
                account_name=o.account.name if o.account else None,
                sales_stage=o.sales_stage.value,
                estimated_value=o.estimated_value,
                expected_close_date=o.expected_close_date,
                is_overdue=opportunity_service.is_overdue(o),
            )
            for o in open_opps
        ],
        overdue_activities=[activity_service.to_response(a) for a in overdue_activities],
        upcoming_activities=[activity_service.to_response(a) for a in upcoming_activities],
    )
