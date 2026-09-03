from backend.app.nlp.embeddings import embedding_manager
from backend.app.nlp.preprocessing import clean_text

def calculate_relevance(
    student_answer: str,
    question_text: str,
    reference_answer: str,
    concept_score: float
) -> float:
    cleaned_student = clean_text(student_answer)
    cleaned_quest = clean_text(question_text)
    cleaned_ref = clean_text(reference_answer)
    
    if not cleaned_student.strip():
        return 0.0
        
    # Calculate similarity to the prompt question
    sim_to_question = embedding_manager.calculate_similarity(cleaned_student, cleaned_quest)
    
    # Calculate similarity to the reference key
    sim_to_reference = embedding_manager.calculate_similarity(cleaned_student, cleaned_ref)
    
    # Normalize cosine values to 0.0 - 1.0
    sim_q = max(0.0, sim_to_question)
    sim_r = max(0.0, sim_to_reference)
    
    # A standard relevance blend:
    # 40% Question Similarity, 40% Reference Similarity, 20% Concept Coverage
    relevance_score = (0.40 * sim_q) + (0.40 * sim_r) + (0.20 * concept_score)
    
    # Penalty: If both similarities are extremely low, it's highly irrelevant text (e.g. gibberish)
    if sim_q < 0.20 and sim_r < 0.25:
        relevance_score *= 0.2
        
    return max(0.0, min(1.0, relevance_score))
