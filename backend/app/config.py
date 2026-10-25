from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"
    SECRET_KEY: str
    ADMIN_INITIAL_PASSWORD: str
    JWT_EXPIRE_MIN: int = 60
    class Config:
        env_file = ".env"
settings = Settings()
