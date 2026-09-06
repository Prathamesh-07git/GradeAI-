import spacy
from typing import List, Dict, Any
from backend.app.nlp.preprocessing import segment_sentences, clean_text
from backend.app.nlp.embeddings import embedding_manager

# Standard negation terms to scan
NEGATION_WORDS = {"not", "never", "no", "cannot", "without", "neither", "nor", "fail"}

def detect_negation(sentence: str) -> bool:
    """
    Checks if a sentence contains negation keywords,
    suggesting a potential contradiction of terms.
    """
    words = set(clean_text(sentence).lower().split())
    return not words.isdisjoint(NEGATION_WORDS)

def calculate_rule_based_similarity(concept: str, sentence: str) -> float:
    """
    Checks if the concept is directly referenced or described in the sentence
    using custom keyword heuristics and stemming overlap.
    Returns 1.0 if matched, 0.0 otherwise.
    """
    concept = concept.lower().strip()
    sentence = sentence.lower().strip()
    
    # 1. Direct substring match
    if concept in sentence:
        return 1.0
        
    # 2. Specific Java OOP concept rule expansions (handle synonyms/phrasings)
    if concept == "code reuse":
        if any(w in sentence for w in ["reuse", "reusability", "reusing"]):
            return 1.0
            
    if concept == "class hierarchy":
        if any(w in sentence for w in ["hierarchy", "hierarchical"]):
            return 1.0
        if "subclass" in sentence and "superclass" in sentence:
            return 1.0
        if "child class" in sentence and "parent class" in sentence:
            return 1.0
            
    if concept == "parent-child relationship":
        if "parent" in sentence and "child" in sentence:
            return 1.0
        if "superclass" in sentence and "subclass" in sentence:
            return 1.0
            
    if concept == "dynamic binding":
        if "dynamic" in sentence or "dynamically" in sentence:
            if any(w in sentence for w in ["bind", "binding", "override", "overriding", "runtime", "polymorphism", "resolve", "call"]):
                return 1.0
        if "runtime polymorphism" in sentence or "late binding" in sentence:
            return 1.0
            
    if concept == "static binding":
        if "static" in sentence or "statically" in sentence:
            if any(w in sentence for w in ["bind", "binding", "overload", "overloading", "compile", "early"]):
                return 1.0
        if "compile-time polymorphism" in sentence or "early binding" in sentence:
            return 1.0
            
    if concept == "overloaded methods":
        if any(w in sentence for w in ["overload", "overloading", "overloaded"]):
            return 1.0
            
    if concept == "overridden methods":
        if any(w in sentence for w in ["override", "overriding", "overridden"]):
            return 1.0

    # 3. Generic stem-subset match (using PorterStemmer)
    try:
        from nltk.stem import PorterStemmer
        import re
        stemmer = PorterStemmer()
        
        stopwords = {"and", "or", "in", "of", "the", "a", "an", "to", "is", "are", "was", "were", "relationship", "method", "methods"}
        c_words = re.findall(r'[a-zA-Z0-9]+', concept)
        s_words = re.findall(r'[a-zA-Z0-9]+', sentence)
        
        c_stems = {stemmer.stem(w) for w in c_words if w not in stopwords}
        s_stems = {stemmer.stem(w) for w in s_words if w not in stopwords}
        
        if c_stems and c_stems.issubset(s_stems):
            return 1.0
    except Exception:
        pass
        
    return 0.0

def match_concepts(student_answer: str, expected_concepts: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Matches student sentences to reference concepts.
    expected_concepts is a list of dicts: [{"id": int, "concept_text": str, "importance_weight": float}]
    """
    if not expected_concepts:
        return {
            "concepts": [],
            "score": 1.0
        }
    if not student_answer.strip():
        return {
            "concepts": [],
            "score": 0.0
        }

    # 1. Segment student answer into individual sentences
    student_sentences = segment_sentences(student_answer)
    
    matched_concepts = []
    weighted_score_numerator = 0.0
    weighted_score_denominator = 0.0

    for concept_item in expected_concepts:
        concept_id = concept_item.get("id")
        concept_text = concept_item.get("concept_text", "")
        weight = concept_item.get("importance_weight", 1.0)
        
        weighted_score_denominator += weight
        
        best_sim = 0.0
        best_sent = ""
        
        # A. Calculate rule-based similarity first
        for sent in student_sentences:
            rule_sim = calculate_rule_based_similarity(concept_text, sent)
            if rule_sim > best_sim:
                best_sim = rule_sim
                best_sent = sent
                
        # B. If no perfect rule-based match, fall back to SBERT cosine similarity
        if best_sim < 1.0:
            for sent in student_sentences:
                sim = embedding_manager.calculate_similarity(concept_text.lower(), sent)
                if sim > best_sim:
                    best_sim = sim
                    best_sent = sent
                    
        # Determine status and confidence based on similarity thresholds
        status = "missing"
        evidence = None
        score_contrib = 0.0
        
        if best_sim >= 0.68:
            # Check for contradiction/negation
            if best_sent and detect_negation(best_sent):
                status = "incorrect"
                score_contrib = 0.0
                evidence = best_sent
            else:
                status = "present"
                score_contrib = 1.0
                evidence = best_sent
        elif best_sim >= 0.48:
            if best_sent and detect_negation(best_sent):
                status = "incorrect"
                score_contrib = 0.0
                evidence = best_sent
            else:
                status = "partially_present"
                score_contrib = 0.5
                evidence = best_sent
        else:
            status = "missing"
            score_contrib = 0.0
            evidence = None
            
        weighted_score_numerator += score_contrib * weight
        
        matched_concepts.append({
            "concept_id": concept_id,
            "concept_text": concept_text,
            "status": status,
            "confidence": round(best_sim, 4),
            "evidence_sentence": evidence
        })
        
    concept_score = (
        weighted_score_numerator / weighted_score_denominator
        if weighted_score_denominator > 0
        else 1.0
    )

    return {
        "concepts": matched_concepts,
        "score": round(concept_score, 4)
    }
