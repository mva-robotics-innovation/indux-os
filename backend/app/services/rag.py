import fitz, docx
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def extract_text(path: str, file_type: str):
    text = ""
    pages = 1
    if file_type == "pdf":
        doc = fitz.open(path)
        pages = len(doc)
        for page in doc:
            text += page.get_text() + "\n"
    elif file_type == "docx":
        d = docx.Document(path)
        text = "\n".join([p.text for p in d.paragraphs])
    else:
        with open(path, 'r', errors='ignore') as f:
            text = f.read()[:100000]
    return text, pages

def chunk_text(text: str, size=800, overlap=150):
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start+size])
        start += size-overlap
    return chunks

class HybridRetriever:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000)
        self.corpus = []; self.meta = []
    def index(self, chunks, metas):
        self.corpus = chunks; self.meta = metas
        if chunks: self.vectorizer.fit(chunks)
    def search(self, query, top_k=5):
        if not self.corpus: return []
        q = self.vectorizer.transform([query])
        c = self.vectorizer.transform(self.corpus)
        scores = cosine_similarity(q,c)[0]
        idx = scores.argsort()[::-1][:top_k]
        return [{"text": self.corpus[i], "meta": self.meta[i], "score": float(scores[i])} for i in idx]

retriever = HybridRetriever()
