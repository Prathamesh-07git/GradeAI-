from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import engine, Base
# Import models to ensure they are registered for create_all
from backend.app.models import models

# Auto-create SQLite database tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Auto-Grading NLP API",
    description="Advanced API for grading subjective answers",
    version="2.0.0"
)

from backend.app.config import settings

# Configure CORS - allow all origins for deployment compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Auto-Grading NLP API"}

from backend.app.routes import auth, exams, submissions, evaluations, analytics, profile
app.include_router(auth.router, prefix="/api")
app.include_router(exams.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(evaluations.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
