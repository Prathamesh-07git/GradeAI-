import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base, get_db
from backend.app.models.models import (
    User, Exam, Question, QuestionConcept, QuestionKeyword,
    Submission, StudentAnswer, Evaluation, EvaluationConcept,
    EvaluationKeyword, TeacherReview, ScoringConfiguration, AuditLog
)
from backend.app.main import app
import json

# Setup temporary SQLite database file for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def client():
    # Instantiate tables on the file database
    Base.metadata.create_all(bind=engine)
    
    # Dependency override
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
            
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as c:
        yield c
        
    Base.metadata.drop_all(bind=engine)
    
    # Remove temporary database file
    import os
    try:
        if os.path.exists("test_temp.db"):
            os.remove("test_temp.db")
    except Exception:
        pass

def test_api_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Auto-Grading NLP API"}

def test_user_registration_and_login(client):
    # 1. Register a teacher
    teacher_payload = {
        "name": "Teacher Jane",
        "email": "teacher@university.edu",
        "password": "securepassword123",
        "role": "teacher"
    }
    resp = client.post("/api/auth/register", json=teacher_payload)
    assert resp.status_code == 201
    assert resp.json()["email"] == "teacher@university.edu"
    assert resp.json()["role"] == "teacher"

    # 2. Login to get access token
    login_payload = {
        "email": "teacher@university.edu",
        "password": "securepassword123"
    }
    resp = client.post("/api/auth/login", json=login_payload)
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["token_type"] == "bearer"

def test_create_exam_authorization(client):
    # 1. Register student
    student_payload = {
        "name": "Student Bob",
        "email": "student@university.edu",
        "password": "studentpassword123",
        "role": "student"
    }
    client.post("/api/auth/register", json=student_payload)

    # 2. Login as student
    student_login = {
        "email": "student@university.edu",
        "password": "studentpassword123"
    }
    token_resp = client.post("/api/auth/login", json=student_login)
    student_token = token_resp.json()["access_token"]

    # 3. Login as teacher
    teacher_login = {
        "email": "teacher@university.edu",
        "password": "securepassword123"
    }
    token_resp_t = client.post("/api/auth/login", json=teacher_login)
    teacher_token = token_resp_t.json()["access_token"]

    # 4. Attempt to create exam as Student (Should fail with 403 Forbidden)
    exam_payload = {
        "title": "Computer Networks Quiz",
        "description": "Short quiz on OSI model layers",
        "subject": "CS",
        "duration": 30,
        "instructions": "No notes allowed",
        "total_marks": 20,
        "questions": [
            {
                "question_text": "Describe the transport layer functions.",
                "reference_answer": "Reliable message delivery, flow control, congestion control, TCP and UDP.",
                "maximum_marks": 20,
                "concepts": [{"concept_text": "flow control", "importance_weight": 1.0}],
                "keywords": [{"keyword_text": "tcp"}]
            }
        ]
    }
    
    headers_student = {"Authorization": f"Bearer {student_token}"}
    resp = client.post("/api/exams", json=exam_payload, headers=headers_student)
    assert resp.status_code == 403  # Forbidden

    # 5. Create exam as Teacher (Should succeed with 201 Created)
    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}
    resp = client.post("/api/exams", json=exam_payload, headers=headers_teacher)
    assert resp.status_code == 201
    assert resp.json()["title"] == "Computer Networks Quiz"
