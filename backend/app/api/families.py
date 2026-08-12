"""家谱与协作接口：家谱 CRUD、树/对话、成员管理、邀请码。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..agent import tools
from ..agent.agent import AgentError, run_agent
from ..database import get_db
from ..models import (
    AuthSession,
    ChatMessage,
    Family,
    FamilyInvite,
    FamilyMember,
    Person,
    Relationship,
    User,
)
from ..schemas import (
    ChatMessageOut,
    ChatRequest,
    ChatResponse,
    FamilyCreate,
    FamilyMemberOut,
    FamilyOut,
    InviteOut,
    JoinRequest,
    MemberRoleUpdate,
    PersonOut,
    PersonUpdate,
    TreeOut,
)
from ..security import generate_invite_code
from .deps import get_current_user

router = APIRouter(prefix="/api", tags=["families"])

ROLE_RANK = {"viewer": 1, "editor": 2, "owner": 3}


def _family_out(family: Family, member: FamilyMember) -> FamilyOut:
    return FamilyOut(
        id=family.id,
        name=family.name,
        owner_id=family.owner_id,
        role=member.role,
        created_at=family.created_at,
    )


def get_membership(db: Session, family_id: int, user: User) -> FamilyMember | None:
    return (
        db.query(FamilyMember)
        .filter(FamilyMember.family_id == family_id, FamilyMember.user_id == user.id)
        .first()
    )


def require_member(
    db: Session,
    family_id: int,
    user: User,
    min_role: str = "viewer",
) -> FamilyMember:
    member = get_membership(db, family_id, user)
    if member is None:
        raise HTTPException(status_code=404, detail="家谱不存在")
    if ROLE_RANK[member.role] < ROLE_RANK[min_role]:
        raise HTTPException(status_code=403, detail="权限不足")
    return member


def _get_family(db: Session, family_id: int) -> Family:
    family = db.get(Family, family_id)
    if family is None:
        raise HTTPException(status_code=404, detail="家谱不存在")
    return family


@router.get("/families", response_model=list[FamilyOut])
def list_families(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(FamilyMember, Family)
        .join(Family, FamilyMember.family_id == Family.id)
        .filter(FamilyMember.user_id == user.id)
        .order_by(Family.id)
        .all()
    )
    return [_family_out(family, member) for member, family in rows]


@router.post("/families", response_model=FamilyOut, status_code=201)
def create_family(
    payload: FamilyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    family = Family(name=payload.name.strip(), owner_id=user.id)
    db.add(family)
    db.flush()
    db.add(FamilyMember(family_id=family.id, user_id=user.id, role="owner"))
    db.commit()
    member = get_membership(db, family.id, user)
    return _family_out(family, member)


@router.delete("/families/{family_id}")
def delete_family(
    family_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="owner")
    db.query(ChatMessage).filter(ChatMessage.family_id == family_id).delete(
        synchronize_session=False
    )
    db.query(Relationship).filter(Relationship.family_id == family_id).delete(
        synchronize_session=False
    )
    db.query(Person).filter(Person.family_id == family_id).delete(
        synchronize_session=False
    )
    db.query(FamilyInvite).filter(FamilyInvite.family_id == family_id).delete(
        synchronize_session=False
    )
    db.query(FamilyMember).filter(FamilyMember.family_id == family_id).delete(
        synchronize_session=False
    )
    db.query(Family).filter(Family.id == family_id).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.post("/families/join", response_model=FamilyOut)
def join_family(
    payload: JoinRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    invite = (
        db.query(FamilyInvite)
        .filter(FamilyInvite.code == payload.code.strip().upper())
        .first()
    )
    if invite is None:
        raise HTTPException(status_code=400, detail="邀请码无效")
    family = db.get(Family, invite.family_id)
    if family is None:
        raise HTTPException(status_code=400, detail="邀请码无效")
    if get_membership(db, family.id, user) is not None:
        raise HTTPException(status_code=400, detail="你已经是该家谱的成员")
    member = FamilyMember(family_id=family.id, user_id=user.id, role="editor")
    db.add(member)
    db.commit()
    return _family_out(family, member)


@router.get("/families/{family_id}/tree", response_model=TreeOut)
def get_tree(
    family_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user)
    return TreeOut.model_validate(tools.get_tree_data(db, family_id))


@router.post("/families/{family_id}/chat", response_model=ChatResponse)
def chat(
    family_id: int,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="editor")
    try:
        reply = run_agent(db, user.id, family_id, payload.message)
    except AgentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ChatResponse(
        reply=reply,
        tree=TreeOut.model_validate(tools.get_tree_data(db, family_id)),
    )


@router.get("/families/{family_id}/chat/history", response_model=list[ChatMessageOut])
def chat_history(
    family_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user)
    rows = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.family_id == family_id,
            ChatMessage.owner_id == user.id,
        )
        .order_by(ChatMessage.id.asc())
        .all()
    )
    return [ChatMessageOut.model_validate(m) for m in rows]


@router.patch("/families/{family_id}/persons/{person_id}", response_model=PersonOut)
def update_person(
    family_id: int,
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="editor")
    result = tools.update_person(
        db, family_id, person_id, **payload.model_dump(exclude_unset=True)
    )
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    db.commit()
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.family_id == family_id)
        .first()
    )
    return PersonOut.model_validate(person)


@router.delete("/families/{family_id}/persons/{person_id}")
def delete_person(
    family_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="editor")
    result = tools.delete_person(db, family_id, person_id)
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    db.commit()
    return {"ok": True}


@router.post("/families/{family_id}/tree/reset", response_model=TreeOut)
def reset_tree(
    family_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="editor")
    db.query(ChatMessage).filter(ChatMessage.family_id == family_id).delete(
        synchronize_session=False
    )
    db.query(Relationship).filter(Relationship.family_id == family_id).delete(
        synchronize_session=False
    )
    db.query(Person).filter(Person.family_id == family_id).delete(
        synchronize_session=False
    )
    db.commit()
    return TreeOut.model_validate(tools.get_tree_data(db, family_id))


@router.get("/families/{family_id}/members", response_model=list[FamilyMemberOut])
def list_members(
    family_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="owner")
    rows = (
        db.query(FamilyMember, User)
        .join(User, FamilyMember.user_id == User.id)
        .filter(FamilyMember.family_id == family_id)
        .order_by(FamilyMember.id)
        .all()
    )
    return [
        FamilyMemberOut(
            user_id=member.user_id,
            username=member_user.username,
            role=member.role,
            created_at=member.created_at,
        )
        for member, member_user in rows
    ]


@router.patch("/families/{family_id}/members/{user_id}", response_model=FamilyMemberOut)
def update_member_role(
    family_id: int,
    user_id: int,
    payload: MemberRoleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="owner")
    member = (
        db.query(FamilyMember)
        .filter(FamilyMember.family_id == family_id, FamilyMember.user_id == user_id)
        .first()
    )
    if member is None:
        raise HTTPException(status_code=404, detail="成员不存在")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="不能修改创建者的角色")
    member.role = payload.role
    db.commit()
    member_user = db.get(User, user_id)
    return FamilyMemberOut(
        user_id=member.user_id,
        username=member_user.username,
        role=member.role,
        created_at=member.created_at,
    )


@router.delete("/families/{family_id}/members/{user_id}")
def remove_member(
    family_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="owner")
    member = (
        db.query(FamilyMember)
        .filter(FamilyMember.family_id == family_id, FamilyMember.user_id == user_id)
        .first()
    )
    if member is None:
        raise HTTPException(status_code=404, detail="成员不存在")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="不能移除创建者")
    db.delete(member)
    db.commit()
    return {"ok": True}


@router.post("/families/{family_id}/invites", response_model=InviteOut)
def create_invite(
    family_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="owner")
    db.query(FamilyInvite).filter(FamilyInvite.family_id == family_id).delete(
        synchronize_session=False
    )
    invite = FamilyInvite(
        family_id=family_id,
        code=generate_invite_code(),
        created_by=user.id,
    )
    db.add(invite)
    db.commit()
    return InviteOut(code=invite.code)
