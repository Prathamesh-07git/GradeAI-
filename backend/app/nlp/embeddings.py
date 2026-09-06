import torch
import gc
from sentence_transformers import SentenceTransformer, util
from backend.app.config import settings

# Limit PyTorch thread allocation to conserve CPU & memory on small cloud containers
try:
    torch.set_num_threads(1)
except Exception:
    pass

class EmbeddingModelManager:
    _instance = None
    _model = None
    _cache = {}
    _MAX_CACHE_SIZE = 128

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(EmbeddingModelManager, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    @property
    def model(self):
        if self._model is None:
            print(f"Loading SentenceTransformer model '{settings.SENTENCE_TRANSFORMER_MODEL}' in low-memory mode...")
            try:
                self._model = SentenceTransformer(settings.SENTENCE_TRANSFORMER_MODEL)
            except Exception as e:
                print(f"Error loading SBERT model: {e}")
                self._model = None
        return self._model

    def encode(self, text: str):
        if not text:
            return None
        text_clean = text.strip()
        if text_clean in self._cache:
            return self._cache[text_clean]
            
        model = self.model
        if model is None:
            return None
            
        with torch.no_grad():
            emb = model.encode(text_clean, convert_to_tensor=True, show_progress_bar=False)
            emb = emb.detach().cpu()
            
        if len(self._cache) >= self._MAX_CACHE_SIZE:
            # Evict cache to prevent unbounded memory growth
            self._cache.clear()
            gc.collect()

        self._cache[text_clean] = emb
        return emb

    def calculate_similarity(self, text1: str, text2: str) -> float:
        if not text1 or not text2:
            return 0.0
        model = self.model
        if model is None:
            return 0.0
            
        emb1 = self.encode(text1)
        emb2 = self.encode(text2)
        if emb1 is None or emb2 is None:
            return 0.0
            
        with torch.no_grad():
            sim = util.cos_sim(emb1, emb2)
            val = float(sim.item())
            
        return val

    def clear_cache(self):
        self._cache.clear()
        gc.collect()

embedding_manager = EmbeddingModelManager()
