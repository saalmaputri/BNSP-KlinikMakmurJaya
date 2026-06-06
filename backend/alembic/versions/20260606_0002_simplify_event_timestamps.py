"""simplify event timestamps

Revision ID: 20260606_0002
Revises: 20260605_0001
Create Date: 2026-06-06
"""

from alembic import op
import sqlalchemy as sa


revision = "20260606_0002"
down_revision = "20260605_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("stock_movements", "updated_at")
    op.drop_column("prescription_verifications", "updated_at")
    op.drop_column("audit_logs", "updated_at")
    op.drop_column("error_logs", "updated_at")
    op.drop_column("notifications", "deleted_at")


def downgrade() -> None:
    op.add_column("notifications", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("error_logs", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))
    op.add_column("audit_logs", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))
    op.add_column("prescription_verifications", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))
    op.add_column("stock_movements", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))
