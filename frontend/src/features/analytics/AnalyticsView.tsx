import React, { useEffect, useState } from "react";
import { request } from "../../api/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  BarChart3,
  Award,
  Users,
  FileText,
  Activity,
  AlertTriangle,
  Loader2,
  TrendingUp,
  UserCheck,
} from "lucide-react";

interface PeerComparison {
  exam_id: number;
  exam_title: string;
  my_score: number;
  class_average: number;
  highest_score: number;
  max_marks: number;
  total_takers: number;
  percentile: number;
}

interface PeerLeaderboardItem {
  id: number;
  student_name: string;
  exam_title: string;
  total_score: number;
  max_marks: number;
  percentage: number;
  status: string;
  is_me: boolean;
}

interface AnalyticsData {
  stats: {
    total_exams: number;
    total_students: number;
    answers_evaluated: number;
    average_score: number;
    ai_confidence: number;
  };
  score_distribution: Array<{ name: string; count: number }>;
  exam_performance: Array<{ title: string; score: number }>;
  peer_comparisons?: PeerComparison[];
  peer_leaderboard?: PeerLeaderboardItem[];
  override_stats: Array<{ name: string; value: number }>;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"];

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await request<AnalyticsData>("/analytics/dashboard");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-card border border-border rounded-2xl text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
        <h3 className="font-bold">Analytics Unavailable</h3>
        <p className="text-sm text-muted-foreground">{error || "Failed to load metrics data."}</p>
      </div>
    );
  }

  const { stats, score_distribution, exam_performance, peer_comparisons = [], peer_leaderboard = [], override_stats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Real-time AI metrics, peer score comparisons, and system evaluation diagnostics.
        </p>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Exams */}
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Total Exams</span>
            <span className="text-xl font-bold">{stats.total_exams}</span>
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Students</span>
            <span className="text-xl font-bold">{stats.total_students}</span>
          </div>
        </div>

        {/* Answers Evaluated */}
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Graded Answers</span>
            <span className="text-xl font-bold">{stats.answers_evaluated}</span>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Award size={20} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Average Grade</span>
            <span className="text-xl font-bold">{stats.average_score}%</span>
          </div>
        </div>

        {/* AI Confidence */}
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <BarChart3 size={20} />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block font-medium">AI Confidence</span>
            <span className="text-xl font-bold">{stats.ai_confidence}%</span>
          </div>
        </div>
      </div>

      {/* Peer Comparison Section */}
      {peer_comparisons.length > 0 && (
        <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <span>Realtime Peer Score Comparison (Your Score vs Class Average vs Top Score)</span>
            </h3>
          </div>
          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={peer_comparisons.map((pc) => ({
                  name: pc.exam_title,
                  "Your Score": pc.my_score,
                  "Class Average": pc.class_average,
                  "Highest Score": pc.highest_score,
                }))}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Your Score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Class Average" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Highest Score" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution Chart */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-sm text-foreground uppercase tracking-widest">Marks Distribution Curve</h3>
          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={score_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Override Pie Chart */}
        <div className="bg-card border border-border p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <h3 className="font-bold text-sm text-foreground uppercase tracking-widest">Manual Override Rate</h3>
          <div className="h-64 w-full text-xs flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={override_stats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {override_stats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Peer Leaderboard Table */}
      {peer_leaderboard.length > 0 && (
        <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-widest flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-500" />
              <span>Student Performance Leaderboard & Recent Peer Submissions</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Examination</th>
                  <th className="py-3 px-4 text-center">Score Awarded</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-right">Evaluation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {peer_leaderboard.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      item.is_me ? "bg-primary/5 font-semibold" : ""
                    }`}
                  >
                    <td className="py-3 px-4 flex items-center gap-2">
                      <span className="truncate">{item.student_name}</span>
                      {item.is_me && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{item.exam_title}</td>
                    <td className="py-3 px-4 text-center font-bold">
                      {item.total_score} / {item.max_marks}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          item.percentage >= 80
                            ? "bg-emerald-500/10 text-emerald-500"
                            : item.percentage >= 50
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {item.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right capitalize text-muted-foreground font-medium">
                      {item.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
