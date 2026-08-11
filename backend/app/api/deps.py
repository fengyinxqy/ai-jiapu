"""认证依赖：从 Bearer token 解析当前用户。"""
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuthSession, User
from ..security import sha256_hex


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="未登录或登录已失效")
    token = authorization.split(" ", 1)[1].strip()
    session = (
        db.query(AuthSession)
        .filter(AuthSession.token_hash == sha256_hex(token))
        .first()
    )
    if session is None:
        raise HTTPException(status_code=401, detail="未登录或登录已失效")
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="账号不存在")
    return user
