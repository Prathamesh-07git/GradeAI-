import React, { useEffect, useState } from "react";
import { request } from "../../api/client";
import { User } from "../../types";
import {
  Users,
  Search,
  Calendar,
  Mail,
  UserCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";

export const StudentList: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch students from the backend endpoint we just created
      const data = await request<User[]>("/auth/students");
      setStudents(data);
    } catch (err: any) {
      setError(err.message || "Failed to load students directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading students directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Students Directory</h1>
        <p className="text-sm text-muted-foreground">
          View and manage registered student accounts enrolled in the evaluation system.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Total Enrolled Students</span>
            <span className="text-2xl font-black text-primary mt-1 block">
              {students.length}
            </span>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Students List Container */}
      {filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border border-dashed rounded-2xl space-y-3 text-center">
          <div className="p-4 bg-muted text-muted-foreground rounded-2xl">
            <Users size={28} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No students found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              {searchTerm 
                ? "No registered students matched your search criteria." 
                : "No student accounts have registered in the platform yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Table for Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4">Role Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                          {student.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail size={14} className="text-muted-foreground/60" />
                        <span>{student.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-muted-foreground/60" />
                        <span>{new Date(student.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                        <UserCheck size={10} />
                        <span>Active Student</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards list for Mobile */}
          <div className="block md:hidden divide-y divide-border">
            {filteredStudents.map((student) => (
              <div key={student.id} className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                    {student.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{student.name}</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 mt-0.5">
                      Active Student
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    <span>{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>Joined: {new Date(student.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
