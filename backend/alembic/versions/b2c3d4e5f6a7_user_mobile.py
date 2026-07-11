"""add user mobile for phone login

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("mobile", sa.String(), nullable=True))
    op.create_index("ix_users_mobile", "users", ["mobile"], unique=True)
    op.execute(
        "UPDATE users SET mobile = '09120000001' WHERE email = 'admin@padisaar.com' AND mobile IS NULL"
    )
    op.execute(
        "UPDATE users SET mobile = '09120000002' WHERE email = 'expert@padisaar.com' AND mobile IS NULL"
    )


def downgrade() -> None:
    op.drop_index("ix_users_mobile", table_name="users")
    op.drop_column("users", "mobile")
