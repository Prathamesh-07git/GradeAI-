from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models.models import (
    Submission,
    StudentAnswer,
    Exam,
    Question,
    AuditLog,
    User,
)
from backend.app.schemas.schemas import ExamSubmissionCreate, SubmissionOut
from backend.app.utils.security import get_current_user, require_student

router = APIRouter(prefix="/submissions", tags=["Submissions"])

@router.post("/start/{exam_id}", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
def start_exam(
    exam_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    # Check if exam exists and is published
    exam = db.query(Exam).filter(Exam.id == exam_id, Exam.is_published == True).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active examination not found"
        )
    
    # Check if student already started/submitted this exam
    active_submission = db.query(Submission).filter(
        Submission.student_id == current_user.id,
        Submission.exam_id == exam_id,
        Submission.status == "started"
    ).first()
    
    if active_submission:
        return active_submission
        
    # Get total attempt count to set the attempt number
    attempt_count = db.query(Submission).filter(
        Submission.student_id == current_user.id,
        Submission.exam_id == exam_id
    ).count()
        
    new_submission = Submission(
        student_id=current_user.id,
        exam_id=exam_id,
        status="started",
        attempt_number=attempt_count + 1
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    # Log action
    audit = AuditLog(
        user_id=current_user.id,
        action="START_EXAM",
        target_type="submission",
        target_id=new_submission.id,
        details=f"Student started exam '{exam.title}'"
    )
    db.add(audit)
    db.commit()

    return new_submission

@router.post("/{id}/autosave", status_code=status.HTTP_200_OK)
def autosave_answers(
    id: int,
    submission_data: ExamSubmissionCreate,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(
        Submission.id == id,
        Submission.student_id == current_user.id,
        Submission.status == "started"
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active exam submission attempt not found"
        )
    
    # Update/insert answers
    for ans_data in submission_data.answers:
        # Verify question belongs to the exam
        question = db.query(Question).filter(
            Question.id == ans_data.question_id,
            Question.exam_id == submission.exam_id
        ).first()
        
        if not question:
            continue
            
        existing_answer = db.query(StudentAnswer).filter(
            StudentAnswer.submission_id == id,
            StudentAnswer.question_id == ans_data.question_id
        ).first()
        
        if existing_answer:
            existing_answer.answer_text = ans_data.answer_text
        else:
            new_answer = StudentAnswer(
                submission_id=id,
                question_id=ans_data.question_id,
                answer_text=ans_data.answer_text
            )
            db.add(new_answer)
            
    db.commit()
    return {"message": "Autosave successful"}

def evaluate_submission_background(submission_id: int, current_user_id: int):
    from backend.app.database import SessionLocal
    from backend.app.nlp.evaluator import evaluate_student_answer
    from backend.app.models.models import Evaluation, EvaluationConcept, EvaluationKeyword, ScoringConfiguration, AuditLog
    import datetime
    
    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            return
            
        scoring_config = db.query(ScoringConfiguration).filter(ScoringConfiguration.exam_id == submission.exam_id).first()
        student_answers = db.query(StudentAnswer).filter(StudentAnswer.submission_id == submission.id).all()
        
        for ans in student_answers:
            question = ans.question
            
            if question.question_type == 'mcq':
                correct_option = next((opt for opt in question.options if opt.is_correct), None)
                is_match = False
                if correct_option and ans.answer_text.strip() == correct_option.option_text.strip():
                    is_match = True
                
                final_score = 1.0 if is_match else 0.0
                marks = question.maximum_marks if is_match else 0.0
                feedback = "Correct answer!" if is_match else "Incorrect answer."

                new_eval = Evaluation(
                    answer_id=ans.id,
                    keyword_score=final_score,
                    tfidf_score=final_score,
                    semantic_score=final_score,
                    concept_score=final_score,
                    relevance_score=final_score,
                    final_score=final_score,
                    marks=marks,
                    confidence=100.0,
                    feedback=feedback
                )
                db.add(new_eval)
                db.flush()
                continue
                
            # Prepare list of keyword string values
            expected_kws = [k.keyword_text for k in question.keywords]
            
            # Prepare list of concept definition dictionaries
            expected_concepts = [
                {"id": c.id, "concept_text": c.concept_text, "importance_weight": c.importance_weight}
                for c in question.concepts
            ]
            
            # Run grading orchestrator
            eval_res = evaluate_student_answer(
                student_answer=ans.answer_text,
                question_text=question.question_text,
                reference_answer=question.reference_answer or "",
                expected_keywords=expected_kws,
                expected_concepts=expected_concepts,
                max_marks=question.maximum_marks,
                config=scoring_config
            )
            
            # Delete any existing evaluation to prevent duplicates on re-submission
            db.query(Evaluation).filter(Evaluation.answer_id == ans.id).delete()
            db.flush()

            # Write primary Evaluation entry
            new_eval = Evaluation(
                answer_id=ans.id,
                keyword_score=eval_res["keyword_score"],
                tfidf_score=eval_res["tfidf_score"],
                semantic_score=eval_res["semantic_score"],
                concept_score=eval_res["concept_score"],
                relevance_score=eval_res["relevance_score"],
                final_score=eval_res["final_score"],
                marks=eval_res["marks"],
                confidence=eval_res["confidence"],
                feedback=eval_res["feedback"]
            )
            db.add(new_eval)
            db.flush()  # fetches new_eval.id
            
            # Write concept coverage details
            for c_match in eval_res["concepts"]:
                new_eval_concept = EvaluationConcept(
                    evaluation_id=new_eval.id,
                    concept_id=c_match["concept_id"],
                    status=c_match["status"],
                    confidence=c_match["confidence"],
                    evidence_sentence=c_match["evidence_sentence"]
                )
                db.add(new_eval_concept)
                
            # Write keyword details
            for kw_match in eval_res["keywords"]:
                kw_entity = next((k for k in question.keywords if k.keyword_text == kw_match["keyword"]), None)
                if kw_entity:
                    new_eval_kw = EvaluationKeyword(
                        evaluation_id=new_eval.id,
                        keyword_id=kw_entity.id,
                        status="present" if kw_match["match_type"] != "semantic" else "partial"
                    )
                    db.add(new_eval_kw)
                    
        # Mark submission as graded once NLP pipeline completes
        submission.status = "graded"
        db.commit()

        # Log submit and grading action
        audit = AuditLog(
            user_id=current_user_id,
            action="SUBMIT_EXAM",
            target_type="submission",
            target_id=submission.id,
            details=f"Student submitted and AI graded exam '{submission.exam.title}'"
        )
        db.add(audit)
        db.commit()
    finally:
        db.close()

@router.post("/{id}/submit", response_model=SubmissionOut)
def submit_exam(
    id: int,
    submission_data: ExamSubmissionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(
        Submission.id == id,
        Submission.student_id == current_user.id,
        Submission.status == "started"
    ).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active exam submission attempt not found"
        )
        
    import datetime
    
    # First, save the latest answers
    for ans_data in submission_data.answers:
        existing_answer = db.query(StudentAnswer).filter(
            StudentAnswer.submission_id == id,
            StudentAnswer.question_id == ans_data.question_id
        ).first()
        
        if existing_answer:
            existing_answer.answer_text = ans_data.answer_text
        else:
            new_answer = StudentAnswer(
                submission_id=id,
                question_id=ans_data.question_id,
                answer_text=ans_data.answer_text
            )
            db.add(new_answer)
            
    db.flush()
    
    # Complete submission metadata
    submission.status = "submitted"
    submission.submitted_at = datetime.datetime.utcnow()
    db.commit()
    
    # Run NLP Evaluation Pipeline asynchronously so the frontend doesn't block (prevents autosave 404 errors during long loads)
    background_tasks.add_task(evaluate_submission_background, submission.id, current_user.id)
    
    db.refresh(submission)
    return submission

@router.get("", response_model=List[SubmissionOut])
def list_submissions(
    examId: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Submission)
    if current_user.role == "student":
        # Students see only their own submissions
        query = query.filter(Submission.student_id == current_user.id)
    else:
        # Teachers see submissions for their exams
        query = query.join(Exam).filter(Exam.teacher_id == current_user.id)
        
    if examId is not None:
        query = query.filter(Submission.exam_id == examId)
        
    submissions = query.order_by(Submission.started_at.desc()).all()

    # Auto-grade fallback for any submission that is 'submitted' but missing evaluation
    for sub in submissions:
        if sub.status == "submitted":
            try:
                evaluate_submission_background(sub.id, sub.student_id)
            except Exception:
                pass
    
    db.expire_all()
    return query.order_by(Submission.started_at.desc()).all()

@router.get("/{id}", response_model=SubmissionOut)
def get_submission(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = db.query(Submission).filter(Submission.id == id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
        
    # Check authorization
    if current_user.role == "student" and submission.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this submission"
        )
    elif current_user.role == "teacher" and submission.exam.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this examination"
        )

    # Auto-grade fallback if submitted but missing evaluation records
    if submission.status == "submitted" or any(ans.evaluation is None for ans in submission.answers):
        try:
            evaluate_submission_background(submission.id, submission.student_id)
            db.expire_all()
            submission = db.query(Submission).filter(Submission.id == id).first()
        except Exception:
            pass
        
    return submission
