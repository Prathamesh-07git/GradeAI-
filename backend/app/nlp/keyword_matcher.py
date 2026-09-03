import spacy
from typing import List, Dict, Any
from backend.app.nlp.preprocessing import nlp, clean_text
from backend.app.nlp.embeddings import embedding_manager

def match_keywords(student_answer: str, expected_keywords: List[str]) -> Dict[str, Any]:
    cleaned_student = clean_text(student_answer)
    if not cleaned_student or not expected_keywords:
        return {
            "matched": [],
            "missing": expected_keywords,
            "score": 0.0,
            "details": []
        }

    doc = nlp(cleaned_student.lower())
    
    # 1. Gather student text tokens and lemmas
    student_tokens = [token.text for token in doc]
    student_lemmas = [token.lemma_ for token in doc]
    student_text_lower = cleaned_student.lower()

    # Get noun chunks to match compound phrases semantically
    student_noun_chunks = [chunk.text for chunk in doc.noun_chunks]

    matched_details = []
    matched_set = set()
    
    for kw in expected_keywords:
        kw_clean = clean_text(kw).lower()
        if not kw_clean:
            continue
            
        kw_doc = nlp(kw_clean)
        kw_tokens = [t.text for t in kw_doc]
        kw_lemmas = [t.lemma_ for t in kw_doc]
        
        # Scenario A: Exact Substring Match
        if kw_clean in student_text_lower:
            matched_details.append({
                "keyword": kw,
                "match_type": "exact",
                "score": 1.0,
                "evidence": kw_clean
            })
            matched_set.add(kw)
            continue
            
        # Scenario B: Lemmatized Match (handles plural, tense changes: "overrides" -> "override")
        # For multi-word keywords, check if all lemmas exist in student lemmas in any order
        all_lemmas_found = all(lemma in student_lemmas for lemma in kw_lemmas)
        if all_lemmas_found:
            # Reconstruct the matching text sequence
            matched_details.append({
                "keyword": kw,
                "match_type": "lemma",
                "score": 1.0,
                "evidence": kw
            })
            matched_set.add(kw)
            continue

        # Scenario C: Semantic/Synonym Match via SBERT
        # Look through noun chunks or sliding windows to find semantically similar phrase
        best_sim = 0.0
        best_chunk = ""
        
        # Check noun chunks first (highly accurate for keywords)
        for chunk in student_noun_chunks:
            sim = embedding_manager.calculate_similarity(kw_clean, chunk)
            if sim > best_sim:
                best_sim = sim
                best_chunk = chunk
                
        # If similarity exceeds threshold (e.g. 0.80), we count it as a partial/semantic match
        if best_sim >= 0.80:
            matched_details.append({
                "keyword": kw,
                "match_type": "semantic",
                "score": round(best_sim, 2),
                "evidence": best_chunk
            })
            matched_set.add(kw)
            continue
            
    # Calculate score
    missing = [kw for kw in expected_keywords if kw not in matched_set]
    
    # Combined score is sum of matched scores divided by total expected
    total_score = sum(item["score"] for item in matched_details)
    keyword_score = total_score / len(expected_keywords) if expected_keywords else 1.0

    return {
        "matched": matched_details,
        "missing": missing,
        "score": round(keyword_score, 4),
    }
