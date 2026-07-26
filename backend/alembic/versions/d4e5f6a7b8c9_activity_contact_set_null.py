"""set activities.contact_id on delete to null

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("activities_contact_id_fkey", "activities", type_="foreignkey")
    op.create_foreign_key(
        "activities_contact_id_fkey",
        "activities",
        "contacts",
        ["contact_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("activities_contact_id_fkey", "activities", type_="foreignkey")
    op.create_foreign_key(
        "activities_contact_id_fkey",
        "activities",
        "contacts",
        ["contact_id"],
        ["id"],
    )
