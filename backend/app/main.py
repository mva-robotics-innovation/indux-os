from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine, SessionLocal
from .models import User
from .auth import hash_pw
from .config import settings
from .routers import auth, incidents, telemetry, documents, cad, vision

Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    if not db.query(User).filter(User.username=="Ashish").first():
        u = User(username="Ashish", password_hash=hash_pw(settings.ADMIN_INITIAL_PASSWORD), role="admin")
        db.add(u); db.commit()
    db.close()
seed()

app = FastAPI(title="INDUX-OS V12", version="12.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(telemetry.router)
app.include_router(documents.router)
app.include_router(cad.router)
app.include_router(vision.router)

@app.get("/health")
def health(): return {"status":"ok","version":"12.0.0"}
