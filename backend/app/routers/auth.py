
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..auth import hash_pw, verify_pw, create_token
from ..config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginReq(BaseModel):
    username: str
    password: str


class AdminResetReq(BaseModel):
    reset_token: str


@router.post("/login")
def login(req: LoginReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == req.username
    ).first()

    if not user or not verify_pw(req.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    token = create_token({
        "sub": user.username,
        "role": user.role,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
    }


@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        User.username == "Ashish"
    ).first()

    if existing:
        return {"status": "exists"}

    initial_password = settings.ADMIN_INITIAL_PASSWORD

    if not initial_password:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_INITIAL_PASSWORD is not configured",
        )

    user = User(
        username="Ashish",
        password_hash=hash_pw(initial_password),
        role="admin",
    )

    try:
        db.add(user)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Admin creation failed",
        )

    return {"status": "created"}


@router.post("/temporary-admin-password-reset")
def temporary_admin_password_reset(
    req: AdminResetReq,
    db: Session = Depends(get_db),
):
    expected_token = os.getenv(
        "ADMIN_PASSWORD_RESET_TOKEN", ""
    )

    if not expected_token or not secrets.compare_digest(
        req.reset_token, expected_token
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid reset authorization",
        )

    new_password = settings.ADMIN_INITIAL_PASSWORD

    if not new_password or len(new_password) < 16:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_INITIAL_PASSWORD must be at least 16 characters",
        )

    user = db.query(User).filter(
        User.username == "Ashish"
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Admin account not found; use seed-admin first",
        )

    try:
        user.password_hash = hash_pw(new_password)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Password reset failed",
        )

    return {"status": "password_reset"}
