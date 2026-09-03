from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models.models import (
    Exam,
    Question,
    QuestionConcept,
    QuestionKeyword,
    ScoringConfiguration,
    AuditLog,
    User,
)
from backend.app.schemas.schemas import ExamCreate, ExamOut, ExamOut
from backend.app.utils.security import get_current_user, require_teacher

router = APIRouter(prefix="/exams", tags=["Examinations"])

@router.post("", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
def create_exam(
    exam_data: ExamCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    # 1. Create the Exam
    new_exam = Exam(
        title=exam_data.title,
        description=exam_data.description,
        subject=exam_data.subject,
        duration=exam_data.duration,
        instructions=exam_data.instructions,
        total_marks=exam_data.total_marks,
        teacher_id=current_user.id,
        is_published=False  # default to unpublished draft
    )
    db.add(new_exam)
    db.flush()  # gets new_exam.id

    # 2. Create Scoring Config
    config_data = exam_data.scoring_config
    
    semantic_w = getattr(config_data, "semantic_weight", 0.35) if config_data else 0.35
    concept_w = getattr(config_data, "concept_weight", 0.30) if config_data else 0.30
    keyword_w = getattr(config_data, "keyword_weight", 0.15) if config_data else 0.15
    tfidf_w = getattr(config_data, "tfidf_weight", 0.10) if config_data else 0.10
    relevance_w = getattr(config_data, "relevance_weight", 0.10) if config_data else 0.10

    if semantic_w is None: semantic_w = 0.35
    if concept_w is None: concept_w = 0.30
    if keyword_w is None: keyword_w = 0.15
    if tfidf_w is None: tfidf_w = 0.10
    if relevance_w is None: relevance_w = 0.10

    scoring_config = ScoringConfiguration(
        exam_id=new_exam.id,
        semantic_weight=semantic_w,
        concept_weight=concept_w,
        keyword_weight=keyword_w,
        tfidf_weight=tfidf_w,
        relevance_weight=relevance_w,
    )
    # Validate sum equals 1.0
    weights_sum = (
        scoring_config.semantic_weight
        + scoring_config.concept_weight
        + scoring_config.keyword_weight
        + scoring_config.tfidf_weight
        + scoring_config.relevance_weight
    )
    if abs(weights_sum - 1.0) > 1e-4:
        # Normalize weights so they sum to 1.0 if not exactly 1.0
        scoring_config.semantic_weight /= weights_sum
        scoring_config.concept_weight /= weights_sum
        scoring_config.keyword_weight /= weights_sum
        scoring_config.tfidf_weight /= weights_sum
        scoring_config.relevance_weight /= weights_sum

    db.add(scoring_config)

    # 3. Create Questions, Concepts, and Keywords
    for q_data in exam_data.questions:
        new_question = Question(
            exam_id=new_exam.id,
            question_type=q_data.question_type,
            question_text=q_data.question_text,
            reference_answer=q_data.reference_answer,
            maximum_marks=q_data.maximum_marks,
        )
        db.add(new_question)
        db.flush()  # gets new_question.id

        # Add concepts
        for concept in q_data.concepts:
            new_concept = QuestionConcept(
                question_id=new_question.id,
                concept_text=concept.concept_text.strip().lower(),
                importance_weight=concept.importance_weight
            )
            db.add(new_concept)

        # Add keywords
        for kw in q_data.keywords:
            new_kw = QuestionKeyword(
                question_id=new_question.id,
                keyword_text=kw.keyword_text.strip().lower()
            )
            db.add(new_kw)

        # Add options (for MCQ)
        from backend.app.models.models import QuestionOption
        for opt in getattr(q_data, 'options', []):
            new_opt = QuestionOption(
                question_id=new_question.id,
                option_text=opt.option_text,
                is_correct=opt.is_correct
            )
            db.add(new_opt)

    db.commit()
    db.refresh(new_exam)

    # Log action
    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_EXAM",
        target_type="exam",
        target_id=new_exam.id,
        details=f"Exam '{new_exam.title}' created with {len(exam_data.questions)} questions"
    )
    db.add(audit)
    db.commit()

    return new_exam

@router.get("", response_model=List[ExamOut])
def list_exams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "teacher":
        # Teachers see their own exams
        return db.query(Exam).filter(Exam.teacher_id == current_user.id).order_by(Exam.created_at.desc()).all()
    else:
        # Students see only published exams
        return db.query(Exam).filter(Exam.is_published == True).order_by(Exam.created_at.desc()).all()

@router.get("/{id}", response_model=ExamOut)
def get_exam(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Examination not found"
        )
    
    # Students cannot see unpublished exams
    if current_user.role == "student" and not exam.is_published:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this examination"
        )
        
    return exam

@router.put("/{id}", response_model=ExamOut)
def update_exam(
    id: int,
    exam_data: ExamCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == id, Exam.teacher_id == current_user.id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found or you are not authorized"
        )
    
    # Update fields
    exam.title = exam_data.title
    exam.description = exam_data.description
    exam.subject = exam_data.subject
    exam.duration = exam_data.duration
    exam.instructions = exam_data.instructions
    exam.total_marks = exam_data.total_marks

    # For simplicity of updates, clear questions/configs and recreate them
    # Update scoring config
    db.query(ScoringConfiguration).filter(ScoringConfiguration.exam_id == id).delete()
    config_data = exam_data.scoring_config or ScoringConfiguration()
    scoring_config = ScoringConfiguration(
        exam_id=exam.id,
        semantic_weight=getattr(config_data, "semantic_weight", 0.35),
        concept_weight=getattr(config_data, "concept_weight", 0.30),
        keyword_weight=getattr(config_data, "keyword_weight", 0.15),
        tfidf_weight=getattr(config_data, "tfidf_weight", 0.10),
        relevance_weight=getattr(config_data, "relevance_weight", 0.10),
    )
    db.add(scoring_config)

    # Delete existing questions (using ORM so cascade delete works for concepts, keywords, and options)
    questions_to_delete = db.query(Question).filter(Question.exam_id == id).all()
    for q in questions_to_delete:
        db.delete(q)

    # Recreate questions
    for q_data in exam_data.questions:
        new_question = Question(
            exam_id=exam.id,
            question_type=q_data.question_type,
            question_text=q_data.question_text,
            reference_answer=q_data.reference_answer,
            maximum_marks=q_data.maximum_marks,
        )
        db.add(new_question)
        db.flush()

        for concept in q_data.concepts:
            new_concept = QuestionConcept(
                question_id=new_question.id,
                concept_text=concept.concept_text.strip().lower(),
                importance_weight=concept.importance_weight
            )
            db.add(new_concept)

        for kw in q_data.keywords:
            new_kw = QuestionKeyword(
                question_id=new_question.id,
                keyword_text=kw.keyword_text.strip().lower()
            )
            db.add(new_kw)

        from backend.app.models.models import QuestionOption
        for opt in getattr(q_data, 'options', []):
            new_opt = QuestionOption(
                question_id=new_question.id,
                option_text=opt.option_text,
                is_correct=opt.is_correct
            )
            db.add(new_opt)

    db.commit()
    db.refresh(exam)

    # Log action
    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_EXAM",
        target_type="exam",
        target_id=exam.id,
        details=f"Exam '{exam.title}' updated by teacher"
    )
    db.add(audit)
    db.commit()

    return exam

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == id, Exam.teacher_id == current_user.id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found or you are not authorized"
        )
    
    db.delete(exam)
    
    # Log action
    audit = AuditLog(
        user_id=current_user.id,
        action="DELETE_EXAM",
        target_type="exam",
        target_id=id,
        details=f"Exam with ID {id} deleted"
    )
    db.add(audit)
    db.commit()

    return None

@router.post("/{id}/publish", response_model=ExamOut)
def publish_exam(
    id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == id, Exam.teacher_id == current_user.id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found or you are not authorized"
        )
    
    exam.is_published = not exam.is_published
    db.commit()
    db.refresh(exam)

    # Log action
    audit = AuditLog(
        user_id=current_user.id,
        action="PUBLISH_EXAM",
        target_type="exam",
        target_id=exam.id,
        details=f"Exam '{exam.title}' publication status set to {exam.is_published}"
    )
    db.add(audit)
    db.commit()

    return exam
