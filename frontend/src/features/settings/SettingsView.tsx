import React from "react";
import { Settings, Moon, Sun, Bell, Shield, Paintbrush } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export const SettingsView: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your app preferences and configurations.</p>
        </div>
        <div className="p-4 bg-primary/10 rounded-full">
          <Settings className="w-12 h-12 text-primary" />
        </div>
      </div>

      <div className="grid gap-6">
        {/* Appearance Settings */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Paintbrush className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Appearance</h3>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <h4 className="font-medium text-sm">Theme Mode</h4>
              <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
            >
              {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </button>
          </div>
        </div>

        {/* Notifications Settings */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <h4 className="font-medium text-sm">Email Alerts</h4>
                <p className="text-xs text-muted-foreground">Receive updates about new exams</p>
              </div>
              <div className="w-10 h-5 bg-primary/20 rounded-full relative cursor-not-allowed opacity-50">
                <div className="absolute left-1 top-1 w-3 h-3 bg-primary rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <h4 className="font-medium text-sm">Push Notifications</h4>
                <p className="text-xs text-muted-foreground">Receive browser notifications</p>
              </div>
              <div className="w-10 h-5 bg-muted rounded-full relative cursor-not-allowed opacity-50">
                <div className="absolute left-1 top-1 w-3 h-3 bg-muted-foreground rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Security & Privacy</h3>
          </div>
          
          <div className="space-y-4">
             <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <h4 className="font-medium text-sm">Change Password</h4>
                <p className="text-xs text-muted-foreground">Update your login credentials</p>
              </div>
              <button disabled className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Update
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
