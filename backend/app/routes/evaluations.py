from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import (
    Evaluation,
    TeacherReview,
    Submission,
    AuditLog,
    User,
)
from backend.app.schemas.schemas import EvaluationOut, TeacherReviewSubmit, TeacherReviewOut
from backend.app.utils.security import get_current_user, require_teacher

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])

@router.get("/{id}", response_model=EvaluationOut)
def get_evaluation(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    evaluation = db.query(Evaluation).filter(Evaluation.id == id).first()
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation report not found"
        )
        
    # Check roles permissions
    # If student: must own the answer
    if current_user.role == "student":
        if evaluation.answer.submission.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this report"
            )
    else:
        # If teacher: must own the exam
        if evaluation.answer.submission.exam.teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this report"
            )
            
    return evaluation

@router.post("/{id}/review", response_model=TeacherReviewOut)
def submit_teacher_review(
    id: int,
    review_data: TeacherReviewSubmit,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    evaluation = db.query(Evaluation).filter(Evaluation.id == id).first()
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation record not found"
        )
        
    # Check if teacher owns the exam
    if evaluation.answer.submission.exam.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to grade this examination"
        )

    # Check if maximum marks constraint is respected
    max_marks = evaluation.answer.question.maximum_marks
    if review_data.teacher_score > max_marks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Teacher score ({review_data.teacher_score}) cannot exceed question max marks ({max_marks})"
        )

    # Delete existing review if any
    db.query(TeacherReview).filter(TeacherReview.evaluation_id == id).delete()

    # Create new review
    new_review = TeacherReview(
        evaluation_id=id,
        teacher_score=review_data.teacher_score,
        teacher_feedback=review_data.teacher_feedback,
        reviewer_id=current_user.id
    )
    db.add(new_review)
    db.flush()

    # Update submission status to 'reviewed'
    submission = evaluation.answer.submission
    submission.status = "reviewed"

    db.commit()
    db.refresh(new_review)

    # Log action in audit logs
    audit = AuditLog(
        user_id=current_user.id,
        action="MANUAL_OVERRIDE",
        target_type="evaluation",
        target_id=id,
        details=f"Teacher overrode AI score ({evaluation.marks}) with manual score ({review_data.teacher_score}) for answer ID {evaluation.answer_id}"
    )
    db.add(audit)
    db.commit()

    return new_review

from pydantic import BaseModel
from typing import List

class DemoRequest(BaseModel):
    student_answer: str
    reference_answer: str
    keywords: List[str]
    concepts: List[str]

@router.post("/demo")
def run_demo_grading(data: DemoRequest):
    from backend.app.nlp.evaluator import evaluate_student_answer
    
    # Format expected concepts into required structure
    formatted_concepts = [
        {"id": i, "concept_text": concept, "importance_weight": 1.0}
        for i, concept in enumerate(data.concepts)
    ]
    
    result = evaluate_student_answer(
        student_answer=data.student_answer,
        question_text="Demo Question prompt",
        reference_answer=data.reference_answer,
        expected_keywords=data.keywords,
        expected_concepts=formatted_concepts,
        max_marks=10.0
    )
    return result
