from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# --- AUTH SCHEMAS ---

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(..., pattern="^(teacher|student)$")

class StudentProfileBase(BaseModel):
    student_id_number: Optional[str] = None
    major: Optional[str] = None
    year: Optional[str] = None
    bio: Optional[str] = None

class StudentProfileCreate(StudentProfileBase):
    pass

class StudentProfileOut(StudentProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime
    profile: Optional[StudentProfileOut] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None


# --- EXAM & QUESTION SCHEMAS ---

class QuestionConceptCreate(BaseModel):
    concept_text: str = Field(..., min_length=1)
    importance_weight: float = Field(1.0, ge=0.0)

class QuestionConceptOut(BaseModel):
    id: int
    question_id: int
    concept_text: str
    importance_weight: float

    class Config:
        from_attributes = True

class QuestionKeywordCreate(BaseModel):
    keyword_text: str = Field(..., min_length=1)

class QuestionKeywordOut(BaseModel):
    id: int
    question_id: int
    keyword_text: str

    class Config:
        from_attributes = True

class QuestionOptionCreate(BaseModel):
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False

class QuestionOptionOut(BaseModel):
    id: int
    question_id: int
    option_text: str
    is_correct: bool

    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    question_type: str = Field("subjective", pattern="^(subjective|mcq)$")
    question_text: str = Field(..., min_length=1)
    reference_answer: Optional[str] = None
    maximum_marks: float = Field(..., gt=0.0)
    concepts: List[QuestionConceptCreate] = []
    keywords: List[QuestionKeywordCreate] = []
    options: List[QuestionOptionCreate] = []

class QuestionOut(BaseModel):
    id: int
    exam_id: int
    question_type: str
    question_text: str
    reference_answer: Optional[str] = None
    maximum_marks: float
    concepts: List[QuestionConceptOut] = []
    keywords: List[QuestionKeywordOut] = []
    options: List[QuestionOptionOut] = []

    class Config:
        from_attributes = True

class ScoringConfigBase(BaseModel):
    semantic_weight: float = Field(0.35, ge=0.0, le=1.0)
    concept_weight: float = Field(0.30, ge=0.0, le=1.0)
    keyword_weight: float = Field(0.15, ge=0.0, le=1.0)
    tfidf_weight: float = Field(0.10, ge=0.0, le=1.0)
    relevance_weight: float = Field(0.10, ge=0.0, le=1.0)

class ScoringConfigOut(ScoringConfigBase):
    id: int
    exam_id: Optional[int] = None

    class Config:
        from_attributes = True

class ExamCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = None
    duration: Optional[int] = Field(None, gt=0)  # in minutes
    instructions: Optional[str] = None
    total_marks: int = Field(..., gt=0)
    questions: List[QuestionCreate] = []
    scoring_config: Optional[ScoringConfigBase] = None

class ExamOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    subject: Optional[str]
    duration: Optional[int]
    instructions: Optional[str]
    is_published: bool
    total_marks: int
    teacher_id: int
    created_at: datetime
    questions: List[QuestionOut] = []
    scoring_config: Optional[ScoringConfigOut] = None

    class Config:
        from_attributes = True


# --- SUBMISSION & ANSWER SCHEMAS ---

class AnswerSubmit(BaseModel):
    question_id: int
    answer_text: str

class ExamSubmissionCreate(BaseModel):
    answers: List[AnswerSubmit]

# --- EVALUATION SCHEMAS ---

class EvaluationConceptOut(BaseModel):
    id: int
    evaluation_id: int
    concept_id: int
    status: str
    confidence: float
    evidence_sentence: Optional[str] = None
    concept: Optional[QuestionConceptOut] = None

    class Config:
        from_attributes = True

class EvaluationKeywordOut(BaseModel):
    id: int
    evaluation_id: int
    keyword_id: int
    status: str
    keyword: Optional[QuestionKeywordOut] = None

    class Config:
        from_attributes = True

class TeacherReviewOut(BaseModel):
    id: int
    evaluation_id: int
    teacher_score: float
    teacher_feedback: Optional[str]
    reviewer_id: int
    reviewed_at: datetime

    class Config:
        from_attributes = True

class EvaluationOut(BaseModel):
    id: int
    answer_id: int
    keyword_score: Optional[float]
    tfidf_score: Optional[float]
    semantic_score: Optional[float]
    concept_score: Optional[float]
    relevance_score: Optional[float]
    final_score: Optional[float]
    marks: Optional[float]
    confidence: Optional[float]
    feedback: Optional[str]
    evaluated_at: datetime
    concepts: List[EvaluationConceptOut] = []
    keywords: List[EvaluationKeywordOut] = []
    teacher_review: Optional[TeacherReviewOut] = None

    class Config:
        from_attributes = True

class StudentAnswerOut(BaseModel):
    id: int
    submission_id: int
    question_id: int
    answer_text: str
    question: Optional[QuestionOut] = None
    evaluation: Optional[EvaluationOut] = None

    class Config:
        from_attributes = True

class SubmissionOut(BaseModel):
    id: int
    student_id: int
    exam_id: int
    status: str
    attempt_number: int = 1
    started_at: datetime
    submitted_at: Optional[datetime]
    student: Optional[UserOut] = None
    exam: Optional[ExamOut] = None
    answers: List[StudentAnswerOut] = []

    class Config:
        from_attributes = True


# --- AUDIT LOG & REVIEWS ---

class TeacherReviewSubmit(BaseModel):
    teacher_score: float = Field(..., ge=0.0)
    teacher_feedback: Optional[str] = None

class AuditLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    target_type: Optional[str]
    target_id: Optional[int]
    details: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class DashboardStatsOut(BaseModel):
    total_exams: int
    total_students: int
    answers_evaluated: int
    average_score: float
    ai_confidence: float
