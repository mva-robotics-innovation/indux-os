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
from fastapi import HTTPException

ROLE_PERMISSIONS = {
    "viewer": ["machines:read","analytics:read","sop:read"],
    "operator": ["machines:read","incidents:create","sop:read","telemetry:read"],
    "technician": ["machines:read","machines:write","incidents:*","sop:*","maintenance:*"],
    "supervisor": ["machines:*","incidents:ack","incidents:assign","reports:read"],
    "admin": ["*"],
    "auditor": ["audit:read","machines:read","incidents:read"]
}

def require_permission(perm: str):
    def checker(user = Depends(get_current_user)):
        role_perms = ROLE_PERMISSIONS.get(user.role, [])
        if "*" in role_perms: return user
        if perm in role_perms or f"{perm.split(':')[0]}:*" in role_perms: return user
        raise HTTPException(403, f"Role {user.role} missing permission {perm}")
    return checker
