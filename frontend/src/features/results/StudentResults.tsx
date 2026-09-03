import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../../api/client";
import { Submission } from "../../types";
import {
  Award,
  Calendar,
  ChevronRight,
  HelpCircle,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  ArrowLeft,
  Sparkles,
  Loader2,
} from "lucide-react";

export const StudentResults: React.FC = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const data = await request<Submission[]>("/submissions");
      // Filter out 'started' (in-progress) and show only graded/reviewed
      const completed = data.filter((sub) => sub.status === "graded" || sub.status === "reviewed");
      setSubmissions(completed);
    } catch (err: any) {
      setError(err.message || "Failed to load results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const getStatusBadge = (status: string) => {
    return status === "reviewed" ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
        Reviewed
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
        AI Graded
      </span>
    );
  };

  const getConceptStatusClass = (status: string) => {
    switch (status) {
      case "present":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500";
      case "partially_present":
        return "bg-amber-500/10 border-amber-500/20 text-amber-500";
      case "incorrect":
        return "bg-destructive/10 border-destructive/20 text-destructive";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedSub) {
    // Detailed Result View
    const answers = selectedSub.answers || [];
    const totalPossible = selectedSub.exam?.questions?.reduce((acc: number, q: any) => acc + (q.maximum_marks || 0), 0) || selectedSub.exam?.total_marks || 0;
    
    // Compute total marks awarded (use teacher review if present, else AI marks)
    const totalAwarded = answers.reduce((acc, ans) => {
      const reviewScore = ans.evaluation?.teacher_review?.teacher_score;
      const aiScore = ans.evaluation?.marks || 0;
      return acc + (reviewScore !== undefined ? reviewScore : aiScore);
    }, 0);

    const averageConfidence = answers.length > 0 
      ? answers.reduce((acc, ans) => acc + (ans.evaluation?.confidence || 0), 0) / answers.length
      : 100;

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedSub(null)}
            className="p-2 hover:bg-card border border-border rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Grade Details: {selectedSub.exam?.title}
              {selectedSub.attempt_number > 1 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Attempt #{selectedSub.attempt_number}
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">Subject: {selectedSub.exam?.subject || "General"}</p>
          </div>
        </div>

        {/* Highlight Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Final Grade</span>
              <span className="text-2xl font-black text-primary">
                {totalAwarded.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ {totalPossible} Marks</span>
              </span>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Award size={24} />
            </div>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Evaluation Status</span>
              <span className="font-bold block text-sm mt-1">{getStatusBadge(selectedSub.status)}</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <FileCheck size={24} />
            </div>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Average Confidence</span>
              <span className="text-2xl font-extrabold text-foreground">{averageConfidence.toFixed(0)}%</span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Sparkles size={24} />
            </div>
          </div>
        </div>

        {/* Questions list */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg">Question-by-Question Evaluation Breakdown</h3>
          {answers.map((ans, idx) => {
            const evalObj = ans.evaluation;
            const reviewObj = evalObj?.teacher_review;
            const finalMark = reviewObj?.teacher_score !== undefined ? reviewObj.teacher_score : (evalObj?.marks || 0);

            return (
              <div key={ans.id} className="bg-card border border-border rounded-2xl p-6 space-y-5">
                {/* Question Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-primary uppercase">Question #{idx + 1}</span>
                    <h4 className="font-bold text-base leading-snug">{ans.question?.question_text}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-foreground">{finalMark.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground block">/ {ans.question?.maximum_marks} Marks</span>
                  </div>
                </div>

                {/* Student Answer */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Your Submission</span>
                  <div className="p-4 bg-background border border-border rounded-xl text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {ans.answer_text}
                  </div>
                </div>

                {/* AI Feedback */}
                {evalObj && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    {/* Feedback box */}
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-1">
                        <Sparkles size={12} />
                        <span>AI Diagnostic Feedback</span>
                      </span>
                      <p className="text-sm leading-relaxed text-foreground font-medium">
                        {reviewObj?.teacher_feedback || evalObj.feedback}
                      </p>
                      {reviewObj && (
                        <p className="text-xs text-muted-foreground italic pt-1 border-t border-border/20">
                          Feedback overrode and finalized by educator.
                        </p>
                      )}
                    </div>

                    {/* Concept Alignments List */}
                    <div className="space-y-2.5">
                      <span className="text-xs font-bold text-muted-foreground uppercase block">Conceptual Alignment & Evidence Detected</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {evalObj.concepts?.map((ec) => (
                          <div key={ec.id} className="p-3 bg-muted/30 border border-border rounded-xl space-y-1.5 text-xs flex flex-col justify-between">
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-semibold capitalize text-foreground truncate">{ec.concept?.concept_text}</span>
                              <span className={`inline-flex px-2 py-0.5 border text-[10px] font-bold rounded-full capitalize ${getConceptStatusClass(ec.status)}`}>
                                {ec.status.replace("_", " ")}
                              </span>
                            </div>
                            {ec.evidence_sentence && (
                              <p className="text-[11px] text-muted-foreground italic border-l border-primary/30 pl-2 leading-relaxed">
                                "{ec.evidence_sentence}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Results</h1>
        <p className="text-sm text-muted-foreground">
          View marks, feedback, and concept matches from your completed examinations.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
          {error}
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border border-dashed rounded-2xl space-y-3 text-center">
          <div className="p-4 bg-muted text-muted-foreground rounded-2xl">
            <Award size={28} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No results published</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              You haven't completed any examinations or your educator has not finalized evaluations yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {submissions.map((sub) => {
            const answers = sub.answers || [];
            const totalPossible = sub.exam?.questions?.reduce((acc: number, q: any) => acc + (q.maximum_marks || 0), 0) || sub.exam?.total_marks || 0;
            const totalAwarded = answers.reduce((acc, ans) => {
              const reviewScore = ans.evaluation?.teacher_review?.teacher_score;
              const aiScore = ans.evaluation?.marks || 0;
              return acc + (reviewScore !== undefined ? reviewScore : aiScore);
            }, 0);

            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(sub.status)}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar size={10} />
                      {sub.submitted_at && new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1 flex items-center gap-2">
                    {sub.exam?.title}
                    {sub.attempt_number > 1 && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Attempt #{sub.attempt_number}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Subject: {sub.exam?.subject || "General Computer Science"}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4 mt-5">
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Marks Awarded</span>
                    <span className="text-base font-extrabold text-foreground">
                      {totalAwarded.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">/ {totalPossible}</span>
                    </span>
                  </div>
                  <div className="p-1.5 bg-secondary text-secondary-foreground rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
