from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
import datetime
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'teacher' or 'student'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    exams = relationship("Exam", back_populates="teacher", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    reviews = relationship("TeacherReview", back_populates="reviewer", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    profile = relationship("StudentProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    student_id_number = Column(String, nullable=True)
    major = Column(String, nullable=True)
    year = Column(String, nullable=True)
    bio = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="profile")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)  # in minutes
    instructions = Column(Text, nullable=True)
    is_published = Column(Boolean, default=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_marks = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    teacher = relationship("User", back_populates="exams")
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="exam", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    question_type = Column(String, default="subjective")  # 'subjective' or 'mcq'
    question_text = Column(Text, nullable=False)
    reference_answer = Column(Text, nullable=True)
    maximum_marks = Column(Float, nullable=False)

    # Relationships
    exam = relationship("Exam", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")
    concepts = relationship("QuestionConcept", back_populates="question", cascade="all, delete-orphan")
    keywords = relationship("QuestionKeyword", back_populates="question", cascade="all, delete-orphan")
    answers = relationship("StudentAnswer", back_populates="question", cascade="all, delete-orphan")


class QuestionOption(Base):
    __tablename__ = "question_options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    option_text = Column(String, nullable=False)
    is_correct = Column(Boolean, default=False)

    # Relationships
    question = relationship("Question", back_populates="options")


class QuestionConcept(Base):
    __tablename__ = "question_concepts"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    concept_text = Column(String, nullable=False)
    importance_weight = Column(Float, default=1.0)  # Weight relative to other concepts

    # Relationships
    question = relationship("Question", back_populates="concepts")
    evaluation_concepts = relationship("EvaluationConcept", back_populates="concept", cascade="all, delete-orphan")


class QuestionKeyword(Base):
    __tablename__ = "question_keywords"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    keyword_text = Column(String, nullable=False)

    # Relationships
    question = relationship("Question", back_populates="keywords")
    evaluation_keywords = relationship("EvaluationKeyword", back_populates="keyword", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False)
    status = Column(String, default="started")  # 'started', 'submitted', 'graded', 'reviewed'
    attempt_number = Column(Integer, default=1)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)

    # Relationships
    student = relationship("User", back_populates="submissions")
    exam = relationship("Exam", back_populates="submissions")
    answers = relationship("StudentAnswer", back_populates="submission", cascade="all, delete-orphan")


class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    answer_text = Column(Text, nullable=False)

    # Relationships
    submission = relationship("Submission", back_populates="answers")
    question = relationship("Question", back_populates="answers")
    evaluation = relationship("Evaluation", uselist=False, back_populates="answer", cascade="all, delete-orphan")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("student_answers.id"), nullable=False)
    keyword_score = Column(Float, nullable=True)
    tfidf_score = Column(Float, nullable=True)
    semantic_score = Column(Float, nullable=True)
    concept_score = Column(Float, nullable=True)
    relevance_score = Column(Float, nullable=True)
    final_score = Column(Float, nullable=True)  # Normalized 0.0 - 1.0
    marks = Column(Float, nullable=True)  # final_score * maximum_marks
    confidence = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    evaluated_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    answer = relationship("StudentAnswer", back_populates="evaluation")
    concepts = relationship("EvaluationConcept", back_populates="evaluation", cascade="all, delete-orphan")
    keywords = relationship("EvaluationKeyword", back_populates="evaluation", cascade="all, delete-orphan")
    teacher_review = relationship("TeacherReview", uselist=False, back_populates="evaluation", cascade="all, delete-orphan")


class EvaluationConcept(Base):
    __tablename__ = "evaluation_concepts"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("question_concepts.id"), nullable=False)
    status = Column(String, default="missing")  # 'present', 'partially_present', 'missing', 'incorrect'
    confidence = Column(Float, default=1.0)
    evidence_sentence = Column(Text, nullable=True)

    # Relationships
    evaluation = relationship("Evaluation", back_populates="concepts")
    concept = relationship("QuestionConcept", back_populates="evaluation_concepts")


class EvaluationKeyword(Base):
    __tablename__ = "evaluation_keywords"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=False)
    keyword_id = Column(Integer, ForeignKey("question_keywords.id"), nullable=False)
    status = Column(String, default="missing")  # 'present', 'missing', 'partial'

    # Relationships
    evaluation = relationship("Evaluation", back_populates="keywords")
    keyword = relationship("QuestionKeyword", back_populates="evaluation_keywords")


class TeacherReview(Base):
    __tablename__ = "teacher_reviews"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=False)
    teacher_score = Column(Float, nullable=False)
    teacher_feedback = Column(Text, nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewed_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    evaluation = relationship("Evaluation", back_populates="teacher_review")
    reviewer = relationship("User", back_populates="reviews")


class ScoringConfiguration(Base):
    __tablename__ = "scoring_configurations"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=True)  # Null if global default
    semantic_weight = Column(Float, default=0.35)
    concept_weight = Column(Float, default=0.30)
    keyword_weight = Column(Float, default=0.15)
    tfidf_weight = Column(Float, default=0.10)
    relevance_weight = Column(Float, default=0.10)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)  # 'CREATE_EXAM', 'SUBMIT_ANSWERS', 'TEACHER_REVIEW', etc.
    target_type = Column(String, nullable=True)  # 'exam', 'submission', 'evaluation'
    target_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
