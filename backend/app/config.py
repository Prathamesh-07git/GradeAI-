import os

class Settings:
    SECRET_KEY: str = os.environ.get("SECRET_KEY") or "dev-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL") or "http://localhost:5173"
    CORS_ORIGINS: str = os.environ.get("CORS_ORIGINS") or "*"

    @property
    def cors_origins_list(self) -> list:
        origins = []
        if self.CORS_ORIGINS and self.CORS_ORIGINS != "*":
            origins.extend([o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()])
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL.strip())
        if not origins:
            return ["*"]
        return origins

    # Base directory of the repo (parent of backend/)
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    _db_dir: str = os.path.join(BASE_DIR, "database")
    
    # Ensure the database directory exists (critical for Render deployment)
    os.makedirs(_db_dir, exist_ok=True)
    
    DATABASE_URL: str = os.environ.get("DATABASE_URL") or f"sqlite:///{os.path.join(_db_dir, 'database.db')}"

    # NLP Config
    SENTENCE_TRANSFORMER_MODEL: str = os.environ.get("MODEL_NAME") or "all-MiniLM-L6-v2"

settings = Settings()

