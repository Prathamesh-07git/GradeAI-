import spacy
from sentence_transformers import SentenceTransformer, util
import re

# Load models globally so they are cached in memory for the Flask app
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = None # Fallback if not downloaded yet

print("Loading SentenceTransformer model in memory... (This takes a few seconds on startup)")
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

def extract_list(text_string):
    if not text_string:
        return []
    # Split by comma and clean
    return [k.strip().lower() for k in text_string.split(',') if k.strip()]

def evaluate_answer(student_answer, reference_answer, keywords_str, concepts_str, max_marks):
    if not student_answer.strip():
        return {
            "marks": 0,
            "feedback": "No answer provided.",
            "confidence": 100.0,
            "matched_keywords": [],
            "missing_keywords": extract_list(keywords_str)
        }
        
    if model is None:
        return {
            "marks": 0,
            "feedback": "NLP Model is currently loading or unavailable. Please try again later.",
            "confidence": 0.0,
            "matched_keywords": [],
            "missing_keywords": []
        }

    # 1. Semantic Similarity using SBERT
    embeddings1 = model.encode(student_answer, convert_to_tensor=True)
    embeddings2 = model.encode(reference_answer, convert_to_tensor=True)
    cosine_scores = util.cos_sim(embeddings1, embeddings2)
    semantic_score = cosine_scores.item() # float

    # Normalize semantic score to 0-1
    semantic_score = max(0.0, semantic_score)

    # 2. Keyword Matching
    expected_keywords = extract_list(keywords_str)
    student_text_lower = student_answer.lower()
    
    matched_keywords = []
    missing_keywords = []
    
    for kw in expected_keywords:
        # basic substring check for keywords
        if kw in student_text_lower:
            matched_keywords.append(kw)
        else:
            missing_keywords.append(kw)
            
    keyword_score = len(matched_keywords) / len(expected_keywords) if expected_keywords else 1.0

    # 3. Concept Matching
    expected_concepts = extract_list(concepts_str)
    missing_concepts = []
    for concept in expected_concepts:
        # using basic string match for prototype, advanced would use NER or dependency parsing
        if concept not in student_text_lower:
            missing_concepts.append(concept)

    # 4. Final Scoring Algorithm
    # 70% weight to semantic meaning, 30% to exact keywords presence
    final_percentage = (0.7 * semantic_score) + (0.3 * keyword_score)
    marks_awarded = round(final_percentage * max_marks, 1)
    
    # 5. Explainable Feedback Generation
    feedback_lines = []
    if semantic_score > 0.85:
        feedback_lines.append("Excellent understanding of the core topic.")
    elif semantic_score > 0.5:
        feedback_lines.append("Good understanding, but the explanation could be more precise.")
    else:
        feedback_lines.append("The answer deviates significantly from the expected meaning.")

    if missing_keywords:
        feedback_lines.append(f"You missed some important keywords: {', '.join(missing_keywords)}.")
    
    if missing_concepts:
        feedback_lines.append(f"Try to cover these concepts next time: {', '.join(missing_concepts)}.")

    feedback = " ".join(feedback_lines)
    confidence = round(semantic_score * 100, 2)

    return {
        "marks": min(marks_awarded, max_marks),
        "feedback": feedback,
        "confidence": confidence,
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords
    }
