import os
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker

DEFAULT_SQLITE_URL = "sqlite:///./geomarket.db"
DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or DEFAULT_SQLITE_URL

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
except SQLAlchemyError:
    # Fall back to local SQLite when DATABASE_URL is malformed.
    engine = create_engine(DEFAULT_SQLITE_URL, pool_pre_ping=True)
except Exception:
    engine = create_engine(DEFAULT_SQLITE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
