"""家谱读取与手动编辑接口。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..agent import tools
from ..database import get_db
from ..models import ChatMessage, Person, Relationship
from ..schemas import PersonOut, PersonUpdate, RelationshipOut, TreeOut

router = APIRouter(prefix="/api")


def build_tree(db: Session) -> TreeOut:
    return TreeOut.model_validate(tools.get_tree_data(db))


@router.get("/tree", response_model=TreeOut)
def get_tree(db: Session = Depends(get_db)):
    return build_tree(db)


@router.patch("/persons/{person_id}", response_model=PersonOut)
def update_person(
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
):
    result = tools.update_person(
        db, person_id, **payload.model_dump(exclude_unset=True)
    )
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    db.commit()
    return PersonOut.model_validate(db.get(Person, person_id))


@router.delete("/persons/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    result = tools.delete_person(db, person_id)
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    db.commit()
    return {"ok": True}


@router.post("/tree/reset", response_model=TreeOut)
def reset_tree(db: Session = Depends(get_db)):
    db.query(ChatMessage).delete()
    db.query(Relationship).delete()
    db.query(Person).delete()
    db.commit()
    return build_tree(db)
