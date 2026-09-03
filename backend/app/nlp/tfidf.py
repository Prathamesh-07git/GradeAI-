from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.app.nlp.preprocessing import clean_text

def calculate_tfidf_similarity(student_answer: str, reference_answer: str) -> float:
    cleaned_student = clean_text(student_answer)
    cleaned_ref = clean_text(reference_answer)
    
    if not cleaned_student.strip() or not cleaned_ref.strip():
        return 0.0

    try:
        # Initialize Vectorizer
        vectorizer = TfidfVectorizer(stop_words='english')
        
        # Fit and transform reference and student text
        tfidf_matrix = vectorizer.fit_transform([cleaned_ref, cleaned_student])
        
        # Calculate Cosine Similarity between reference (index 0) and student (index 1)
        sim_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        score = float(sim_matrix[0][0])
        
        # Keep within valid 0.0 - 1.0 boundaries
        return max(0.0, min(1.0, score))
    except Exception as e:
        print(f"Error calculating TF-IDF similarity: {e}")
        return 0.0
