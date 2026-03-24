import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "GeoMarket AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # DB
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://admin:password@localhost:5432/geomarket")
    
    # Third party
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")
    
    class Config:
        env_file = ".env"

settings = Settings()
