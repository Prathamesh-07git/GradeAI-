import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.models import User, Exam, Question, Submission, Evaluation, StudentAnswer

client = TestClient(app)

def test_full_register_login_exam_grading_workflow():
    # 1. Register new teacher
    teacher_email = "test_teacher_unique@gradeai.com"
    reg_response = client.post("/api/auth/register", json={
        "name": "Test Teacher",
        "email": teacher_email,
        "password": "password123",
        "role": "teacher"
    })
    assert reg_response.status_code in [200, 201, 400]
    
    # 2. Login teacher
    login_response = client.post("/api/auth/login", json={
        "email": teacher_email,
        "password": "password123"
    })
    assert login_response.status_code == 200
    teacher_token = login_response.json()["access_token"]
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # 3. Create exam as teacher
    exam_response = client.post("/api/exams", json={
        "title": "Computer Science Basics Exam",
        "description": "Test exam for AI grading pipeline",
        "subject": "Computer Science",
        "duration": 30,
        "instructions": "Answer all subjective questions thoroughly.",
        "total_marks": 10,
        "questions": [
            {
                "question_type": "subjective",
                "question_text": "Explain object-oriented programming concept of inheritance in detail.",
                "reference_answer": "Inheritance allows a child class to inherit properties and behaviors from a parent class. It promotes code reusability and represents an IS-A relationship.",
                "maximum_marks": 10.0,
                "keywords": [
                    {"keyword_text": "inheritance"},
                    {"keyword_text": "class"},
                    {"keyword_text": "reusability"},
                    {"keyword_text": "parent"},
                    {"keyword_text": "child"}
                ],
                "concepts": [
                    {"concept_text": "Child class inherits from parent class", "importance_weight": 1.0},
                    {"concept_text": "Code reusability", "importance_weight": 1.0},
                    {"concept_text": "IS-A relationship", "importance_weight": 0.8}
                ]
            }
        ]
    }, headers=teacher_headers)
    assert exam_response.status_code in [200, 201]
    exam_data = exam_response.json()
    exam_id = exam_data["id"]
    question_id = exam_data["questions"][0]["id"]

    # Publish the exam
    publish_response = client.post(f"/api/exams/{exam_id}/publish", headers=teacher_headers)
    assert publish_response.status_code == 200

    # 5. Register & Login student
    student_email = "test_student_unique@gradeai.com"
    client.post("/api/auth/register", json={
        "name": "Test Student",
        "email": student_email,
        "password": "password123",
        "role": "student"
    })
    s_login = client.post("/api/auth/login", json={
        "email": student_email,
        "password": "password123"
    })
    student_token = s_login.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 6. Start & Submit student answers
    start_sub = client.post(f"/api/submissions/start/{exam_id}", headers=student_headers)
    assert start_sub.status_code == 201
    submission_id = start_sub.json()["id"]

    submit_response = client.post(f"/api/submissions/{submission_id}/submit", json={
        "answers": [
            {
                "question_id": question_id,
                "answer_text": "Inheritance is an OOP mechanism where a child class acquires properties and methods of a parent class. It enables code reusability and supports an IS-A relationship."
            }
        ]
    }, headers=student_headers)
    assert submit_response.status_code == 200

    # 7. Run NLP Evaluation Pipeline directly
    student_id = start_sub.json()["student_id"]
    from backend.app.routes.submissions import evaluate_submission_background
    evaluate_submission_background(submission_id, student_id)

    # 8. Verify Evaluation record created in DB
    db = SessionLocal()
    eval_record = db.query(Evaluation).join(StudentAnswer).filter(StudentAnswer.submission_id == submission_id).first()
    assert eval_record is not None
    assert eval_record.marks > 0.0
    assert eval_record.final_score > 0.0
    assert eval_record.feedback is not None
    print(f"Test Successful! Evaluated Marks: {eval_record.marks}/10.0, Feedback: {eval_record.feedback}")
    db.close()

if __name__ == "__main__":
    test_full_register_login_exam_grading_workflow()
