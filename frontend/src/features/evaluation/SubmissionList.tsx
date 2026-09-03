import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { request } from "../../api/client";
import { Submission, Exam } from "../../types";
import {
  FileText,
  User,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Search,
  Eye,
  Loader2,
} from "lucide-react";

export const SubmissionList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examIdParam = searchParams.get("examId");

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedExamId, setSelectedExamId] = useState<string>(examIdParam || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const url = selectedExamId !== "all" 
        ? `/submissions?examId=${selectedExamId}`
        : "/submissions";
      const data = await request<Submission[]>(url);
      setSubmissions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load submissions list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const data = await request<Exam[]>("/exams");
      setExams(data);
    } catch (err) {
      console.error("Failed to load exams select items", err);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [selectedExamId]);

  const filteredSubmissions = submissions.filter((sub) => {
    const studentName = sub.student?.name.toLowerCase() || "";
    const matchesSearch = studentName.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "graded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 size={12} />
            <span>Graded (AI)</span>
          </span>
        );
      case "reviewed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            <CheckCircle2 size={12} />
            <span>Reviewed</span>
          </span>
        );
      case "started":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">
            <Clock size={12} />
            <span>In Progress</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            <AlertCircle size={12} />
            <span>Submitted</span>
          </span>
        );
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Submissions</h1>
        <p className="text-sm text-muted-foreground">
          View auto-graded descriptive responses and perform manual overrides.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Filters Board */}
      <div className="bg-card border border-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Exam Selector */}
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none"
          >
            <option value="all">All Examinations</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title}
              </option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="graded">Graded (AI)</option>
            <option value="reviewed">Reviewed (Manual)</option>
            <option value="started">In Progress</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredSubmissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border border-dashed rounded-2xl space-y-3 text-center">
          <div className="p-4 bg-muted text-muted-foreground rounded-2xl">
            <FolderOpen size={28} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No submissions found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              There are no matching student attempts found for your active filter selections.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-6">Student</th>
                  <th className="p-4">Examination</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">AI Score</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubmissions.map((sub) => {
                  // Compute total AI score awarded vs total possible
                  const totalPossible = sub.exam?.total_marks || 0;
                  const totalAwarded = sub.answers?.reduce((acc, ans) => {
                    const marks = ans.evaluation?.marks || 0;
                    return acc + marks;
                  }, 0) || 0;

                  return (
                    <tr key={sub.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                            {sub.student?.name.slice(0, 2) || "ST"}
                          </div>
                          <div>
                            <span className="font-semibold block text-foreground flex items-center gap-2">
                              {sub.student?.name}
                              {sub.attempt_number > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  Attempt #{sub.attempt_number}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground block">
                              {sub.student?.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium max-w-xs truncate">{sub.exam?.title}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {sub.submitted_at
                          ? new Date(sub.submitted_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Started / Unsubmitted"}
                      </td>
                      <td className="p-4 font-bold text-primary">
                        {sub.status !== "started" 
                          ? `${totalAwarded.toFixed(1)} / ${totalPossible}`
                          : "--"}
                      </td>
                      <td className="p-4">{getStatusBadge(sub.status)}</td>
                      <td className="p-4 pr-6 text-right">
                        {sub.status !== "started" ? (
                          <button
                            onClick={() => navigate(`/submissions/review/${sub.id}`)}
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Eye size={12} />
                            <span>Evaluate</span>
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">In Session</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
