"""make contact mobile nullable

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-07-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "g7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("contacts", "mobile", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE contacts SET mobile = '' WHERE mobile IS NULL")
    op.alter_column("contacts", "mobile", existing_type=sa.String(), nullable=False)
