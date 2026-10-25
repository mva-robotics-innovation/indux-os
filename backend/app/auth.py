from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
from .config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_pw(p): return pwd_context.hash(p)
def verify_pw(p,h): return pwd_context.verify(p,h)

def create_token(data: dict):
    exp = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MIN)
    data.update({"exp": exp})
    return jwt.encode(data, settings.SECRET_KEY, algorithm="HS256")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        username = payload.get("sub")
    except: raise HTTPException(401, "Invalid token")
    user = db.query(User).filter(User.username==username).first()
    if not user: raise HTTPException(401, "User not found")
    return user
