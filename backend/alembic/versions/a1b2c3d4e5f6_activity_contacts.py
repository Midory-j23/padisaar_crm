"""activity contacts junction table

Revision ID: a1b2c3d4e5f6
Revises: 24bc4ea98b96
Create Date: 2026-06-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "24bc4ea98b96"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activity_contacts",
        sa.Column("activity_id", sa.String(), sa.ForeignKey("activities.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("contact_id", sa.String(), sa.ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True),
    )
    op.execute(
        """
        INSERT INTO activity_contacts (activity_id, contact_id)
        SELECT id, contact_id FROM activities WHERE contact_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_table("activity_contacts")
