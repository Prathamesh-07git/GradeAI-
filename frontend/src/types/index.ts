export interface StudentProfile {
  id?: number;
  user_id?: number;
  student_id_number?: string;
  major?: string;
  year?: string;
  bio?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "teacher" | "student";
  created_at: string;
  profile?: StudentProfile;
}

export interface QuestionConcept {
  id: number;
  question_id: number;
  concept_text: string;
  importance_weight: number;
}

export interface QuestionKeyword {
  id: number;
  question_id: number;
  keyword_text: string;
}

export interface QuestionOption {
  id?: number;
  question_id?: number;
  option_text: string;
  is_correct: boolean;
}

export interface Question {
  id: number;
  exam_id: number;
  question_type?: "subjective" | "mcq";
  question_text: string;
  reference_answer?: string;
  maximum_marks: number;
  concepts?: QuestionConcept[];
  keywords?: QuestionKeyword[];
  options?: QuestionOption[];
}

export interface ScoringConfiguration {
  id: number;
  exam_id: number | null;
  semantic_weight: number;
  concept_weight: number;
  keyword_weight: number;
  tfidf_weight: number;
  relevance_weight: number;
}

export interface Exam {
  id: number;
  title: string;
  description: string | null;
  subject: string | null;
  duration: number | null; // in minutes
  instructions: string | null;
  is_published: boolean;
  teacher_id: number;
  total_marks: number;
  created_at: string;
  questions?: Question[];
  scoring_config?: ScoringConfiguration;
}

export interface StudentAnswer {
  id: number;
  submission_id: number;
  question_id: number;
  answer_text: string;
  question?: Question;
  evaluation?: Evaluation;
}

export interface Submission {
  id: number;
  student_id: number;
  exam_id: number;
  status: "started" | "submitted" | "graded" | "reviewed";
  attempt_number?: number;
  started_at: string;
  submitted_at: string | null;
  student?: User;
  exam?: Exam;
  answers?: StudentAnswer[];
}

export interface EvaluationConcept {
  id: number;
  evaluation_id: number;
  concept_id: number;
  status: "present" | "partially_present" | "missing" | "incorrect";
  confidence: number;
  evidence_sentence: string | null;
  concept?: QuestionConcept;
}

export interface EvaluationKeyword {
  id: number;
  evaluation_id: number;
  keyword_id: number;
  status: "present" | "missing" | "partial";
  keyword?: QuestionKeyword;
}

export interface TeacherReview {
  id: number;
  evaluation_id: number;
  teacher_score: number;
  teacher_feedback: string | null;
  reviewer_id: number;
  reviewed_at: string;
  reviewer?: User;
}

export interface Evaluation {
  id: number;
  answer_id: number;
  keyword_score: number | null;
  tfidf_score: number | null;
  semantic_score: number | null;
  concept_score: number | null;
  relevance_score: number | null;
  final_score: number | null; // 0.0 - 1.0
  marks: number | null; // final_score * maximum_marks
  confidence: number | null;
  feedback: string | null;
  evaluated_at: string;
  concepts?: EvaluationConcept[];
  keywords?: EvaluationKeyword[];
  teacher_review?: TeacherReview | null;
}

export interface DashboardStats {
  total_exams: number;
  total_students: number;
  answers_evaluated: number;
  average_score: number;
  ai_confidence: number;
}
