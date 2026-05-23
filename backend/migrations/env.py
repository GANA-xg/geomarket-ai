from logging.config import fileConfig
import os
from dotenv import load_dotenv

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Load environment variables from backend/.env so DATABASE_URL is available
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Interpret the config file for Python logging.
fileConfig(config.config_file_name)

# Import the SQLAlchemy models' metadata here
try:
    from database.session import Base, engine  # noqa: E402
    target_metadata = Base.metadata
except Exception:
    target_metadata = None


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
