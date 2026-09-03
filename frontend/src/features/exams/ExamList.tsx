import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../api/client";
import { Exam, Submission } from "../../types";
import {
  FileText,
  Plus,
  Clock,
  BookOpen,
  Award,
  Globe,
  Lock,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

export const ExamList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = user?.role === "teacher";

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await request<Exam[]>("/exams");
      setExams(data);
      if (user?.role === "student") {
        const subData = await request<Submission[]>("/submissions");
        setSubmissions(subData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load examinations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handlePublish = async (id: number) => {
    try {
      const updated = await request<Exam>(`/exams/${id}/publish`, {
        method: "POST",
      });
      setExams((prev) =>
        prev.map((exam) => (exam.id === id ? { ...exam, is_published: updated.is_published } : exam))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this examination? All questions and student answers will be deleted.")) return;
    try {
      await request(`/exams/${id}`, { method: "DELETE" });
      setExams((prev) => prev.filter((exam) => exam.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete exam");
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Examinations</h1>
          <p className="text-sm text-muted-foreground">
            {isTeacher
              ? "Create, publish, and manage your subjective exams and grading parameters"
              : "Access examinations and view your AI-evaluated feedback"}
          </p>
        </div>
        {isTeacher && (
          <Link
            to="/exams/new"
            className="inline-flex items-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-all shadow-sm shadow-primary/20"
          >
            <Plus size={16} />
            <span>Create Exam</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border border-dashed rounded-2xl space-y-4 text-center">
          <div className="p-4 bg-muted text-muted-foreground rounded-2xl">
            <FileText size={32} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No examinations found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              {isTeacher
                ? "Get started by building your first examination. Define reference answers, keywords, and concept weights."
                : "No examinations are active at the moment. Please wait for your educator to publish them."}
            </p>
          </div>
          {isTeacher && (
            <Link
              to="/exams/new"
              className="py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-all"
            >
              Build an Examination
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              {/* Badge Top */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  <BookOpen size={10} />
                  {exam.subject || "General"}
                </span>

                {isTeacher && (
                  <button
                    onClick={() => handlePublish(exam.id)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                      exam.is_published
                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                    }`}
                  >
                    {exam.is_published ? (
                      <>
                        <Globe size={10} />
                        <span>Published</span>
                      </>
                    ) : (
                      <>
                        <Lock size={10} />
                        <span>Draft</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-2 mb-6">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
                  {exam.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {exam.description || "No description provided."}
                </p>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-border py-3 mb-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-muted-foreground" />
                  <span>{exam.duration ? `${exam.duration} mins` : "Untimed"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award size={14} className="text-muted-foreground" />
                  <span>{exam.total_marks} Total Marks</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isTeacher ? (
                  <>
                    <button
                      onClick={() => navigate(`/exams/edit/${exam.id}`)}
                      className="p-2.5 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-xl transition-all"
                      title="Edit Exam"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="p-2.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border hover:border-destructive/20 rounded-xl transition-all"
                      title="Delete Exam"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => navigate(`/submissions?examId=${exam.id}`)}
                      className="flex-1 py-2.5 px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-semibold rounded-xl text-center transition-all"
                    >
                      View Submissions
                    </button>
                  </>
                ) : (() => {
                  const examSubmissions = submissions.filter((sub) => sub.exam_id === exam.id);
                  const activeSub = examSubmissions.find((sub) => sub.status === "started");
                  const completedSubs = examSubmissions.filter((sub) =>
                    ["submitted", "graded", "reviewed"].includes(sub.status)
                  );

                  if (activeSub) {
                     return (
                       <button
                         onClick={() => navigate(`/exam/${exam.id}`)}
                         className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-all"
                       >
                         <FileText size={16} />
                         <span>Resume Examination</span>
                       </button>
                     );
                  }

                  if (completedSubs.length > 0) {
                     const maxScore = Math.max(
                       ...completedSubs.map((s) =>
                         s.answers?.reduce((sum, a) => sum + (a.evaluation?.marks || 0), 0) || 0
                       )
                     );

                     return (
                       <div className="space-y-2.5 w-full">
                         <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-medium">
                           <span>Completed ({completedSubs.length} {completedSubs.length === 1 ? "attempt" : "attempts"})</span>
                           <span className="font-bold text-foreground">
                             Max: {maxScore.toFixed(1)} / {exam.total_marks}
                           </span>
                         </div>
                         <div className="flex gap-2">
                           <button
                             onClick={() => navigate(`/exam/${exam.id}`)}
                             className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-xl transition-all"
                           >
                             <Clock size={14} />
                             <span>Reattempt</span>
                           </button>
                           <button
                             onClick={() => navigate(`/results`)}
                             className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-xl transition-all"
                           >
                             <Award size={14} />
                             <span>Grades</span>
                           </button>
                         </div>
                       </div>
                     );
                  }

                  return (
                    <button
                      onClick={() => navigate(`/exam/${exam.id}`)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-all"
                    >
                      <FileText size={16} />
                      <span>Enter Examination</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
