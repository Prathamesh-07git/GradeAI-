from typing import Dict, Any
from backend.app.models.models import ScoringConfiguration

def get_normalized_score(value: float) -> float:
    return max(0.0, min(1.0, float(value)))

def calculate_final_grade(
    semantic_score: float,
    concept_score: float,
    keyword_score: float,
    tfidf_score: float,
    relevance_score: float,
    max_marks: float,
    config: ScoringConfiguration = None
) -> Dict[str, Any]:
    """
    Combines individual NLP scores using configuration weights.
    All incoming scores are assumed to be normalized (0.0 - 1.0).
    """
    # 1. Fetch weights
    if config:
        w_sem = config.semantic_weight
        w_con = config.concept_weight
        w_key = config.keyword_weight
        w_tfidf = config.tfidf_weight
        w_rel = config.relevance_weight
    else:
        # Default weights from requirement 26
        w_sem = 0.35
        w_con = 0.30
        w_key = 0.15
        w_tfidf = 0.10
        w_rel = 0.10

    # Ensure weights sum to 1.0
    total_w = w_sem + w_con + w_key + w_tfidf + w_rel
    if abs(total_w - 1.0) > 1e-4:
        w_sem /= total_w
        w_con /= total_w
        w_key /= total_w
        w_tfidf /= total_w
        w_rel /= total_w

    # 2. Normalize components
    sem = get_normalized_score(semantic_score)
    con = get_normalized_score(concept_score)
    key = get_normalized_score(keyword_score)
    tfidf = get_normalized_score(tfidf_score)
    rel = get_normalized_score(relevance_score)

    # 3. Calculate final weighted score
    final_score = (
        (sem * w_sem) +
        (con * w_con) +
        (key * w_key) +
        (tfidf * w_tfidf) +
        (rel * w_rel)
    )
    final_score = get_normalized_score(final_score)

    # HARD ZERO RULE: Only trigger if student shows no concept, keyword, AND semantic relevance
    if con < 0.05 and key < 0.05 and sem < 0.35:
        final_score = 0.0

    # Smart Grade Boosting:
    # If the student hit 100% of concepts and keywords, their answer is fundamentally correct.
    # Semantic and TF-IDF variance shouldn't penalize them.
    if con >= 0.99 and key >= 0.99:
        final_score = 1.0
    # If they got most of the concepts/keywords, give a slight generous boost to offset strict TF-IDF
    elif con >= 0.8 and key >= 0.8:
        final_score = min(1.0, final_score * 1.08)

    # 4. Award marks
    # We round to half-marks for a cleaner output (e.g., 9.5, 10.0 instead of 9.1)
    marks_awarded = round((final_score * max_marks) * 2) / 2

    return {
        "final_score": round(final_score, 4),
        "marks": min(marks_awarded, max_marks),
        "weights": {
            "semantic": w_sem,
            "concept": w_con,
            "keyword": w_key,
            "tfidf": w_tfidf,
            "relevance": w_rel
        }
    }
