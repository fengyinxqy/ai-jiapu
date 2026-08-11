"""认证接口：注册、登录、登出、当前用户、修改密码。"""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuthSession, User
from ..schemas import (
    AuthResponse,
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    UserOut,
)
from ..security import create_token, hash_password, sha256_hex, verify_password
from .deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _create_session(db: Session, user: User) -> str:
    token, token_hash = create_token()
    db.add(AuthSession(token_hash=token_hash, user_id=user.id))
    db.commit()
    return token


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    username = payload.username.strip()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="用户名已被使用")
    user = User(username=username, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    token = _create_session(db, user)
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username.strip()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = _create_session(db, user)
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@router.post("/logout")
def logout(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    authorization: str | None = Header(default=None),
):
    token = authorization.split(" ", 1)[1].strip()
    db.query(AuthSession).filter(AuthSession.token_hash == sha256_hex(token)).delete()
    db.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="原密码不正确")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}
