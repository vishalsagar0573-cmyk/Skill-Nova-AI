"""add_internship_dates

Revision ID: e7c2d3a1f4b8
Revises: cd64460ae322
Create Date: 2026-11-02 18:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e7c2d3a1f4b8'
down_revision: Union[str, Sequence[str], None] = 'cd64460ae322'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add nullable columns to existing student_internships table
    op.add_column('student_internships', sa.Column('start_date', sa.String(), nullable=True))
    op.add_column('student_internships', sa.Column('end_date', sa.String(), nullable=True))

def downgrade() -> None:
    op.drop_column('student_internships', 'end_date')
    op.drop_column('student_internships', 'start_date')
