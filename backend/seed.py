"""Seed database with sample data."""

import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.account import Account, Industry, OrgSize, PriorityLevel, RelationshipStatus
from app.models.activity import Activity, ActivityType
from app.models.contact import Contact, InfluenceLevel, Sentiment
from app.models.opportunity import LeadSource, Opportunity, ProjectType, SalesStage
from app.models.user import User, UserRole
from app.models.win_loss import FinalStatus, ResultReason, WinLossAnalysis
from app.utils.security import hash_password


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).limit(1))
        if existing.scalar_one_or_none():
            print("Database already seeded, skipping.")
            return

        manager = User(
            name="مدیر سیستم",
            email="admin@padisaar.com",
            mobile="09120000001",
            hashed_password=hash_password("admin123"),
            role=UserRole.MANAGER,
        )
        expert = User(
            name="کارشناس فروش",
            email="expert@padisaar.com",
            mobile="09120000002",
            hashed_password=hash_password("expert123"),
            role=UserRole.EXPERT,
        )
        db.add_all([manager, expert])
        await db.flush()

        accounts = [
            Account(
                name="پتروشیمی پارس",
                national_id="10101234567",
                industry=Industry.PETROCHEMICAL,
                size=OrgSize.LARGE,
                priority_level=PriorityLevel.A_STRATEGIC,
                province="خوزستان",
                city="ماهشهر",
                address=None,
                relationship_status=RelationshipStatus.CURRENT_CLIENT,
                account_manager_id=expert.id,
            ),
            Account(
                name="فولاد مبارکه",
                national_id="10202345678",
                industry=Industry.STEEL,
                size=OrgSize.LARGE,
                priority_level=PriorityLevel.A_STRATEGIC,
                province="اصفهان",
                city="اصفهان",
                address=None,
                relationship_status=RelationshipStatus.NEW_LEAD,
                account_manager_id=expert.id,
            ),
            Account(
                name="نفت و گاز جنوب",
                national_id="10303456789",
                industry=Industry.OIL_GAS,
                size=OrgSize.MEDIUM,
                priority_level=PriorityLevel.B_MEDIUM,
                province="خوزستان",
                city="اهواز",
                address=None,
                relationship_status=RelationshipStatus.CURRENT_CLIENT,
                account_manager_id=manager.id,
            ),
        ]
        db.add_all(accounts)
        await db.flush()

        contacts = [
            Contact(
                account_id=accounts[0].id,
                full_name="علی رضایی",
                job_title="مدیر فنی",
                department="مهندسی",
                mobile="09121234567",
                email="ali.rezaei@example.com",
                influence_level=InfluenceLevel.DECISION_MAKER,
                sentiment=Sentiment.CHAMPION,
            ),
            Contact(
                account_id=accounts[0].id,
                full_name="مریم احمدی",
                job_title="کارشناس خرید",
                department="تدارکات",
                mobile="09129876543",
                influence_level=InfluenceLevel.BUYER,
                sentiment=Sentiment.NEUTRAL,
            ),
        ]
        db.add_all(contacts)

        opportunity = Opportunity(
            account_id=accounts[0].id,
            title="تأمین تجهیزات پتروشیمی",
            project_type=ProjectType.EQUIPMENT_SUPPLY,
            sales_stage=SalesStage.INITIAL_CONTACT,
            estimated_value=5_000_000_000,
            probability=10,
            lead_source=LeadSource.TENDER,
            assigned_to_id=expert.id,
        )
        db.add(opportunity)
        await db.flush()

        from datetime import datetime, timedelta
        from decimal import Decimal

        activity = Activity(
            account_id=accounts[0].id,
            opportunity_id=opportunity.id,
            contact_id=contacts[0].id,
            activity_type=ActivityType.IN_PERSON_MEETING,
            activity_date=datetime.utcnow() - timedelta(days=2),
            meeting_notes="جلسه اولیه با تیم فنی. نیاز به بررسی مشخصات فنی تجهیزات.",
            outcome="درخواست ارسال کاتالوگ فنی",
            next_step="ارسال پروپوزال اولیه",
            follow_up_date=datetime.utcnow() + timedelta(days=5),
            created_by_id=expert.id,
        )
        db.add(activity)

        won_opp = Opportunity(
            account_id=accounts[2].id,
            title="پروژه خط لوله گاز",
            project_type=ProjectType.EPC,
            sales_stage=SalesStage.CLOSED_WON,
            estimated_value=12_000_000_000,
            probability=100,
            lead_source=LeadSource.REFERRAL,
            assigned_to_id=expert.id,
        )
        lost_opp = Opportunity(
            account_id=accounts[1].id,
            title="تأمین قطعات فولاد",
            project_type=ProjectType.EQUIPMENT_SUPPLY,
            sales_stage=SalesStage.CLOSED_LOST,
            estimated_value=2_500_000_000,
            probability=0,
            lead_source=LeadSource.TENDER,
            assigned_to_id=expert.id,
        )
        db.add_all([won_opp, lost_opp])
        await db.flush()

        db.add_all([
            WinLossAnalysis(
                opportunity_id=won_opp.id,
                final_status=FinalStatus.WON,
                result_reason=ResultReason.RELATIONSHIPS,
                lessons_learned="همکاری نزدیک با تیم فنی مشتری و ارائه پشتیبانی پس از فروش کلید موفقیت بود.",
                final_contract_value=Decimal("11500000000"),
                analyzed_at=datetime.utcnow() - timedelta(days=44),
                analyzed_by_id=expert.id,
            ),
            WinLossAnalysis(
                opportunity_id=lost_opp.id,
                final_status=FinalStatus.LOST,
                result_reason=ResultReason.PRICE,
                lessons_learned="قیمت پیشنهادی بالاتر از رقبا بود. در مناقصات بعدی باید ساختار هزینه بازبینی شود.",
                analyzed_at=datetime.utcnow() - timedelta(days=19),
                analyzed_by_id=expert.id,
            ),
        ])

        await db.commit()
        print("Seed completed successfully.")
        print("  Manager: admin@padisaar.com / admin123")
        print("  Expert:  expert@padisaar.com / expert123")


if __name__ == "__main__":
    asyncio.run(seed())
