import numpy as np
from typing import List, Dict, Any

def calculate_confidence(
    semantic_score: float,
    concept_score: float,
    keyword_score: float,
    tfidf_score: float,
    relevance_score: float,
    concept_matches: List[Dict[str, Any]],
    student_answer: str,
    reference_answer: str
) -> float:
    """
    Computes an evaluation confidence percentage indicating grading reliability.
    """
    # 1. Agreement factor (consistency across grading methods)
    scores = [semantic_score, concept_score, keyword_score, tfidf_score, relevance_score]
    # Standard deviation: Higher standard deviation means models disagree, lowering confidence
    std_dev = float(np.std(scores))
    agreement_factor = max(0.0, 1.0 - (std_dev * 2.0))  # scale standard deviation penalty

    # 2. Concept matching certainty
    # Take mean confidence of all non-missing matched concepts
    matched_con_confidences = [
        c["confidence"] for c in concept_matches if c["status"] in ("present", "partially_present", "incorrect")
    ]
    concept_confidence = float(np.mean(matched_con_confidences)) if matched_con_confidences else 0.80

    # 3. Answer length adequacy
    # If the student answer is extremely short compared to the reference key, decrease confidence
    student_len = len(student_answer.split())
    ref_len = len(reference_answer.split())
    
    length_ratio = student_len / ref_len if ref_len > 0 else 1.0
    length_penalty = 1.0
    if length_ratio < 0.15:
        length_penalty = 0.6  # heavy penalty for extremely short replies
    elif length_ratio < 0.35:
        length_penalty = 0.85

    # 4. Combine factors
    # 40% Agreement, 40% Concept Certainty, 20% Relevance
    raw_confidence = (0.40 * agreement_factor) + (0.40 * concept_confidence) + (0.20 * relevance_score)
    final_confidence = raw_confidence * length_penalty * 100.0
    
    # Cap between 10% and 100%
    return round(max(10.0, min(100.0, final_confidence)), 2)

def generate_explainable_feedback(
    marks_percentage: float,
    semantic_score: float,
    concept_matches: List[Dict[str, Any]],
    keyword_matches: List[Dict[str, Any]],
    missing_keywords: List[str]
) -> str:
    """
    Constructs explainable feedback detailing strengths, gaps, and improvements.
    """
    feedback_parts = []
    
    # 1. Macro evaluation
    if marks_percentage >= 0.85:
        feedback_parts.append("Excellent answer! You have demonstrated a thorough understanding of the question.")
    elif marks_percentage >= 0.70:
        feedback_parts.append("Good answer. You covered the main concepts well, though some phrasing could be slightly more precise.")
    elif marks_percentage >= 0.45:
        feedback_parts.append("Average attempt. You referenced some core elements but missed key conceptual components.")
    else:
        feedback_parts.append("The answer deviates significantly from the expected response or lacks required concepts.")

    # 2. Concept Evidence Strengths
    present_concepts = [c["concept_text"] for c in concept_matches if c["status"] == "present"]
    if present_concepts:
        feedback_parts.append(f"Strengths: You correctly explained the concepts of: {', '.join(present_concepts)}.")

    # 3. Missing/Partial Concepts Gaps
    missing_concepts = [c["concept_text"] for c in concept_matches if c["status"] == "missing"]
    partial_concepts = [c["concept_text"] for c in concept_matches if c["status"] == "partially_present"]
    incorrect_concepts = [c["concept_text"] for c in concept_matches if c["status"] == "incorrect"]

    if missing_concepts or partial_concepts or incorrect_concepts:
        gap_details = []
        if missing_concepts:
            gap_details.append(f"missing these concepts: {', '.join(missing_concepts)}")
        if partial_concepts:
            gap_details.append(f"only partially addressing: {', '.join(partial_concepts)}")
        if incorrect_concepts:
            gap_details.append(f"potentially contradicting or incorrectly expressing: {', '.join(incorrect_concepts)}")
            
        feedback_parts.append(f"Areas to improve: Try to focus on {'; and '.join(gap_details)}.")

    # 4. Keywords
    if missing_keywords and len(missing_keywords) <= 4:
        feedback_parts.append(f"Vocabulary check: Remember to include these key terms: {', '.join(missing_keywords)}.")
        
    return " ".join(feedback_parts)
