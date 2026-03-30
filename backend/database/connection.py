import os
import sys

from dotenv import load_dotenv

sys.path.insert(0, "/app")
load_dotenv()

from database.session import Base, SessionLocal, engine, get_db  # noqa: E402

DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or "sqlite:///./geomarket.db"
