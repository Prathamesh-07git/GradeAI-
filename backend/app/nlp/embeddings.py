from sentence_transformers import SentenceTransformer, util
from backend.app.config import settings

class EmbeddingModelManager:
    _instance = None
    _model = None
    _cache = {}

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(EmbeddingModelManager, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    @property
    def model(self):
        if self._model is None:
            print(f"Loading SentenceTransformer model '{settings.SENTENCE_TRANSFORMER_MODEL}' in memory...")
            try:
                self._model = SentenceTransformer(settings.SENTENCE_TRANSFORMER_MODEL)
            except Exception as e:
                print(f"Error loading SBERT model: {e}")
                self._model = None
        return self._model

    def encode(self, text, convert_to_tensor=True):
        if not text:
            return None
        cache_key = (text, convert_to_tensor)
        if cache_key in self._cache:
            return self._cache[cache_key]
            
        model = self.model
        if model is None:
            return None
        emb = model.encode(text, convert_to_tensor=convert_to_tensor)
        self._cache[cache_key] = emb
        return emb

    def calculate_similarity(self, text1: str, text2: str) -> float:
        if self.model is None:
            return 0.0
        emb1 = self.encode(text1, convert_to_tensor=True)
        emb2 = self.encode(text2, convert_to_tensor=True)
        if emb1 is None or emb2 is None:
            return 0.0
        return float(util.cos_sim(emb1, emb2).item())

embedding_manager = EmbeddingModelManager()
