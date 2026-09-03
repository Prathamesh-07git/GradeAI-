import pytest
from backend.app.nlp.preprocessing import clean_text, segment_sentences, preprocess_and_tokenize
from backend.app.nlp.keyword_matcher import match_keywords
from backend.app.nlp.tfidf import calculate_tfidf_similarity
from backend.app.nlp.concept_matcher import match_concepts, detect_negation
from backend.app.nlp.relevance import calculate_relevance
from backend.app.nlp.scoring import calculate_final_grade
from backend.app.nlp.feedback import calculate_confidence, generate_explainable_feedback

def test_text_cleaning():
    text = "Hello\u00A0World!   This is a   test. "
    cleaned = clean_text(text)
    assert cleaned == "Hello World! This is a test."

def test_sentence_segmentation():
    text = "Polymorphism is a core concept. It allows multiple forms of methods. Do not write incorrect logic."
    sentences = segment_sentences(text)
    assert len(sentences) == 3
    assert sentences[0] == "Polymorphism is a core concept."

def test_negations_preservation():
    text = "We should not override methods without permission."
    tokens = preprocess_and_tokenize(text)
    # Ensure negations are preserved as lemmas
    assert "not" in tokens
    assert "without" in tokens
    # Ensure normal stopwords are removed
    assert "should" not in tokens

def test_detect_negation():
    assert detect_negation("This is not correct") is True
    assert detect_negation("Polymorphism is overrides") is False

def test_keyword_matching():
    student_ans = "We use method overloading and overriding in java."
    expected = ["overloading", "overriding", "inheritance"]
    result = match_keywords(student_ans, expected)
    
    assert "overloading" in [m["keyword"] for m in result["matched"]]
    assert "overriding" in [m["keyword"] for m in result["matched"]]
    assert "inheritance" in result["missing"]
    assert result["score"] == pytest.approx(2/3, 0.05)

def test_tfidf_cosine_similarity():
    student = "method overloading allows writing multiple functions with same name but different parameters"
    reference = "method overloading means defining multiple methods with the same name but different signatures"
    score = calculate_tfidf_similarity(student, reference)
    assert score > 0.3
    assert score <= 1.0

def test_concept_matching_and_negations():
    student = "Method overriding is when a subclass redefines a parent class function. However, overloading is not inheritance."
    concepts = [
        {"id": 1, "concept_text": "Method overriding", "importance_weight": 1.0},
        {"id": 2, "concept_text": "method overloading is not inheritance", "importance_weight": 0.5}
    ]
    result = match_concepts(student, concepts)
    
    overriding_match = next((c for c in result["concepts"] if c["concept_id"] == 1), None)
    overloading_match = next((c for c in result["concepts"] if c["concept_id"] == 2), None)
    
    assert overriding_match is not None
    assert overriding_match["status"] == "present"
    assert overriding_match["evidence_sentence"] is not None
    
    assert overloading_match is not None
    assert overloading_match["status"] == "incorrect"  # flagged due to negation "not"

def test_relevance_score():
    student = "Method overloading allows multiple methods with same name."
    question = "Explain polymorphism in Java."
    reference = "Polymorphism means multiple forms. Method overloading and method overriding are examples."
    
    # Run relevance calculation
    score = calculate_relevance(student, question, reference, concept_score=0.8)
    assert score >= 0.0
    assert score <= 1.0

def test_scoring_weights():
    # Test scoring normalization and combination
    res = calculate_final_grade(
        semantic_score=0.8,
        concept_score=0.9,
        keyword_score=0.7,
        tfidf_score=0.6,
        relevance_score=0.9,
        max_marks=10.0
    )
    # Default weights: 35% sem, 30% con, 15% key, 10% tfidf, 10% rel
    expected_score = (0.8 * 0.35) + (0.9 * 0.30) + (0.7 * 0.15) + (0.6 * 0.10) + (0.9 * 0.10)
    assert res["final_score"] == pytest.approx(expected_score, 0.01)
    assert res["marks"] == pytest.approx(expected_score * 10.0, 0.1)

def test_confidence_grading():
    concept_matches = [{"status": "present", "confidence": 0.9}]
    conf = calculate_confidence(
        semantic_score=0.8,
        concept_score=0.9,
        keyword_score=0.8,
        tfidf_score=0.7,
        relevance_score=0.9,
        concept_matches=concept_matches,
        student_answer="This is a long student answer that explains polymorphism in detail.",
        reference_answer="This is the reference answer."
    )
    assert conf >= 10.0
    assert conf <= 100.0
