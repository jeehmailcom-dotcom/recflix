"""add_trailer_key_to_movies

Revision ID: a1b2c3d4e5f6
Revises: e747579d8a62
Create Date: 2026-03-04 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e747579d8a62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('movies', sa.Column('trailer_key', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('movies', 'trailer_key')
