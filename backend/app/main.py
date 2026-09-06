import sys
import os

# Ensure repository root is in sys.path for Render deployment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import engine, Base
# Import models to ensure they are registered for create_all
from backend.app.models import models

# Auto-create database tables if they do not exist
Base.metadata.create_all(bind=engine)

def auto_seed_default_users():
    from backend.app.database import SessionLocal
    from backend.app.models.models import User, StudentProfile
    from backend.app.utils.security import get_password_hash
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            teacher = User(
                name="Teacher User",
                email="teacher@gradeai.com",
                password_hash=get_password_hash("teacher123"),
                role="teacher"
            )
            student = User(
                name="Student User",
                email="student@gradeai.com",
                password_hash=get_password_hash("student123"),
                role="student"
            )
            db.add(teacher)
            db.add(student)
            db.flush()
            
            profile = StudentProfile(
                user_id=student.id,
                student_id_number="STU-001",
                major="Computer Science",
                year="Senior",
                bio="Standard student account for AI grading evaluation."
            )
            db.add(profile)
            db.commit()
    except Exception as e:
        print(f"Auto-seed exception: {e}")
        db.rollback()
    finally:
        db.close()

auto_seed_default_users()

app = FastAPI(
    title="Auto-Grading NLP API",
    description="Advanced API for grading subjective answers",
    version="2.0.0"
)

from backend.app.config import settings

# Configure CORS dynamically from environment settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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
