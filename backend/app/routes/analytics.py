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
        total_students = db.query(User).filter(User.role == "student").count()

    answers_evaluated = evals_query.count()
    
    # 2. Average Score and Confidence
    avg_score_res = evals_query.with_entities(func.avg(Evaluation.final_score)).scalar()
    average_score = float(avg_score_res) * 100.0 if avg_score_res is not None else 0.0

    avg_conf_res = evals_query.with_entities(func.avg(Evaluation.confidence)).scalar()
    ai_confidence = float(avg_conf_res) if avg_conf_res is not None else 100.0

    # 3. Score Distribution Chart Data
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

    # 4. Exam wise Performance & Peer Comparisons
    exam_performance = []
    peer_comparisons = []
    exams_list = exams_query.all()
    
    for exam in exams_list:
        # Get mean score for this exam across all students
        all_subs = db.query(Submission).filter(
            Submission.exam_id == exam.id,
            Submission.status.in_(["graded", "reviewed", "submitted"])
        ).all()
        
        if not all_subs:
            continue
            
        sub_scores = []
        my_sub_score = None
        
        for sub in all_subs:
            # Calculate total score for submission
            tot = 0.0
            for ans in sub.answers:
                if ans.evaluation:
                    if ans.evaluation.teacher_review:
                        tot += ans.evaluation.teacher_review.teacher_score
                    else:
                        tot += ans.evaluation.marks or 0.0
            sub_scores.append(tot)
            if sub.student_id == current_user.id:
                my_sub_score = tot

        max_marks = exam.total_marks or sum(q.maximum_marks for q in exam.questions) or 10.0
        class_avg = sum(sub_scores) / len(sub_scores) if sub_scores else 0.0
        highest_score = max(sub_scores) if sub_scores else 0.0
        
        mean_pct = (class_avg / max_marks * 100.0) if max_marks > 0 else 0.0
        exam_performance.append({
            "title": exam.title,
            "score": round(mean_pct, 1)
        })

        # Calculate percentile for current user if student
        percentile = 100.0
        if my_sub_score is not None and len(sub_scores) > 1:
            lower_count = sum(1 for s in sub_scores if s <= my_sub_score)
            percentile = round((lower_count / len(sub_scores)) * 100.0, 1)
        elif my_sub_score is None:
            my_sub_score = class_avg

        peer_comparisons.append({
            "exam_id": exam.id,
            "exam_title": exam.title,
            "my_score": round(my_sub_score, 1),
            "class_average": round(class_avg, 1),
            "highest_score": round(highest_score, 1),
            "max_marks": round(max_marks, 1),
            "total_takers": len(sub_scores),
            "percentile": percentile
        })

    # 5. Peer Leaderboard / Score Comparison Table
    peer_leaderboard = []
    completed_submissions = db.query(Submission).filter(
        Submission.status.in_(["graded", "reviewed", "submitted"])
    ).order_by(Submission.submitted_at.desc()).limit(20).all()

    for sub in completed_submissions:
        total_score = 0.0
        for ans in sub.answers:
            if ans.evaluation:
                if ans.evaluation.teacher_review:
                    total_score += ans.evaluation.teacher_review.teacher_score
                else:
                    total_score += ans.evaluation.marks or 0.0
        
        max_marks = sub.exam.total_marks or sum(q.maximum_marks for q in sub.exam.questions) or 10.0
        pct = (total_score / max_marks * 100.0) if max_marks > 0 else 0.0
        
        peer_leaderboard.append({
            "id": sub.id,
            "student_name": sub.student.name if sub.student else "Anonymous Student",
            "exam_title": sub.exam.title if sub.exam else "Examination",
            "total_score": round(total_score, 1),
            "max_marks": round(max_marks, 1),
            "percentage": round(pct, 1),
            "status": sub.status,
            "is_me": sub.student_id == current_user.id
        })

    # 6. Manual override tracking
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
        "peer_comparisons": peer_comparisons,
        "peer_leaderboard": peer_leaderboard,
        "override_stats": [
            {"name": "AI Graded Only", "value": ai_only},
            {"name": "Manual Reviewed", "value": manual_overrides}
        ]
    }
