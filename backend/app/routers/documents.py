from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import uuid
import shutil
import time
from typing import List

from ..database import get_db
from ..models import Document, DocumentChunk
from ..auth import get_current_user
from ..services.rag import extract_text, chunk_text, retriever

router = APIRouter(prefix="/api", tags=["sop"])

# Render's Python service cannot write to /app. Allow configuration through
# UPLOAD_DIR and use a writable temporary directory by default.
# Note: /tmp is ephemeral on Render; use persistent/object storage for durable uploads.
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/indux-os-uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/documents/upload")
def upload_doc(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    original_filename = os.path.basename(file.filename or "upload.txt")
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "txt"
    fname = f"{uuid.uuid4()}_{original_filename}"
    path = os.path.join(UPLOAD_DIR, fname)

    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    text, pages = extract_text(path, ext if ext in ["pdf", "docx"] else "txt")
    doc = Document(filename=original_filename, storage_path=path, page_count=pages)
    db.add(doc)
    db.commit()
    db.refresh(doc)

    chunks = chunk_text(text)
    for i, ch in enumerate(chunks):
        db.add(
            DocumentChunk(
                document_id=doc.id,
                text=ch,
                page_no=int(i * 800 / 3000) + 1,
            )
        )
    db.commit()

    all_chunks = db.query(DocumentChunk).all()
    retriever.index(
        [c.text for c in all_chunks],
        [{"document_id": c.document_id, "page": c.page_no} for c in all_chunks],
    )
    return {"id": doc.id, "chunks": len(chunks), "pages": pages}


class AskReq(BaseModel):
    query: str
    language: str = "en"
    top_k: int = 5


@router.post("/sop/ask")
def ask_sop(
    req: AskReq,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    start = time.time()
    results = retriever.search(req.query, top_k=req.top_k)
    if not results:
        return {
            "answer": "Insufficient evidence in knowledge base. Please upload relevant manual.",
            "citations": [],
            "model_used": "hybrid-tfidf-v1",
            "sources": [],
            "latency_ms": int((time.time() - start) * 1000),
        }

    context = "\n".join([r["text"][:600] for r in results])
    answer = (
        f"Based on indexed documents: {context[:1200]}... Query: {req.query} "
        "-> See cited pages for procedure."
    )
    citations = [
        {
            "document_id": r["meta"]["document_id"],
            "page": r["meta"]["page"],
            "score": r["score"],
            "snippet": r["text"][:200],
        }
        for r in results
    ]
    return {
        "answer": answer,
        "citations": citations,
        "model_used": "hybrid-tfidf-v1:tfidf+keyword-rerank",
        "sources": [c["document_id"] for c in citations],
        "latency_ms": int((time.time() - start) * 1000),
    }
