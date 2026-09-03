import os
import subprocess
import nltk
from sentence_transformers import SentenceTransformer

def setup_nlp_models():
    print("Downloading NLTK data...")
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('wordnet')
    nltk.download('punkt_tab')

    print("Downloading spaCy model (en_core_web_sm)...")
    try:
        import spacy
        if not spacy.util.is_package("en_core_web_sm"):
            subprocess.check_call(["python", "-m", "spacy", "download", "en_core_web_sm"])
            print("spaCy model downloaded.")
        else:
            print("spaCy model already present.")
    except Exception as e:
        print(f"Error downloading spaCy model: {e}")

    print("Pre-caching SentenceTransformers model (all-MiniLM-L6-v2)...")
    # This will download and cache the model locally if not already present
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("All NLP models are successfully set up and cached locally!")

if __name__ == "__main__":
    setup_nlp_models()
