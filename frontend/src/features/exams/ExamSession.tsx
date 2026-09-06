import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { request } from "../../api/client";
import { Exam, Submission } from "../../types";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Trash2,
} from "lucide-react";

export const ExamSession: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<{ [qId: number]: string }>({});
  const [currentQIdx, setCurrentQIdx] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds
  const [saving, setSaving] = useState(false);
  const [saveTime, setSaveTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const tabSwitchCountRef = useRef(0);
  const prevAnswersRef = useRef<{ [qId: number]: string }>({});
  const autosaveTimerRef = useRef<any>(null);

  // 1. Fetch Exam & Start/Resume Submission
  useEffect(() => {
    async function initSession() {
      try {
        setLoading(true);
        // Fetch Exam Specs
        const examData = await request<Exam>(`/exams/${id}`);
        setExam(examData);

        // Start/Resume attempt
        const attempt = await request<Submission>(`/submissions/start/${id}`, {
          method: "POST",
        });
        setSubmission(attempt);

        // Prepopulate answers if resuming
        const prefilledAnswers: { [qId: number]: string } = {};
        if (attempt.answers && attempt.answers.length > 0) {
          attempt.answers.forEach((ans) => {
            prefilledAnswers[ans.question_id] = ans.answer_text;
          });
        }
        setAnswers(prefilledAnswers);
        prevAnswersRef.current = prefilledAnswers;

        // Configure Timer
        if (examData.duration) {
          const startedAtStr = attempt.started_at.endsWith("Z") ? attempt.started_at : attempt.started_at + "Z";
          const startedAt = new Date(startedAtStr).getTime();
          const now = new Date().getTime();
          const elapsedSeconds = Math.floor((now - startedAt) / 1000);
          const totalDurationSeconds = examData.duration * 60;
          const remaining = Math.max(0, totalDurationSeconds - elapsedSeconds);
          setTimeLeft(remaining);
        }
      } catch (err: any) {
        setError(err.message || "Failed to initialize exam workspace.");
      } finally {
        setLoading(false);
      }
    }
    initSession();
  }, [id]);

  // 2. Countdown Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) {
        // Auto submit when time runs out!
        handleFinalSubmit(true);
      }
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // 3. Real-time Autosave Interval (every 8 seconds)
  useEffect(() => {
    if (!submission || submission.status !== "started") return;

    autosaveTimerRef.current = setInterval(() => {
      triggerAutosave();
    }, 8000);

    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [submission, answers]);

  // 4. Anti-Cheating Features (MCQ Only)
  const isMcqOnly = exam?.questions && exam.questions.length > 0 && exam.questions.every(q => q.question_type === 'mcq');
  
  useEffect(() => {
    if (!isMcqOnly || submission?.status !== "started") return;

    // A. Prevent Tab Switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCountRef.current += 1;
        
        if (tabSwitchCountRef.current === 1) {
          setShowCheatingWarning(true);
        } else if (tabSwitchCountRef.current >= 2) {
          handleFinalSubmit(true, "Anti-cheating violation: You switched tabs multiple times. Your exam has been automatically submitted.");
        }
      }
    };

    // B. Prevent Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // C. Prevent Copying
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    // D. Prevent Screenshot Shortcuts (PrintScreen, Meta+Shift+S, Meta+Shift+3/4)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        if (e.key.toLowerCase() === 's' || e.key === '3' || e.key === '4') {
          e.preventDefault();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMcqOnly, submission?.status]);

  const triggerAutosave = async () => {
    if (!submission) return;

    // Check if answers actually changed since last save
    const changed = Object.keys(answers).some(
      (qId) => answers[Number(qId)] !== prevAnswersRef.current[Number(qId)]
    );
    if (!changed) return;

    try {
      setSaving(true);
      const answerPayload = Object.entries(answers).map(([qId, text]) => ({
        question_id: Number(qId),
        answer_text: text,
      }));

      await request(`/submissions/${submission.id}/autosave`, {
        method: "POST",
        body: JSON.stringify({ answers: answerPayload }),
      });

      // Update refs
      prevAnswersRef.current = { ...answers };
      const now = new Date();
      setSaveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error("Autosave failed", err);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async (isAuto = false, reason?: string) => {
    if (!submission) return;
    try {
      setSubmitting(true);
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
      
      // Trigger final save first
      const answerPayload = Object.entries(answers).map(([qId, text]) => ({
        question_id: Number(qId),
        answer_text: text,
      }));

      // Submit API (submits latest answers and changes status)
      await request(`/submissions/${submission.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: answerPayload }),
      });

      // Navigate to results
      if (reason) {
        alert(reason);
      } else if (isAuto) {
        alert("Time limit reached! Your examination answers were saved and submitted automatically.");
      }
      navigate(`/results`);
    } catch (err: any) {
      alert(err.message || "Failed to submit examination.");
    } finally {
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Setting up your secure exam workspace...</span>
      </div>
    );
  }

  if (error || !exam || !submission) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center p-6 bg-card border border-border rounded-2xl max-w-sm space-y-3">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <h3 className="font-bold">Workspace Error</h3>
          <p className="text-sm text-muted-foreground">{error || "Failed to load examination workspace."}</p>
          <button onClick={() => navigate("/exams")} className="py-2 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-xl">
            Return to Exams
          </button>
        </div>
      </div>
    );
  }

  const questions = exam.questions || [];
  const currentQ = questions[currentQIdx];
  const currentAnswerText = answers[currentQ.id] || "";
  const wordCount = currentAnswerText.trim() ? currentAnswerText.trim().split(/\s+/).length : 0;
  const charCount = currentAnswerText.length;
  const answeredCount = questions.filter((q) => answers[q.id]?.trim().length > 0).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-zinc-950/50 text-foreground select-none">
      {/* Distraction-Free Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="font-bold text-lg text-primary tracking-tight">{exam.title}</span>
            <span className="ml-3 text-[10px] font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
              {exam.subject || "General"}
            </span>
          </div>
        </div>

        {/* Middle Stats - Question Progress */}
        <div className="hidden md:flex items-center gap-3 bg-muted/50 px-4 py-1.5 rounded-2xl border border-border/60 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Progress: {answeredCount} of {questions.length} answered</span>
          </div>
          <div className="w-24 bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Autosave Status */}
          <div className="text-xs text-muted-foreground flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/40">
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Saving draft...</span>
              </>
            ) : saveTime ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Saved at {saveTime}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Draft initialized</span>
              </>
            )}
          </div>

          {/* Countdown Clock */}
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold shadow-sm transition-all duration-300 ${
              timeLeft < 300
                ? "bg-destructive/10 border-destructive/20 text-destructive animate-pulse"
                : "bg-muted/80 border-border text-foreground"
            }`}>
              <Clock size={16} className={timeLeft < 300 ? "text-destructive" : "text-muted-foreground"} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}

          <button
            onClick={() => setShowSubmitModal(true)}
            className="py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Submit Examination
          </button>
        </div>
      </header>

      {/* Main Examination Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigator Panel */}
        <aside className="w-64 border-r border-border bg-card flex flex-col p-4 space-y-4 overflow-y-auto">
          <div className="px-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Questions Checklist</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Click to navigate between questions</p>
          </div>
          <nav className="space-y-1.5">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id]?.trim().length > 0;
              const isActive = idx === currentQIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    triggerAutosave();
                    setCurrentQIdx(idx);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left text-sm font-medium transition-all duration-200 border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/15"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground border-transparent"
                  }`}
                >
                  <span className="truncate">Question {idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] opacity-75">{q.maximum_marks}M</span>
                    {isAnswered ? (
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-primary-foreground" : "bg-emerald-500"}`} />
                    ) : (
                      <span className={`w-2 h-2 rounded-full border border-current opacity-40`} />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Editor Panel */}
        <main className="flex-1 flex flex-col p-8 overflow-y-auto max-w-4xl mx-auto space-y-6 w-full">
          {/* Question Banner */}
          <div className="bg-card border border-border/80 p-6 rounded-2xl space-y-3 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Question {currentQIdx + 1} of {questions.length}</span>
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
                {currentQ.maximum_marks} Marks
              </span>
            </div>
            <h2 className="text-lg font-bold leading-relaxed text-foreground/90">{currentQ.question_text}</h2>
          </div>

          {/* Editor Workspace */}
          <div className="flex-1 flex flex-col bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 min-h-[350px] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
            {/* Editor Top Bar */}
            <div className="h-11 border-b border-border/80 bg-muted/30 px-5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-bold uppercase tracking-wider text-muted-foreground/80">Answer Workspace</span>
              <div className="flex items-center gap-4 bg-muted/60 px-3 py-1 rounded-full border border-border/40 font-medium">
                <span>{wordCount} Words</span>
                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                <span>{charCount} Characters</span>
              </div>
            </div>

            {/* Answer Field */}
            {currentQ.question_type === 'mcq' ? (
              <div className="flex-1 p-6 bg-background/30 dark:bg-zinc-950/10 space-y-4 overflow-y-auto">
                <div className="text-sm font-semibold text-muted-foreground mb-2">Select the correct option:</div>
                {(currentQ.options || []).map((opt, i) => (
                  <label key={i} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                    <input
                      type="radio"
                      name={`question_${currentQ.id}`}
                      value={opt.option_text}
                      checked={currentAnswerText === opt.option_text}
                      onChange={(e) => {
                        setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }));
                      }}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm font-medium">{opt.option_text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="flex-1 p-6 bg-background/30 dark:bg-zinc-950/10 resize-none focus:outline-none text-sm leading-relaxed font-sans placeholder:text-muted-foreground/60"
                placeholder="Type your detailed explanatory answer here. Take care to structure your answer logically, highlighting key points, definitions, or steps."
                value={currentAnswerText}
                onChange={(e) => {
                  setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }));
                }}
                onKeyDown={(e) => {
                  // Keyboard shortcut: Ctrl + Save
                  if (e.ctrlKey && e.key === "s") {
                    e.preventDefault();
                    triggerAutosave();
                  }
                }}
              />
            )}

            {/* Editor Bottom Bar */}
            <div className="h-14 border-t border-border/80 bg-muted/10 px-5 flex items-center justify-between">
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear this answer? This action cannot be undone.")) {
                    setAnswers((prev) => ({ ...prev, [currentQ.id]: "" }));
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 py-2 px-3.5 rounded-xl transition-all font-semibold"
                title="Clear current workspace"
              >
                <Trash2 size={14} />
                <span>Clear Field</span>
              </button>

              <button
                onClick={triggerAutosave}
                className="inline-flex items-center gap-1.5 py-2 px-4 border border-border hover:bg-muted/80 text-xs font-semibold rounded-xl transition-all shadow-sm"
              >
                <Save size={14} className="text-muted-foreground" />
                <span>Save Draft</span>
              </button>
            </div>
          </div>

          {/* Viewport Pagination */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => {
                triggerAutosave();
                setCurrentQIdx((prev) => Math.max(0, prev - 1));
              }}
              disabled={currentQIdx === 0}
              className="inline-flex items-center gap-1.5 py-2.5 px-5 border border-border hover:bg-muted/85 font-semibold text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            {currentQIdx < questions.length - 1 ? (
              <button
                onClick={() => {
                  triggerAutosave();
                  setCurrentQIdx((prev) => Math.min(questions.length - 1, prev + 1));
                }}
                className="inline-flex items-center gap-1.5 py-2.5 px-5 bg-secondary hover:bg-secondary/80 font-semibold text-sm rounded-xl transition-all border border-transparent"
              >
                <span>Next Question</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="py-2.5 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-xl shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Finish Examination
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm px-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">Submit Examination?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Are you sure you want to finish and submit your answers? Once submitted, the examination session will close and your answers will be locked for grading.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="py-2 px-4 border border-border hover:bg-muted text-sm font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 py-2 px-5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Answers</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Cheating Warning Modal */}
      {showCheatingWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md px-4">
          <div className="bg-destructive border border-destructive-foreground/20 p-8 rounded-3xl max-w-lg w-full shadow-2xl animate-in zoom-in duration-300 text-destructive-foreground text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-destructive-foreground/20 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} className="text-destructive-foreground" />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-widest">Warning</h3>
            <p className="text-lg font-medium opacity-90 leading-relaxed">
              Tab switching is strictly prohibited during this examination. 
            </p>
            <div className="p-4 bg-destructive-foreground/10 rounded-xl font-bold uppercase tracking-wider text-sm">
              If you switch tabs again, your exam will be automatically submitted and locked.
            </div>
            <button
              onClick={() => setShowCheatingWarning(false)}
              className="mt-6 w-full py-4 px-6 bg-destructive-foreground text-destructive font-black text-lg rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              I Understand, Return to Exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
