import os

class Config:
    # Use an environment variable for secret key in production
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-this-in-production'
    
    # Path to the SQLite database
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DATABASE = os.path.join(BASE_DIR, 'database', 'database.db')
    
    # NLP Model configs
    SENTENCE_TRANSFORMER_MODEL = 'all-MiniLM-L6-v2'
