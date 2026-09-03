import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LandingPage } from "./pages/LandingPage";
import { Login } from "./features/auth/Login";
import { Register } from "./features/auth/Register";
import { Dashboard } from "./pages/Dashboard";
import { ExamList } from "./features/exams/ExamList";
import { ExamBuilder } from "./features/exams/ExamBuilder";
import { ExamSession } from "./features/exams/ExamSession";
import { SubmissionList } from "./features/evaluation/SubmissionList";
import { TeacherGradingView } from "./features/evaluation/TeacherGradingView";
import { StudentResults } from "./features/results/StudentResults";
import { AnalyticsView } from "./features/analytics/AnalyticsView";
import { StudentList } from "./features/students/StudentList";
import { ProfileView } from "./features/profile/ProfileView";
import { SettingsView } from "./features/settings/SettingsView";
import { Loader2 } from "lucide-react";

// --- Route Protection Helpers ---

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Authenticating session...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "teacher") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "student") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// --- App Router Wrapper ---

const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Distraction-Free Student Exam Viewport */}
      <Route
        path="/exam/:id"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <ExamSession />
            </StudentRoute>
          </ProtectedRoute>
        }
      />

      {/* General Dashboard Pages (Wrapped in DashboardLayout) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/exams"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ExamList />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/exams/new"
        element={
          <ProtectedRoute>
            <TeacherRoute>
              <DashboardLayout>
                <ExamBuilder />
              </DashboardLayout>
            </TeacherRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/exams/edit/:id"
        element={
          <ProtectedRoute>
            <TeacherRoute>
              <DashboardLayout>
                <ExamBuilder />
              </DashboardLayout>
            </TeacherRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/submissions"
        element={
          <ProtectedRoute>
            <TeacherRoute>
              <DashboardLayout>
                <SubmissionList />
              </DashboardLayout>
            </TeacherRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/submissions/review/:id"
        element={
          <ProtectedRoute>
            <TeacherRoute>
              <DashboardLayout>
                <TeacherGradingView />
              </DashboardLayout>
            </TeacherRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <TeacherRoute>
              <DashboardLayout>
                <StudentList />
              </DashboardLayout>
            </TeacherRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <StudentRoute>
              <DashboardLayout>
                <StudentResults />
              </DashboardLayout>
            </StudentRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AnalyticsView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProfileView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SettingsView />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
