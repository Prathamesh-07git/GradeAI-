import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { request } from "../api/client";
import { DashboardStats, Exam, Submission } from "../types";
import {
  FileText,
  Users,
  Award,
  Sparkles,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = user?.role === "teacher";

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Analytics Stats
      const analytics = await request<{ stats: DashboardStats }>("/analytics/dashboard");
      setStats(analytics.stats);

      // 2. Fetch Exams List
      const examsList = await request<Exam[]>("/exams");
      setRecentExams(examsList.slice(0, 3)); // show top 3

      // 3. Fetch Submissions
      const subsList = await request<Submission[]>("/submissions");
      setRecentSubmissions(subsList.slice(0, 5)); // show top 5

    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter low-confidence submissions for teacher alert panel (confidence < 70 and not reviewed yet)
  const lowConfidenceSubmissions = recentSubmissions.filter((sub) => {
    if (sub.status !== "graded") return false;
    const answersList = sub.answers || [];
    const avgConf = answersList.reduce((acc, ans) => acc + (ans.evaluation?.confidence || 0), 0) / (answersList.length || 1);
    return avgConf < 70;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {user?.name || "Educator"}!
        </h1>
        <p className="text-sm text-muted-foreground">
          {isTeacher
            ? "Here is the summary of class progress, AI grading activities, and submissions needing review."
            : "Access your dashboard to enter examinations or review feedback."}
        </p>
      </div>

      {/* Metric Cards Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stats 1 */}
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">
                {isTeacher ? "Created Exams" : "Assigned Exams"}
              </span>
              <span className="text-2xl font-bold">{stats.total_exams}</span>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <FileText size={20} />
            </div>
          </div>

          {/* Stats 2 */}
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">
                {isTeacher ? "Registered Students" : "Completed Submissions"}
              </span>
              <span className="text-2xl font-bold">
                {isTeacher ? stats.total_students : stats.answers_evaluated}
              </span>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Users size={20} />
            </div>
          </div>

          {/* Stats 3 */}
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">
                {isTeacher ? "Average Score" : "Your Average Score"}
              </span>
              <span className="text-2xl font-bold">{stats.average_score}%</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Award size={20} />
            </div>
          </div>

          {/* Stats 4 */}
          <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">AI Confidence</span>
              <span className="text-2xl font-bold">{stats.ai_confidence}%</span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Sparkles size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Exams List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alert Queue - Low Confidence Reviews (Teacher only) */}
          {isTeacher && lowConfidenceSubmissions.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Review Alert Queue</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                The following submissions scored low AI confidence levels (below 70%) and are recommended for educator manual check:
              </p>
              <div className="space-y-2">
                {lowConfidenceSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex justify-between items-center bg-card p-3 rounded-xl border border-border text-xs"
                  >
                    <div>
                      <span className="font-semibold block">{sub.student?.name}</span>
                      <span className="text-muted-foreground block truncate max-w-xs">{sub.exam?.title}</span>
                    </div>
                    <button
                      onClick={() => navigate(`/submissions/review/${sub.id}`)}
                      className="py-1 px-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-bold"
                    >
                      Audit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Examinations list */}
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base tracking-tight">Recent Examinations</h3>
              <Link to="/exams" className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                <span>View all</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            {recentExams.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No examinations created yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentExams.map((exam) => (
                  <div key={exam.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <span className="font-bold block text-sm">{exam.title}</span>
                      <span className="text-xs text-muted-foreground block">{exam.subject} • {exam.total_marks} Marks</span>
                    </div>
                    <Link
                      to={isTeacher ? `/exams/edit/${exam.id}` : `/exam/${exam.id}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {isTeacher ? "Configure" : "Enter Exam"}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Submissions Feed */}
        <div className="bg-card border border-border p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base tracking-tight">
              {isTeacher ? "Recent Submissions Feed" : "Your Completed Exams"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Latest student grading and submissions statuses.</p>
            
            {recentSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4">No submission logs available.</p>
            ) : (
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">
                        {isTeacher ? sub.student?.name : sub.exam?.title}
                      </span>
                      {sub.status === "graded" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">
                          Graded
                        </span>
                      )}
                      {sub.status === "reviewed" && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          Reviewed
                        </span>
                      )}
                      {sub.status === "started" && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold">
                          Session
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{sub.exam?.title}</span>
                      <span>{sub.submitted_at && new Date(sub.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Link
            to={isTeacher ? "/submissions" : "/results"}
            className="w-full text-center py-2.5 px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-xl block transition-all"
          >
            {isTeacher ? "Go to Submissions" : "View Grade Reports"}
          </Link>
        </div>
      </div>
    </div>
  );
};
