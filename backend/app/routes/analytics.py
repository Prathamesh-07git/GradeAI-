from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from backend.app.database import get_db
from backend.app.models.models import (
    Exam,
    Submission,
    StudentAnswer,
    Evaluation,
    TeacherReview,
    User,
)
from backend.app.utils.security import get_current_user, require_teacher

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Base counts queries
    if current_user.role == "teacher":
        exams_query = db.query(Exam).filter(Exam.teacher_id == current_user.id)
        submissions_query = db.query(Submission).join(Exam).filter(Exam.teacher_id == current_user.id)
        evals_query = db.query(Evaluation).join(StudentAnswer).join(Submission).join(Exam).filter(Exam.teacher_id == current_user.id)
    else:
        # Students see their own analytics
        exams_query = db.query(Exam).filter(Exam.is_published == True)
        submissions_query = db.query(Submission).filter(Submission.student_id == current_user.id)
        evals_query = db.query(Evaluation).join(StudentAnswer).join(Submission).filter(Submission.student_id == current_user.id)

    total_exams = exams_query.count()
    
    # Total students count
    if current_user.role == "teacher":
        total_students = db.query(User).filter(User.role == "student").count()
    else:
        total_students = 1

    answers_evaluated = evals_query.count()
    
    # 2. Average Score and Confidence
    avg_score_res = evals_query.with_entities(func.avg(Evaluation.final_score)).scalar()
    average_score = float(avg_score_res) * 100.0 if avg_score_res is not None else 0.0

    avg_conf_res = evals_query.with_entities(func.avg(Evaluation.confidence)).scalar()
    ai_confidence = float(avg_conf_res) if avg_conf_res is not None else 100.0

    # 3. Score Distribution Chart Data
    # Buckets: 0-20%, 21-40%, 41-60%, 61-80%, 81-100%
    score_ranges = [
        {"name": "0-20%", "min": 0.0, "max": 0.20, "count": 0},
        {"name": "21-40%", "min": 0.20, "max": 0.40, "count": 0},
        {"name": "41-60%", "min": 0.40, "max": 0.60, "count": 0},
        {"name": "61-80%", "min": 0.60, "max": 0.80, "count": 0},
        {"name": "81-100%", "min": 0.80, "max": 1.01, "count": 0},
    ]
    
    evaluations_records = evals_query.all()
    for rec in evaluations_records:
        fs = rec.final_score or 0.0
        for bucket in score_ranges:
            if bucket["min"] <= fs < bucket["max"]:
                bucket["count"] += 1
                break

    # 4. Exam wise Performance Chart Data
    exam_performance = []
    exams_list = exams_query.all()
    for exam in exams_list:
        # Get mean score for this exam
        mean_score = db.query(func.avg(Evaluation.final_score))\
            .join(StudentAnswer)\
            .join(Submission)\
            .filter(Submission.exam_id == exam.id).scalar()
            
        if mean_score is not None:
            exam_performance.append({
                "title": exam.title,
                "score": round(float(mean_score) * 100.0, 1)
            })

    # 5. Manual override tracking
    reviews_count = db.query(TeacherReview).join(Evaluation)
    if current_user.role == "teacher":
        reviews_count = reviews_count.join(StudentAnswer).join(Submission).join(Exam).filter(Exam.teacher_id == current_user.id)
    else:
        reviews_count = reviews_count.join(StudentAnswer).join(Submission).filter(Submission.student_id == current_user.id)
        
    manual_overrides = reviews_count.count()
    ai_only = max(0, answers_evaluated - manual_overrides)

    return {
        "stats": {
            "total_exams": total_exams,
            "total_students": total_students,
            "answers_evaluated": answers_evaluated,
            "average_score": round(average_score, 1),
            "ai_confidence": round(ai_confidence, 1)
        },
        "score_distribution": [
            {"name": item["name"], "count": item["count"]} for item in score_ranges
        ],
        "exam_performance": exam_performance,
        "override_stats": [
            {"name": "AI Graded Only", "value": ai_only},
            {"name": "Manual Reviewed", "value": manual_overrides}
        ]
    }
