import os
import sys

# Ensure repository root and backend directory are in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database import engine, Base, SessionLocal
from backend.app.models.models import User, StudentProfile
from backend.app.utils.security import get_password_hash

def reset_and_seed():
    print("Dropping all existing database tables...")
    Base.metadata.drop_all(bind=engine)

    print("Recreating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding fresh Teacher and Student accounts...")
        
        # 1. Teacher account
        teacher = User(
            name="Teacher User",
            email="teacher@gradeai.com",
            password_hash=get_password_hash("teacher123"),
            role="teacher"
        )
        db.add(teacher)
        db.flush()

        # 2. Student account
        student = User(
            name="Student User",
            email="student@gradeai.com",
            password_hash=get_password_hash("student123"),
            role="student"
        )
        db.add(student)
        db.flush()

        # Student profile
        profile = StudentProfile(
            user_id=student.id,
            student_id_number="STU-001",
            major="Computer Science",
            year="Senior",
            bio="Standard student account for AI grading evaluation."
        )
        db.add(profile)

        db.commit()
        print("Database successfully reset and seeded!")
        print("Teacher: teacher@gradeai.com / teacher123")
        print("Student: student@gradeai.com / student123")

    except Exception as e:
        db.rollback()
        print(f"Error resetting database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed()
