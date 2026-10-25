from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..auth import hash_pw, verify_pw, create_token
from ..config import settings
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginReq(BaseModel):
    username: str; password: str

@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username==req.username).first()
    if not user or not verify_pw(req.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    token = create_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "role": user.role}

@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    if db.query(User).filter(User.username=="Ashish").first():
        return {"status":"exists"}
    u = User(username="Ashish", password_hash=hash_pw(settings.ADMIN_INITIAL_PASSWORD), role="admin")
    db.add(u); db.commit()
    return {"status":"created"}
