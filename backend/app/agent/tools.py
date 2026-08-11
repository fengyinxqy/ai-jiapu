"""家谱数据的读写工具：Agent 与 API 共用。"""
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import Person, Relationship

GENDER_ALIASES = {
    "男": "male",
    "male": "male",
    "m": "male",
    "man": "male",
    "女": "female",
    "female": "female",
    "f": "female",
    "woman": "female",
}


def _norm_gender(value) -> str:
    if not value:
        return "unknown"
    return GENDER_ALIASES.get(str(value).strip().lower(), "unknown")


def _person_dict(person: Person) -> dict:
    return {
        "id": person.id,
        "name": person.name,
        "gender": person.gender,
        "birth_year": person.birth_year,
        "death_year": person.death_year,
        "note": person.note or "",
        "created_at": person.created_at.isoformat(),
    }


def _relationship_dict(rel: Relationship) -> dict:
    return {
        "id": rel.id,
        "type": rel.type,
        "person_a_id": rel.person_a_id,
        "person_b_id": rel.person_b_id,
    }


def get_tree_data(db: Session) -> dict:
    """返回可供 API 序列化与 Agent 上下文使用的家谱快照。"""
    persons = db.query(Person).order_by(Person.id).all()
    relationships = db.query(Relationship).order_by(Relationship.id).all()
    return {
        "persons": [_person_dict(p) for p in persons],
        "relationships": [_relationship_dict(r) for r in relationships],
    }


def add_person(
    db: Session,
    name: str,
    gender="unknown",
    birth_year=None,
    death_year=None,
    note="",
) -> dict:
    name = (name or "").strip()
    if not name:
        return {"ok": False, "error": "姓名不能为空。"}
    existing = db.query(Person).filter(Person.name == name).first()
    if existing:
        return {
            "ok": False,
            "error": (
                f"家谱中已有同名成员「{name}」（id={existing.id}）。"
                "请先询问用户是否为同一人：若是，用 update_person 补充信息；"
                "若否，请让用户提供区分方式（如加地名或辈分）。"
            ),
        }
    person = Person(
        name=name,
        gender=_norm_gender(gender),
        birth_year=birth_year,
        death_year=death_year,
        note=note or "",
    )
    db.add(person)
    db.flush()
    return {"ok": True, "person": _person_dict(person)}


def update_person(
    db: Session,
    person_id: int,
    name=None,
    gender=None,
    birth_year=None,
    death_year=None,
    note=None,
) -> dict:
    person = db.get(Person, person_id)
    if person is None:
        return {"ok": False, "error": f"找不到 id={person_id} 的成员，请先创建或向用户确认。"}
    if name is not None:
        new_name = str(name).strip()
        if not new_name:
            return {"ok": False, "error": "姓名不能为空。"}
        duplicate = (
            db.query(Person)
            .filter(Person.name == new_name, Person.id != person_id)
            .first()
        )
        if duplicate:
            return {"ok": False, "error": f"「{new_name}」已被 id={duplicate.id} 使用，请确认。"}
        person.name = new_name
    if gender is not None:
        person.gender = _norm_gender(gender)
    if birth_year is not None:
        person.birth_year = int(birth_year)
    if death_year is not None:
        person.death_year = int(death_year)
    if note is not None:
        person.note = str(note)
    db.flush()
    return {"ok": True, "person": _person_dict(person)}


def delete_person(db: Session, person_id: int) -> dict:
    person = db.get(Person, person_id)
    if person is None:
        return {"ok": False, "error": f"找不到 id={person_id} 的成员。"}
    db.query(Relationship).filter(
        or_(
            Relationship.person_a_id == person_id,
            Relationship.person_b_id == person_id,
        )
    ).delete(synchronize_session=False)
    db.delete(person)
    db.flush()
    return {"ok": True, "deleted_id": person_id}


def _would_create_cycle(db: Session, parent_id: int, child_id: int) -> bool:
    """沿 parent 的祖先链向上找 child，若找到说明会成环。"""
    seen: set[int] = set()
    stack = [parent_id]
    while stack:
        current = stack.pop()
        if current == child_id:
            return True
        if current in seen:
            continue
        seen.add(current)
        rows = (
            db.query(Relationship)
            .filter(
                Relationship.type == "parent_child",
                Relationship.person_b_id == current,
            )
            .all()
        )
        stack.extend(r.person_a_id for r in rows)
    return False


def add_relationship(
    db: Session,
    type: str,
    person_a_id: int,
    person_b_id: int,
) -> dict:
    a = db.get(Person, person_a_id)
    b = db.get(Person, person_b_id)
    if a is None or b is None:
        missing = [
            pid for pid in (person_a_id, person_b_id) if db.get(Person, pid) is None
        ]
        return {
            "ok": False,
            "error": f"找不到成员 id={missing}，请先创建对应人物或向用户询问姓名。",
        }
    if person_a_id == person_b_id:
        return {"ok": False, "error": "不能与自己建立关系。"}
    if type == "spouse":
        pa, pb = sorted((person_a_id, person_b_id))
    elif type == "parent_child":
        pa, pb = person_a_id, person_b_id
        if _would_create_cycle(db, pa, pb):
            return {
                "ok": False,
                "error": "该亲子关系会造成家谱循环，已拒绝。请确认人物辈分是否正确。",
            }
    else:
        return {
            "ok": False,
            "error": f"未知关系类型：{type}（仅支持 spouse / parent_child）。",
        }
    exists = (
        db.query(Relationship)
        .filter(
            Relationship.type == type,
            Relationship.person_a_id == pa,
            Relationship.person_b_id == pb,
        )
        .first()
    )
    if exists:
        return {"ok": False, "error": f"该关系已存在（id={exists.id}），无需重复添加。"}
    rel = Relationship(type=type, person_a_id=pa, person_b_id=pb)
    db.add(rel)
    db.flush()
    return {"ok": True, "relationship": _relationship_dict(rel)}
