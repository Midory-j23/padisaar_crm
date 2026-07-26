"""cascade account and opportunity deletes

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-13

"""
from typing import Sequence, Union

from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("contacts_account_id_fkey", "contacts", type_="foreignkey")
    op.create_foreign_key(
        "contacts_account_id_fkey",
        "contacts",
        "accounts",
        ["account_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("opportunities_account_id_fkey", "opportunities", type_="foreignkey")
    op.create_foreign_key(
        "opportunities_account_id_fkey",
        "opportunities",
        "accounts",
        ["account_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("activities_account_id_fkey", "activities", type_="foreignkey")
    op.create_foreign_key(
        "activities_account_id_fkey",
        "activities",
        "accounts",
        ["account_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("activities_opportunity_id_fkey", "activities", type_="foreignkey")
    op.create_foreign_key(
        "activities_opportunity_id_fkey",
        "activities",
        "opportunities",
        ["opportunity_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.drop_constraint(
        "opportunity_stage_history_opportunity_id_fkey",
        "opportunity_stage_history",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "opportunity_stage_history_opportunity_id_fkey",
        "opportunity_stage_history",
        "opportunities",
        ["opportunity_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("win_loss_analysis_opportunity_id_fkey", "win_loss_analysis", type_="foreignkey")
    op.create_foreign_key(
        "win_loss_analysis_opportunity_id_fkey",
        "win_loss_analysis",
        "opportunities",
        ["opportunity_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("win_loss_analysis_opportunity_id_fkey", "win_loss_analysis", type_="foreignkey")
    op.create_foreign_key(
        "win_loss_analysis_opportunity_id_fkey",
        "win_loss_analysis",
        "opportunities",
        ["opportunity_id"],
        ["id"],
    )

    op.drop_constraint(
        "opportunity_stage_history_opportunity_id_fkey",
        "opportunity_stage_history",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "opportunity_stage_history_opportunity_id_fkey",
        "opportunity_stage_history",
        "opportunities",
        ["opportunity_id"],
        ["id"],
    )

    op.drop_constraint("activities_opportunity_id_fkey", "activities", type_="foreignkey")
    op.create_foreign_key(
        "activities_opportunity_id_fkey",
        "activities",
        "opportunities",
        ["opportunity_id"],
        ["id"],
    )

    op.drop_constraint("activities_account_id_fkey", "activities", type_="foreignkey")
    op.create_foreign_key(
        "activities_account_id_fkey",
        "activities",
        "accounts",
        ["account_id"],
        ["id"],
    )

    op.drop_constraint("opportunities_account_id_fkey", "opportunities", type_="foreignkey")
    op.create_foreign_key(
        "opportunities_account_id_fkey",
        "opportunities",
        "accounts",
        ["account_id"],
        ["id"],
    )

    op.drop_constraint("contacts_account_id_fkey", "contacts", type_="foreignkey")
    op.create_foreign_key(
        "contacts_account_id_fkey",
        "contacts",
        "accounts",
        ["account_id"],
        ["id"],
    )
