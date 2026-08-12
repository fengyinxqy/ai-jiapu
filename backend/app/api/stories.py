"""成员故事接口：按家谱与成员作用域，写入需编辑者以上角色。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..agent import tools
from ..database import get_db
from ..models import Person, Story, User
from ..schemas import StoryCreate, StoryOut, StoryUpdate
from .deps import get_current_user
from .families import require_member

router = APIRouter(
    prefix="/api/families/{family_id}/persons/{person_id}/stories",
    tags=["stories"],
)


def _require_person(db: Session, family_id: int, person_id: int) -> None:
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.family_id == family_id)
        .first()
    )
    if person is None:
        raise HTTPException(status_code=404, detail="成员不存在")


@router.get("", response_model=list[StoryOut])
def list_stories(
    family_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user)
    _require_person(db, family_id, person_id)
    return tools.get_stories(db, family_id, person_id)


@router.post("", response_model=StoryOut, status_code=201)
def create_story(
    family_id: int,
    person_id: int,
    payload: StoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="editor")
    _require_person(db, family_id, person_id)
    result = tools.add_story(
        db,
        family_id,
        person_id,
        payload.title,
        payload.content,
        owner_id=user.id,
    )
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result["error"])
    db.commit()
    return StoryOut.model_validate(db.get(Story, result["story"]["id"]))


@router.patch("/{story_id}", response_model=StoryOut)
def update_story(
    family_id: int,
    person_id: int,
    story_id: int,
    payload: StoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="editor")
    _require_person(db, family_id, person_id)
    result = tools.update_story(
        db, family_id, story_id, **payload.model_dump(exclude_unset=True)
    )
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    db.commit()
    return StoryOut.model_validate(db.get(Story, story_id))


@router.delete("/{story_id}")
def delete_story(
    family_id: int,
    person_id: int,
    story_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_member(db, family_id, user, min_role="editor")
    _require_person(db, family_id, person_id)
    result = tools.delete_story(db, family_id, story_id)
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    db.commit()
    return {"ok": True}
