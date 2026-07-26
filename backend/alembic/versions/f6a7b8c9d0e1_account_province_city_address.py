"""replace account location with province city address

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("province", sa.String(), nullable=True))
    op.add_column("accounts", sa.Column("city", sa.String(), nullable=True))
    op.add_column("accounts", sa.Column("address", sa.String(), nullable=True))
    # Migrate old free-text location into address
    op.execute("UPDATE accounts SET address = location WHERE location IS NOT NULL AND location <> ''")
    op.drop_column("accounts", "location")


def downgrade() -> None:
    op.add_column("accounts", sa.Column("location", sa.String(), nullable=True))
    op.execute(
        """
        UPDATE accounts SET location = COALESCE(
            NULLIF(TRIM(CONCAT_WS('، ', province, city, address)), ''),
            address
        )
        """
    )
    op.drop_column("accounts", "address")
    op.drop_column("accounts", "city")
    op.drop_column("accounts", "province")
