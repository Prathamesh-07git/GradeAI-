from typing import List, Dict, Any
from backend.app.nlp.preprocessing import clean_text, is_meaningful_answer
from backend.app.nlp.embeddings import embedding_manager
from backend.app.nlp.keyword_matcher import match_keywords
from backend.app.nlp.tfidf import calculate_tfidf_similarity
from backend.app.nlp.concept_matcher import match_concepts
from backend.app.nlp.relevance import calculate_relevance
from backend.app.nlp.scoring import calculate_final_grade
from backend.app.nlp.feedback import calculate_confidence, generate_explainable_feedback
from backend.app.models.models import ScoringConfiguration

def evaluate_student_answer(
    student_answer: str,
    question_text: str,
    reference_answer: str,
    expected_keywords: List[str],
    expected_concepts: List[Dict[str, Any]],
    max_marks: float,
    config: ScoringConfiguration = None
) -> Dict[str, Any]:
    """
    Orchestrates the modular NLP evaluation pipeline for a student response.
    """
    cleaned_student = clean_text(student_answer)
    if not cleaned_student.strip():
        return {
            "keyword_score": 0.0,
            "tfidf_score": 0.0,
            "semantic_score": 0.0,
            "concept_score": 0.0,
            "relevance_score": 0.0,
            "final_score": 0.0,
            "marks": 0.0,
            "confidence": 100.0,
            "feedback": "No answer provided.",
            "concepts": [],
            "keywords": []
        }
        
    if not is_meaningful_answer(cleaned_student):
        return {
            "keyword_score": 0.0,
            "tfidf_score": 0.0,
            "semantic_score": 0.0,
            "concept_score": 0.0,
            "relevance_score": 0.0,
            "final_score": 0.0,
            "marks": 0.0,
            "confidence": 100.0,
            "feedback": "The response is meaningless, gibberish, or completely unrelated to the question.",
            "concepts": [],
            "keywords": []
        }


    # 1. Semantic Similarity using SBERT
    semantic_score = embedding_manager.calculate_similarity(cleaned_student, reference_answer)
    semantic_score = max(0.0, semantic_score)

    # 2. Keyword Coverage Matcher
    kw_result = match_keywords(cleaned_student, expected_keywords)
    keyword_score = kw_result["score"]

    # 3. TF-IDF Vocabulary Overlap
    tfidf_score = calculate_tfidf_similarity(cleaned_student, reference_answer)

    # 4. Concept Coverage Map
    concept_result = match_concepts(cleaned_student, expected_concepts)
    concept_score = concept_result["score"]

    # 5. Prompt Relevance
    relevance_score = calculate_relevance(
        cleaned_student, question_text, reference_answer, concept_score
    )

    # 6. Final Score Calculation (Scoring Engine)
    grading = calculate_final_grade(
        semantic_score=semantic_score,
        concept_score=concept_score,
        keyword_score=keyword_score,
        tfidf_score=tfidf_score,
        relevance_score=relevance_score,
        max_marks=max_marks,
        config=config
    )

    # 7. Confidence score calculation
    confidence = calculate_confidence(
        semantic_score=semantic_score,
        concept_score=concept_score,
        keyword_score=keyword_score,
        tfidf_score=tfidf_score,
        relevance_score=relevance_score,
        concept_matches=concept_result["concepts"],
        student_answer=cleaned_student,
        reference_answer=reference_answer
    )

    # 8. Explainable AI feedback generation
    feedback = generate_explainable_feedback(
        marks_percentage=grading["final_score"],
        semantic_score=semantic_score,
        concept_matches=concept_result["concepts"],
        keyword_matches=kw_result["matched"],
        missing_keywords=kw_result["missing"]
    )

    return {
        "keyword_score": round(keyword_score, 4),
        "tfidf_score": round(tfidf_score, 4),
        "semantic_score": round(semantic_score, 4),
        "concept_score": round(concept_score, 4),
        "relevance_score": round(relevance_score, 4),
        "final_score": grading["final_score"],
        "marks": grading["marks"],
        "confidence": confidence,
        "feedback": feedback,
        "concepts": concept_result["concepts"],
        "keywords": kw_result["matched"]
    }
