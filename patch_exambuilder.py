import re
import os

filepath = r"c:\Users\ASUS\OneDrive\Desktop\NLP TAE\auto-grading-nlp\frontend\src\features\exams\ExamBuilder.tsx"
with open(filepath, 'r') as f:
    content = f.read()

# 1. Update schema
schema_target = """      question_text: z.string().min(1, "Question text is required"),
      reference_answer: z.string().min(1, "Reference answer is required"),
      maximum_marks: z.coerce.number().min(1, "Maximum marks must be greater than 0"),"""
schema_replacement = """      question_type: z.enum(["subjective", "mcq"]).default("subjective"),
      question_text: z.string().min(1, "Question text is required"),
      reference_answer: z.string().optional(),
      maximum_marks: z.coerce.number().min(1, "Maximum marks must be greater than 0"),
      options: z.array(
        z.object({
          option_text: z.string().min(1, "Option text is required"),
          is_correct: z.boolean().default(false),
        })
      ).optional(),"""
content = content.replace(schema_target, schema_replacement)

# 2. Update defaultValues
default_target = """        {
          question_text: "",
          reference_answer: "",
          maximum_marks: 10,
          concepts: [],
          keywords: [],
        },"""
default_replacement = """        {
          question_type: "subjective",
          question_text: "",
          reference_answer: "",
          maximum_marks: 10,
          concepts: [],
          keywords: [],
          options: [],
        },"""
content = content.replace(default_target, default_replacement)

# 3. Update appendQuestion payload
append_target = """                  question_text: "",
                  reference_answer: "",
                  maximum_marks: 10,
                  concepts: [],
                  keywords: [],"""
append_replacement = """                  question_type: "subjective",
                  question_text: "",
                  reference_answer: "",
                  maximum_marks: 10,
                  concepts: [],
                  keywords: [],
                  options: [],"""
content = content.replace(append_target, append_replacement)

# 4. Add Question Type to UI before Question Text
type_ui = """                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider">Question Type</label>
                    <select
                      {...register(`questions.${qIndex}.question_type`)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="subjective">Subjective (AI Graded)</option>
                      <option value="mcq">Multiple Choice</option>
                    </select>
                  </div>
"""
qtext_target = """                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider">Question Text</label>"""
if type_ui not in content:
    content = content.replace(qtext_target, type_ui + "\n" + qtext_target)

# 5. Wrap Reference Answer, Keywords, Concepts inside subjective check
# We need to find the start of Reference Answer and end of Concepts
ref_start = """                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider">Reference Answer (Evaluative Key)</label>"""

concept_end = """                      </div>
                    ))}
                  </div>
                </div>"""

# Replace all of that with a conditional
mcq_ui = """                {watch(`questions.${qIndex}.question_type`) === 'mcq' ? (
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
"""

end_wrapper = """
                  </>
                )}"""

# It's tricky to replace a huge chunk accurately if spacing is slightly off. Let's do it safely.
if mcq_ui not in content:
    content = content.replace(ref_start, mcq_ui + ref_start)
    content = content.replace(concept_end, concept_end + end_wrapper)


with open(filepath, 'w') as f:
    f.write(content)

print("Patch applied.")
