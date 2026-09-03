import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import {
  LayoutDashboard,
  FileSpreadsheet,
  HelpCircle,
  FolderCheck,
  BarChart3,
  Users,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isTeacher = user?.role === "teacher";

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      roles: ["teacher", "student"],
    },
    {
      name: "Examinations",
      path: "/exams",
      icon: FileSpreadsheet,
      roles: ["teacher", "student"],
    },
    ...(isTeacher
      ? [
          {
            name: "Submissions",
            path: "/submissions",
            icon: FolderCheck,
            roles: ["teacher"],
          },
          {
            name: "Students",
            path: "/students",
            icon: Users,
            roles: ["teacher"],
          },
        ]
      : [
          {
            name: "My Results",
            path: "/results",
            icon: FolderCheck,
            roles: ["student"],
          },
        ]),
    {
      name: "Analytics",
      path: "/analytics",
      icon: BarChart3,
      roles: ["teacher", "student"],
    },
    {
      name: "Profile",
      path: "/profile",
      icon: User,
      roles: ["teacher", "student"],
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
      roles: ["teacher", "student"],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || "")
  );

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-200 overflow-hidden">
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed bottom-6 right-6 z-50 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-105 transition-transform"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex flex-col bg-card border-r border-border h-full transition-all duration-300 relative ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-border h-16">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <GraduationCap className="w-6 h-6 flex-shrink-0" />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg tracking-tight truncate bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
                GradeAI
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Footer Panel */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm text-primary uppercase">
                  {user?.name?.slice(0, 2) || "US"}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-semibold text-sm truncate">{user?.name}</h4>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {user?.role}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className={`p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all ${
                collapsed ? "w-full flex justify-center" : ""
              }`}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-4/5 max-w-sm bg-card border-r border-border h-full p-4 z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="font-bold text-lg">GradeAI</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 hover:bg-muted rounded-md"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm text-primary uppercase">
                    {user?.name?.slice(0, 2) || "US"}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{user?.name}</h4>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-muted-foreground capitalize">
              {location.pathname.replace("/", "") || "Home"}
            </span>
            {user?.role && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                <Sparkles size={10} />
                {user.role === "teacher" ? "Educator" : "Student Portal"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Quick Profile Summary */}
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm font-medium">{user?.name}</span>
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                {user?.name?.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-background/50 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
