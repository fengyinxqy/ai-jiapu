"""对话接口。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..agent.agent import AgentError, run_agent
from ..database import get_db
from ..models import ChatMessage
from ..schemas import ChatMessageOut, ChatRequest, ChatResponse
from .tree import build_tree

router = APIRouter(prefix="/api")


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    try:
        reply = run_agent(db, payload.message)
    except AgentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ChatResponse(reply=reply, tree=build_tree(db))


@router.get("/chat/history", response_model=list[ChatMessageOut])
def chat_history(db: Session = Depends(get_db)):
    rows = db.query(ChatMessage).order_by(ChatMessage.id.asc()).all()
    return [ChatMessageOut.model_validate(m) for m in rows]
