import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { request } from "../../api/client";
import { StudentProfile } from "../../types";
import { UserCircle2, Save, Loader2, CheckCircle2, AlertCircle, GraduationCap } from "lucide-react";

export const ProfileView: React.FC = () => {
  const { user, login } = useAuth();
  
  const [profile, setProfile] = useState<StudentProfile>({
    student_id_number: "",
    major: "",
    year: "",
    bio: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // The /profile endpoint returns the UserOut schema which has the profile object inside it
        const userData: any = await request("/profile");
        if (userData.profile) {
          setProfile({
            student_id_number: userData.profile.student_id_number || "",
            major: userData.profile.major || "",
            year: userData.profile.year || "",
            bio: userData.profile.bio || ""
          });
        }
      } catch (err: any) {
        setError("Failed to load profile. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const updatedProfile = await request<StudentProfile>("/profile", {
        method: "PUT",
        body: JSON.stringify(profile)
      });
      
      setProfile({
        student_id_number: updatedProfile.student_id_number || "",
        major: updatedProfile.major || "",
        year: updatedProfile.year || "",
        bio: updatedProfile.bio || ""
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Update AuthContext user with new profile
      if (user) {
         // login is used to update the context in AuthContext.tsx
         // but wait, login requires the token. 
         // Let's just update local state since we don't have a direct updateUser function
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const isStudent = user?.role === "student";

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal and academic information.</p>
        </div>
        <div className="p-4 bg-primary/10 rounded-full">
          <UserCircle2 className="w-12 h-12 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Account Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Name</p>
                <p className="font-medium mt-1">{user?.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</p>
                <p className="font-medium mt-1">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Role</p>
                <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                  {user?.role}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Member Since</p>
                <p className="font-medium mt-1">{new Date(user?.created_at || "").toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form area */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 text-green-500 border border-green-500/20 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={20} />
              <span className="text-sm font-medium">Profile updated successfully!</span>
            </div>
          )}
          
          <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
            <h3 className="font-semibold text-lg border-b border-border pb-4">Academic Information</h3>
            
            {isStudent ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Student ID Number</label>
                    <input
                      type="text"
                      className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="e.g. S12345678"
                      value={profile.student_id_number || ""}
                      onChange={(e) => setProfile({ ...profile, student_id_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Graduation Year</label>
                    <input
                      type="text"
                      className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="e.g. 2027"
                      value={profile.year || ""}
                      onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Major / Department</label>
                  <input
                    type="text"
                    className="w-full p-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    placeholder="e.g. Computer Science"
                    value={profile.major || ""}
                    onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Short Bio</label>
                  <textarea
                    className="w-full p-3 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm min-h-[120px] resize-y"
                    placeholder="Tell us a little bit about yourself and your academic goals..."
                    value={profile.bio || ""}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  />
                </div>
                
                <div className="pt-4 border-t border-border flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-lg font-medium transition-all focus:ring-4 focus:ring-primary/20 disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed border-border flex flex-col items-center">
                <GraduationCap className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <h3 className="font-medium text-lg mb-1">Educator Account</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Academic profiles are currently only available for student accounts. If you need to manage your institution details, check the settings panel.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
