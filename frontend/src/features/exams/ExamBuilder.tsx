import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { request } from "../../api/client";
import { Exam, Question, QuestionConcept, QuestionKeyword } from "../../types";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  FileText,
  Award,
  Sliders,
  Settings,
  AlertCircle,
  Loader2,
  Percent,
} from "lucide-react";

// Validation schema for Multi-step Form
const examSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  subject: z.string().optional(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute").optional(),
  instructions: z.string().optional(),
  total_marks: z.coerce.number().min(1, "Total marks must be greater than 0"),
  scoring_config: z.object({
    semantic_weight: z.coerce.number().min(0).max(1),
    concept_weight: z.coerce.number().min(0).max(1),
    keyword_weight: z.coerce.number().min(0).max(1),
    tfidf_weight: z.coerce.number().min(0).max(1),
    relevance_weight: z.coerce.number().min(0).max(1),
  }).default({
    semantic_weight: 0.35,
    concept_weight: 0.30,
    keyword_weight: 0.15,
    tfidf_weight: 0.10,
    relevance_weight: 0.10,
  }),
  questions: z.array(
    z.object({
      question_type: z.enum(["subjective", "mcq"]).default("subjective"),
      question_text: z.string().min(1, "Question text is required"),
      reference_answer: z.string().optional(),
      maximum_marks: z.coerce.number().min(1, "Maximum marks must be greater than 0"),
      options: z.array(
        z.object({
          option_text: z.string().min(1, "Option text is required"),
          is_correct: z.boolean().default(false),
        })
      ).optional(),
      concepts: z.array(
        z.object({
          concept_text: z.string().min(1, "Concept is required"),
          importance_weight: z.coerce.number().min(0).max(10),
        })
      ),
      keywords: z.array(
        z.object({
          keyword_text: z.string().min(1, "Keyword is required"),
        })
      ),
    })
  ).min(1, "Add at least one question"),
});

type ExamFormValues = z.infer<typeof examSchema>;

export const ExamBuilder: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic tags states for input additions (temporary states before pushing to react-hook-form array)
  const [tempKw, setTempKw] = useState<{ [qIndex: number]: string }>({});
  const [tempConcept, setTempConcept] = useState<{ [qIndex: number]: string }>({});

  const isEdit = !!id;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(examSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      subject: "",
      duration: 60,
      instructions: "",
      total_marks: 100,
      scoring_config: {
        semantic_weight: 0.35,
        concept_weight: 0.30,
        keyword_weight: 0.15,
        tfidf_weight: 0.10,
        relevance_weight: 0.10,
      },
      questions: [
        {
          question_type: "subjective",
          question_text: "",
          reference_answer: "",
          maximum_marks: 10,
          concepts: [],
          keywords: [],
          options: [],
        },
      ],
    },
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control,
    name: "questions",
  });

  // Watch weights to show config sum
  const watchedConfig = watch("scoring_config");
  const weightsSum =
    (watchedConfig?.semantic_weight || 0) +
    (watchedConfig?.concept_weight || 0) +
    (watchedConfig?.keyword_weight || 0) +
    (watchedConfig?.tfidf_weight || 0) +
    (watchedConfig?.relevance_weight || 0);

  // Watch questions list for total marks calculation verification
  const watchedQuestions = watch("questions") || [];
  const questionsMarksSum = watchedQuestions.reduce((acc, q) => acc + (Number(q.maximum_marks) || 0), 0);
  const totalExamMarks = watch("total_marks") || 0;

  useEffect(() => {
    async function loadExam() {
      if (!isEdit) return;
      try {
        setFetching(true);
        const data = await request<Exam>(`/exams/${id}`);
        setValue("title", data.title);
        setValue("description", data.description || "");
        setValue("subject", data.subject || "");
        setValue("duration", data.duration || 60);
        setValue("instructions", data.instructions || "");
        setValue("total_marks", data.total_marks);
        if (data.scoring_config) {
          setValue("scoring_config", {
            semantic_weight: data.scoring_config.semantic_weight,
            concept_weight: data.scoring_config.concept_weight,
            keyword_weight: data.scoring_config.keyword_weight,
            tfidf_weight: data.scoring_config.tfidf_weight,
            relevance_weight: data.scoring_config.relevance_weight,
          });
        }
        if (data.questions && data.questions.length > 0) {
          // Format questions correctly
          const questionsFormatted = data.questions.map((q) => ({
            question_type: q.question_type || "subjective",
            question_text: q.question_text,
            reference_answer: q.reference_answer || "",
            maximum_marks: q.maximum_marks,
            concepts: q.concepts?.map((c) => ({
              concept_text: c.concept_text,
              importance_weight: c.importance_weight,
            })) || [],
            keywords: q.keywords?.map((k) => ({
              keyword_text: k.keyword_text,
            })) || [],
            options: q.options?.map((o) => ({
              option_text: o.option_text,
              is_correct: o.is_correct,
            })) || [],
          }));
          setValue("questions", questionsFormatted);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load exam details");
      } finally {
        setFetching(false);
      }
    }
    loadExam();
  }, [id, isEdit]);

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) {
      fieldsToValidate = ["title", "total_marks", "duration", "subject"];
    } else if (step === 2) {
      fieldsToValidate = ["questions"];
    } else if (step === 3) {
      fieldsToValidate = ["scoring_config"];
    }

    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      if (step === 3 && Math.abs(weightsSum - 1.0) > 0.01) {
        setError("Scoring weights must sum to exactly 1.0 (100%)");
        return;
      }
      if (step === 2 && Number(questionsMarksSum) !== Number(totalExamMarks)) {
        setError(`Warning: The sum of questions marks (${questionsMarksSum}) does not match the total exam marks (${totalExamMarks}). Please fix.`);
        return;
      }
      setError(null);
      setStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setError(null);
    setStep((prev) => prev - 1);
  };

  const addKeyword = (qIndex: number) => {
    const kwText = tempKw[qIndex]?.trim();
    if (!kwText) return;
    const currentKeywords = watch(`questions.${qIndex}.keywords`) || [];
    if (currentKeywords.some((k) => k.keyword_text.toLowerCase() === kwText.toLowerCase())) return;
    setValue(`questions.${qIndex}.keywords`, [...currentKeywords, { keyword_text: kwText }]);
    setTempKw((prev) => ({ ...prev, [qIndex]: "" }));
  };

  const removeKeyword = (qIndex: number, kwIndex: number) => {
    const currentKeywords = watch(`questions.${qIndex}.keywords`) || [];
    setValue(
      `questions.${qIndex}.keywords`,
      currentKeywords.filter((_, idx) => idx !== kwIndex)
    );
  };

  const addConcept = (qIndex: number) => {
    const conceptText = tempConcept[qIndex]?.trim();
    if (!conceptText) return;
    const currentConcepts = watch(`questions.${qIndex}.concepts`) || [];
    if (currentConcepts.some((c) => c.concept_text.toLowerCase() === conceptText.toLowerCase())) return;
    setValue(`questions.${qIndex}.concepts`, [
      ...currentConcepts,
      { concept_text: conceptText, importance_weight: 1.0 },
    ]);
    setTempConcept((prev) => ({ ...prev, [qIndex]: "" }));
  };

  const removeConcept = (qIndex: number, cIndex: number) => {
    const currentConcepts = watch(`questions.${qIndex}.concepts`) || [];
    setValue(
      `questions.${qIndex}.concepts`,
      currentConcepts.filter((_, idx) => idx !== cIndex)
    );
  };

  const onSubmit = async (values: ExamFormValues) => {
    setError(null);
    setLoading(true);
    try {
      if (isEdit) {
        await request(`/exams/${id}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
      } else {
        await request("/exams", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      navigate("/exams");
    } catch (err: any) {
      setError(err.message || "Failed to save examination.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Step Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/exams")}
          className="p-2 hover:bg-card border border-border rounded-xl transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Examination" : "Create New Examination"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Step {step} of 4: {step === 1 && "Basic Configurations"}
            {step === 2 && "Add & Parameterize Questions"}
            {step === 3 && "Scoring Configurations"}
            {step === 4 && "Review & Publish"}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Details */}
      {step === 1 && (
        <div className="bg-card border border-border p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText className="text-primary" />
            <span>Examination Specifications</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Exam Title *</label>
              <input
                type="text"
                placeholder="e.g. Java OOP Paradigm Semester Exam"
                {...register("title")}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message?.toString()}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold">Subject / Tag</label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                {...register("subject")}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold">Duration (Minutes) *</label>
              <input
                type="number"
                {...register("duration")}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.duration && <p className="text-xs text-destructive">{errors.duration.message?.toString()}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold">Total Awardable Marks *</label>
              <input
                type="number"
                {...register("total_marks")}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.total_marks && <p className="text-xs text-destructive">{errors.total_marks.message?.toString()}</p>}
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-semibold">Description</label>
              <textarea
                rows={3}
                placeholder="Detailed objectives of the exam"
                {...register("description")}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-semibold">Instructions for Candidates</label>
              <textarea
                rows={3}
                placeholder="e.g. Answer all questions concisely. Avoid plagiarism."
                {...register("instructions")}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Questions Editor */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Award className="text-primary" />
              <span>Questions Panel ({questionFields.length} defined)</span>
            </h3>
            <button
              type="button"
              onClick={() =>
                appendQuestion({
                  question_type: "subjective",
                  question_text: "",
                  reference_answer: "",
                  maximum_marks: 10,
                  concepts: [],
                  keywords: [],
                  options: [],
                })
              }
              className="inline-flex items-center gap-1.5 py-2 px-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-xl transition-all"
            >
              <Plus size={14} />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-6">
            {questionFields.map((field, qIndex) => (
              <div
                key={field.id}
                className="bg-card border border-border p-6 rounded-2xl space-y-4 relative"
              >
                {/* Delete button */}
                {questionFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <h4 className="font-semibold text-primary">Question #{qIndex + 1}</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider">Question Type</label>
                    <select
                      {...register(`questions.${qIndex}.question_type`)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="subjective">Subjective (AI Graded)</option>
                      <option value="mcq">Multiple Choice</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider">Question Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Explain Polymorphism in Java."
                      {...register(`questions.${qIndex}.question_text`)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider">Max Marks</label>
                    <input
                      type="number"
                      placeholder="10"
                      {...register(`questions.${qIndex}.maximum_marks`)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                {watch(`questions.${qIndex}.question_type`) === 'mcq' ? (
                  <div className="md:col-span-3 space-y-3 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider">Options</label>
                    {(watch(`questions.${qIndex}.options`) || []).map((opt: any, optIdx: number) => (
                      <div key={optIdx} className="flex gap-2 items-center">
                        <input
                          type="radio"
                          name={`correct_${qIndex}`}
                          checked={opt.is_correct}
                          onChange={() => {
                            const options = watch(`questions.${qIndex}.options`) || [];
                            options.forEach((_: any, i: number) => setValue(`questions.${qIndex}.options.${i}.is_correct`, i === optIdx));
                          }}
                          className="w-4 h-4 text-primary"
                        />
                        <input
                          type="text"
                          placeholder={`Option ${optIdx + 1}`}
                          {...register(`questions.${qIndex}.options.${optIdx}.option_text`)}
                          className="flex-1 px-3 py-1.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const options = watch(`questions.${qIndex}.options`) || [];
                            setValue(`questions.${qIndex}.options`, options.filter((_: any, i: number) => i !== optIdx));
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const options = watch(`questions.${qIndex}.options`) || [];
                        setValue(`questions.${qIndex}.options`, [...options, { option_text: "", is_correct: false }]);
                      }}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      + Add Option
                    </button>
                  </div>
                ) : (
                  <>
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider">Reference Answer (Evaluative Key)</label>
                    <textarea
                      rows={3}
                      placeholder="Write the ideal correct answer here."
                      {...register(`questions.${qIndex}.reference_answer`)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                {/* Keywords Tags */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider">Key Vocabulary (Keywords)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add keyword (e.g. overload)"
                      value={tempKw[qIndex] || ""}
                      onChange={(e) => setTempKw((prev) => ({ ...prev, [qIndex]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addKeyword(qIndex);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => addKeyword(qIndex)}
                      className="py-1.5 px-3 bg-secondary text-secondary-foreground text-xs rounded-xl hover:bg-secondary/80 font-bold"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(watch(`questions.${qIndex}.keywords`) || []).map((k, kwIdx) => (
                      <span
                        key={kwIdx}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full"
                      >
                        <span>{k.keyword_text}</span>
                        <button
                          type="button"
                          onClick={() => removeKeyword(qIndex, kwIdx)}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Concepts Weights Sliders */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider">Core Concepts & Importance Weight</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add concept (e.g. Method Overriding)"
                      value={tempConcept[qIndex] || ""}
                      onChange={(e) => setTempConcept((prev) => ({ ...prev, [qIndex]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addConcept(qIndex);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => addConcept(qIndex)}
                      className="py-1.5 px-3 bg-secondary text-secondary-foreground text-xs rounded-xl hover:bg-secondary/80 font-bold"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Slider mappings */}
                  <div className="space-y-3 pt-2 max-h-40 overflow-y-auto pr-2">
                    {(watch(`questions.${qIndex}.concepts`) || []).map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/40 border border-border rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground capitalize">
                            {c.concept_text}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeConcept(qIndex, cIdx)}
                            className="text-muted-foreground hover:text-destructive text-xs"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-1/2">
                          <span className="text-xs text-muted-foreground w-10">Weight:</span>
                          <input
                            type="range"
                            min="0.1"
                            max="3.0"
                            step="0.1"
                            value={c.importance_weight}
                            onChange={(e) =>
                              setValue(
                                `questions.${qIndex}.concepts.${cIdx}.importance_weight`,
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-xs font-bold w-8 text-right">
                            {c.importance_weight.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                  </>
                )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Scoring Config */}
      {step === 3 && (
        <div className="bg-card border border-border p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sliders className="text-primary" />
              <span>NLP Scoring Weights Configurations</span>
            </h3>
            <div
              className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                Math.abs(weightsSum - 1.0) < 0.01
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <span>Total: {(weightsSum * 100).toFixed(0)}%</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Configure how the AI calculates the final score for each answer. The total weights sum must equal 100%.
          </p>

          <div className="space-y-6">
            {/* Semantic SBERT */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Semantic Similarity (SBERT)</span>
                <span className="font-bold text-primary">{(watch("scoring_config.semantic_weight") * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                {...register("scoring_config.semantic_weight")}
                className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Grading based on sentence embeddings semantic match.</p>
            </div>

            {/* Concept Coverage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Concept Coverage</span>
                <span className="font-bold text-primary">{(watch("scoring_config.concept_weight") * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                {...register("scoring_config.concept_weight")}
                className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Grading based on matched required concepts and logic blocks.</p>
            </div>

            {/* Keyword Matches */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Key Vocabulary Presence</span>
                <span className="font-bold text-primary">{(watch("scoring_config.keyword_weight") * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                {...register("scoring_config.keyword_weight")}
                className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Grading based on exact key terms and lemmatized synonyms.</p>
            </div>

            {/* TF-IDF */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Lexicon Overlap (TF-IDF)</span>
                <span className="font-bold text-primary">{(watch("scoring_config.tfidf_weight") * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                {...register("scoring_config.tfidf_weight")}
                className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Grading based on TF-IDF cosine matching.</p>
            </div>

            {/* Relevance */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Prompt Relevance</span>
                <span className="font-bold text-primary">{(watch("scoring_config.relevance_weight") * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                {...register("scoring_config.relevance_weight")}
                className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Checks if the candidate text actually answers the prompt topic.</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Review and Publish */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle className="text-emerald-500" />
              <span>Review Examination Specifications</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Exam Title:</span>
                <span className="font-bold">{watch("title")}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Subject:</span>
                <span className="font-bold">{watch("subject") || "General"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Duration:</span>
                <span className="font-bold">{watch("duration")} minutes</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Total Awardable Marks:</span>
                <span className="font-bold text-primary">{watch("total_marks")} Marks</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <h4 className="font-bold text-sm text-primary uppercase">Questions Summary</h4>
            <div className="divide-y divide-border">
              {watchedQuestions.map((q, idx) => (
                <div key={idx} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span>Q{idx + 1}: {q.question_text}</span>
                    <span className="text-primary">{q.maximum_marks} Marks</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-4">
                    <span>Keywords: {q.keywords.map((k) => k.keyword_text).join(", ") || "None"}</span>
                    <span>Concepts: {q.concepts.map((c) => `${c.concept_text} (${c.importance_weight.toFixed(1)})`).join(", ") || "None"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="py-2.5 px-5 bg-card hover:bg-muted border border-border text-foreground font-semibold rounded-xl text-sm transition-all"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 py-2.5 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm transition-all"
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 py-2.5 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Save Examination</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
