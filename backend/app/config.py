import os

class Settings:
    SECRET_KEY: str = os.environ.get("SECRET_KEY") or "dev-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Base directory of the repo (parent of backend/)
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    DATABASE_URL: str = os.environ.get("DATABASE_URL") or f"sqlite:///{os.path.join(BASE_DIR, 'database', 'database.db')}"

    # NLP Config
    SENTENCE_TRANSFORMER_MODEL: str = os.environ.get("MODEL_NAME") or "all-MiniLM-L6-v2"

settings = Settings()
