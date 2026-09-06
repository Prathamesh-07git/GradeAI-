import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { request } from "../../api/client";
import { Submission, StudentAnswer, Evaluation } from "../../types";
import {
  ArrowLeft,
  BookOpen,
  Award,
  Sparkles,
  Save,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  CheckSquare,
  Edit,
  Loader2,
} from "lucide-react";

export const TeacherGradingView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Review Form State
  const [teacherScore, setTeacherScore] = useState<string>("");
  const [teacherFeedback, setTeacherFeedback] = useState<string>("");
  const [savingReview, setSavingReview] = useState(false);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const data = await request<Submission>(`/submissions/${id}`);
      setSubmission(data);
      
      // Initialize form values from current answer's review or AI score
      if (data.answers && data.answers.length > 0) {
        const firstAns = data.answers[0];
        initializeForm(firstAns);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load submission details.");
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = (answer: StudentAnswer) => {
    if (answer.evaluation?.teacher_review) {
      setTeacherScore(answer.evaluation.teacher_review.teacher_score.toString());
      setTeacherFeedback(answer.evaluation.teacher_review.teacher_feedback || "");
    } else if (answer.evaluation) {
      setTeacherScore(answer.evaluation.marks?.toString() || "");
      setTeacherFeedback("");
    } else {
      setTeacherScore("");
      setTeacherFeedback("");
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const handleQuestionChange = (idx: number) => {
    setCurrentQIdx(idx);
    if (submission?.answers && submission.answers[idx]) {
      initializeForm(submission.answers[idx]);
    }
  };

  const saveTeacherReview = async () => {
    if (!submission?.answers) return;
    const currentAnswer = submission.answers[currentQIdx];
    const evaluationId = currentAnswer.evaluation?.id;
    if (!evaluationId) {
      alert("AI grading must be generated before reviewing.");
      return;
    }

    const scoreNum = parseFloat(teacherScore);
    const maxMarks = currentAnswer.question?.maximum_marks || 0;
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxMarks) {
      alert(`Please enter a valid score between 0 and ${maxMarks}`);
      return;
    }

    try {
      setSavingReview(true);
      const updatedReview = await request<any>(`/evaluations/${evaluationId}/review`, {
        method: "POST",
        body: JSON.stringify({
          teacher_score: scoreNum,
          teacher_feedback: teacherFeedback.trim() || null,
        }),
      });

      // Update local state to reflect review
      setSubmission((prev) => {
        if (!prev || !prev.answers) return prev;
        const newAnswers = [...prev.answers];
        newAnswers[currentQIdx] = {
          ...newAnswers[currentQIdx],
          evaluation: {
            ...newAnswers[currentQIdx].evaluation!,
            teacher_review: updatedReview,
          },
        };
        return { ...prev, answers: newAnswers };
      });
      
      alert("Manual override grade saved successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to save manual grade review");
    } finally {
      setSavingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading student responses and AI parameters...</span>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center p-6 bg-card border border-border rounded-2xl max-w-sm space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <h3 className="font-bold">Error Loading Attempt</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={() => navigate("/submissions")} className="py-2 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-xl">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const answers = submission.answers || [];
  const currentAnswer = answers[currentQIdx];
  const question = currentAnswer?.question;
  const evaluation = currentAnswer?.evaluation;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">Present</span>;
      case "partially_present":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">Partial</span>;
      case "incorrect":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Contradicts</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Missing</span>;
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/submissions")}
            className="p-2 hover:bg-card border border-border rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Evaluate: {submission.student?.name}</h1>
            <p className="text-xs text-muted-foreground">
              Exam: {submission.exam?.title} • Status: <span className="capitalize font-semibold">{submission.status}</span>
            </p>
          </div>
        </div>

        {/* Questions navigation tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-hide">
          {answers.map((ans, idx) => (
            <button
              key={ans.id}
              onClick={() => handleQuestionChange(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                idx === currentQIdx
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Q{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Grid workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden min-h-0">
        {/* Left Side: Parameters & Reference */}
        <div className="bg-card border border-border rounded-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Question Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Question Details</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                  Max Marks: {question?.maximum_marks}
                </span>
              </div>
              <h2 className="text-base font-bold leading-relaxed">{question?.question_text}</h2>
            </div>

            {/* Reference Key Section */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Reference Ideal Key</span>
              <div className="p-4 bg-muted/40 rounded-xl border border-border text-sm leading-relaxed whitespace-pre-wrap">
                {question?.reference_answer}
              </div>
            </div>

            {/* Keywords Section */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Evaluation Vocabulary (Keywords)</span>
              <div className="flex flex-wrap gap-2">
                {question?.keywords?.map((k) => (
                  <span
                    key={k.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs bg-background"
                  >
                    <span>{k.keyword_text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Concepts Weights */}
          <div className="space-y-3 pt-6 border-t border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Reference Concepts (Importance weights)</span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {question?.concepts?.map((c) => (
                <div key={c.id} className="flex justify-between items-center text-xs p-2 bg-muted/30 border border-border rounded-lg">
                  <span className="font-semibold capitalize text-foreground">{c.concept_text}</span>
                  <span className="text-muted-foreground font-bold">Weight: {c.importance_weight.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Student Answer & AI Scoring */}
        <div className="bg-card border border-border rounded-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Student Answer */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-primary uppercase tracking-widest block">Student Response</span>
              <div className="p-4 bg-background border border-border rounded-xl text-sm leading-relaxed whitespace-pre-wrap">
                {currentAnswer?.answer_text || <span className="text-muted-foreground italic">No answer provided.</span>}
              </div>
            </div>

            {/* AI Grading Breakdown */}
            {evaluation ? (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">AI Scoring Breakdown</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confidence:</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                      {evaluation.confidence?.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  <div className="p-2.5 bg-muted/30 border border-border rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase block font-bold">Semantic</span>
                    <span className="text-sm font-extrabold text-foreground">{((evaluation.semantic_score || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="p-2.5 bg-muted/30 border border-border rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase block font-bold">Concept Coverage</span>
                    <span className="text-sm font-extrabold text-foreground">{((evaluation.concept_score || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="p-2.5 bg-muted/30 border border-border rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase block font-bold">Keyword Coverage</span>
                    <span className="text-sm font-extrabold text-foreground">{((evaluation.keyword_score || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="p-2.5 bg-muted/30 border border-border rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase block font-bold">TF-IDF</span>
                    <span className="text-sm font-extrabold text-foreground">{((evaluation.tfidf_score || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="col-span-2 md:col-span-1 p-2.5 bg-muted/30 border border-border rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase block font-bold">Relevance</span>
                    <span className="text-sm font-extrabold text-foreground">{((evaluation.relevance_score || 0) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-muted-foreground block">AI Suggested Mark</span>
                    <span className="text-lg font-black text-primary">{evaluation.marks?.toFixed(1)} / {question?.maximum_marks}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block font-medium">Evaluation Status</span>
                    {evaluation.confidence && evaluation.confidence < 70 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                        <AlertTriangle size={12} />
                        <span>Low Confidence</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">
                        <CheckCircle size={12} />
                        <span>Highly Reliable</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* XAI Evidence matching feed */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">AI Explainable Evidence Alignment</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {evaluation.concepts?.map((ec) => (
                      <div key={ec.id} className="p-3 bg-muted/20 border border-border rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold capitalize">{ec.concept?.concept_text}</span>
                          <span>{getStatusBadge(ec.status)}</span>
                        </div>
                        {ec.evidence_sentence ? (
                          <p className="text-muted-foreground italic leading-relaxed pl-2 border-l border-primary/30">
                            "{ec.evidence_sentence}"
                          </p>
                        ) : (
                          <p className="text-muted-foreground italic">No evidence sentence detected in response.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted text-center rounded-xl text-xs text-muted-foreground italic">
                AI evaluation metrics not generated. Please ensure student submitted exam attempt.
              </div>
            )}
          </div>

          {/* Teacher Grading Panel */}
          <div className="border-t border-border pt-4 mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-1">
                <Edit size={14} className="text-primary" />
                <span>Teacher Override Panel</span>
              </h3>
              {evaluation?.teacher_review && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  Reviewed Grade: {evaluation.teacher_review.teacher_score}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-1 space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Override Score</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={evaluation?.marks?.toString() || "Score"}
                  value={teacherScore}
                  onChange={(e) => setTeacherScore(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Manual Feedback Notes</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter manual feedback comments..."
                    value={teacherFeedback}
                    onChange={(e) => setTeacherFeedback(e.target.value)}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={saveTeacherReview}
                    disabled={savingReview}
                    className="inline-flex items-center gap-1.5 py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl transition-all"
                  >
                    {savingReview ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} />}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
