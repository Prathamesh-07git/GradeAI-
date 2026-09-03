import spacy
import unicodedata
import re
from typing import List

# Load spaCy English model. Fall back and download if missing.
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import subprocess
    import sys
    print("Downloading spaCy en_core_web_sm model...")
    subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"], check=True)
    nlp = spacy.load("en_core_web_sm")

# Words we want to protect during stopword removal because they modify semantic meaning
NEGATIONS_AND_CONNECTORS = {
    "not", "never", "no", "none", "neither", "nor", 
    "without", "against", "but", "however", "although", "except"
}

def clean_text(text: str) -> str:
    if not text:
        return ""
    # 1. Unicode normalization
    text = unicodedata.normalize("NFKC", text)
    # 2. Whitespace normalization
    text = re.sub(r"\s+", " ", text).strip()
    return text

def is_meaningful_answer(text: str) -> bool:
    cleaned = clean_text(text)
    if not cleaned:
        return False
    
    # Check for keyboard smashing (vowel ratio)
    vowels = set("aeiouyAEIOUY")
    alpha_chars = [c for c in cleaned if c.isalpha()]
    if alpha_chars:
        vowel_count = sum(1 for c in alpha_chars if c in vowels)
        if vowel_count / len(alpha_chars) < 0.15:
            return False
            
    # Check for repetition
    words = cleaned.lower().split()
    if not words:
        return False
    unique_words = set(words)
    if len(words) >= 4 and len(unique_words) <= 2:
        return False
        
    # Long words (keyboard smashing without spaces)
    if any(len(w) > 25 for w in words):
        return False

    # Single character spam (e.g. "aaaaaaa")
    if len(words) == 1 and len(words[0]) > 2:
        if len(set(words[0])) == 1:
            return False
            
    return True

def segment_sentences(text: str) -> List[str]:
    cleaned = clean_text(text)
    if not cleaned:
        return []
    doc = nlp(cleaned)
    return [sent.text.strip() for sent in doc.sents]

def preprocess_and_tokenize(text: str) -> List[str]:
    """
    Cleans, tokenizes, filters out standard stopwords (except negation terms),
    and returns lemmatized string tokens.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return []
    
    doc = nlp(cleaned.lower())
    tokens = []
    
    for token in doc:
        # Filter punctuation, space, and standard stopwords (except negations)
        if token.is_punct or token.is_space:
            continue
        
        if token.is_stop and token.text not in NEGATIONS_AND_CONNECTORS:
            continue
            
        tokens.append(token.lemma_)
        
    return tokens

def get_doc_lemmas_with_positions(text: str):
    """
    Returns list of tuples (token_text, lemma_text, start_char, end_char)
    useful for highlighting and granular phrase matching.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return []
    doc = nlp(cleaned.lower())
    return [
        (t.text, t.lemma_, t.idx, t.idx + len(t.text))
        for t in doc
        if not t.is_punct and not t.is_space
    ]
