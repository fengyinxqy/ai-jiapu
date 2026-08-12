"""家谱数据的读写工具：Agent 与 API 共用。所有操作都限定在指定家谱内。"""
from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..models import Person, Relationship, Story

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


def _normalize_date(value):
    """校验 YYYY-MM-DD 格式的日期；空值返回 None。"""
    if value is None:
        return None, None
    text = str(value).strip()
    if not text:
        return None, None
    try:
        datetime.strptime(text, "%Y-%m-%d")
    except ValueError:
        return None, f"日期格式不正确：{text}（应为 YYYY-MM-DD，如 1990-05-12）"
    return text, None


def _person_dict(person: Person) -> dict:
    return {
        "id": person.id,
        "name": person.name,
        "gender": person.gender,
        "birth_date": person.birth_date,
        "death_date": person.death_date,
        "biography": person.biography or "",
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


def get_tree_data(db: Session, family_id: int) -> dict:
    """返回指定家谱的快照，供 API 序列化与 Agent 上下文使用。"""
    persons = (
        db.query(Person)
        .filter(Person.family_id == family_id)
        .order_by(Person.id)
        .all()
    )
    relationships = (
        db.query(Relationship)
        .filter(Relationship.family_id == family_id)
        .order_by(Relationship.id)
        .all()
    )
    return {
        "persons": [_person_dict(p) for p in persons],
        "relationships": [_relationship_dict(r) for r in relationships],
    }


def add_person(
    db: Session,
    family_id: int,
    name: str,
    gender="unknown",
    birth_date=None,
    death_date=None,
    note="",
    owner_id=None,
) -> dict:
    name = (name or "").strip()
    if not name:
        return {"ok": False, "error": "姓名不能为空。"}
    existing = (
        db.query(Person)
        .filter(Person.family_id == family_id, Person.name == name)
        .first()
    )
    if existing:
        return {
            "ok": False,
            "error": (
                f"家谱中已有同名成员「{name}」（id={existing.id}）。"
                "请先询问用户是否为同一人：若是，用 update_person 补充信息；"
                "若否，请让用户提供区分方式（如加地名或辈分）。"
            ),
        }
    birth_date, birth_error = _normalize_date(birth_date)
    if birth_error:
        return {"ok": False, "error": birth_error}
    death_date, death_error = _normalize_date(death_date)
    if death_error:
        return {"ok": False, "error": death_error}
    person = Person(
        name=name,
        gender=_norm_gender(gender),
        birth_date=birth_date,
        death_date=death_date,
        note=note or "",
        family_id=family_id,
        owner_id=owner_id,
    )
    db.add(person)
    db.flush()
    return {"ok": True, "person": _person_dict(person)}


def update_person(
    db: Session,
    family_id: int,
    person_id: int,
    name=None,
    gender=None,
    birth_date=None,
    death_date=None,
    biography=None,
    note=None,
) -> dict:
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.family_id == family_id)
        .first()
    )
    if person is None:
        return {"ok": False, "error": f"找不到 id={person_id} 的成员，请先创建或向用户确认。"}
    if name is not None:
        new_name = str(name).strip()
        if not new_name:
            return {"ok": False, "error": "姓名不能为空。"}
        duplicate = (
            db.query(Person)
            .filter(
                Person.family_id == family_id,
                Person.name == new_name,
                Person.id != person_id,
            )
            .first()
        )
        if duplicate:
            return {"ok": False, "error": f"「{new_name}」已被 id={duplicate.id} 使用，请确认。"}
        person.name = new_name
    if gender is not None:
        person.gender = _norm_gender(gender)
    if birth_date is not None:
        birth_date, error = _normalize_date(birth_date)
        if error:
            return {"ok": False, "error": error}
        person.birth_date = birth_date
    if death_date is not None:
        death_date, error = _normalize_date(death_date)
        if error:
            return {"ok": False, "error": error}
        person.death_date = death_date
    if biography is not None:
        person.biography = str(biography)
    if note is not None:
        person.note = str(note)
    db.flush()
    return {"ok": True, "person": _person_dict(person)}


def delete_person(db: Session, family_id: int, person_id: int) -> dict:
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.family_id == family_id)
        .first()
    )
    if person is None:
        return {"ok": False, "error": f"找不到 id={person_id} 的成员。"}
    db.query(Relationship).filter(
        Relationship.family_id == family_id,
        or_(
            Relationship.person_a_id == person_id,
            Relationship.person_b_id == person_id,
        ),
    ).delete(synchronize_session=False)
    db.delete(person)
    db.flush()
    return {"ok": True, "deleted_id": person_id}


def _would_create_cycle(
    db: Session,
    family_id: int,
    parent_id: int,
    child_id: int,
) -> bool:
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
                Relationship.family_id == family_id,
                Relationship.type == "parent_child",
                Relationship.person_b_id == current,
            )
            .all()
        )
        stack.extend(r.person_a_id for r in rows)
    return False


def add_relationship(
    db: Session,
    family_id: int,
    type: str,
    person_a_id: int,
    person_b_id: int,
    owner_id=None,
) -> dict:
    a = (
        db.query(Person)
        .filter(Person.id == person_a_id, Person.family_id == family_id)
        .first()
    )
    b = (
        db.query(Person)
        .filter(Person.id == person_b_id, Person.family_id == family_id)
        .first()
    )
    if a is None or b is None:
        missing = [
            pid
            for pid in (person_a_id, person_b_id)
            if db.query(Person)
            .filter(Person.id == pid, Person.family_id == family_id)
            .first()
            is None
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
        if _would_create_cycle(db, family_id, pa, pb):
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
            Relationship.family_id == family_id,
            Relationship.type == type,
            Relationship.person_a_id == pa,
            Relationship.person_b_id == pb,
        )
        .first()
    )
    if exists:
        return {"ok": False, "error": f"该关系已存在（id={exists.id}），无需重复添加。"}
    rel = Relationship(
        type=type,
        person_a_id=pa,
        person_b_id=pb,
        family_id=family_id,
        owner_id=owner_id,
    )
    db.add(rel)
    db.flush()
    return {"ok": True, "relationship": _relationship_dict(rel)}


def _story_dict(story: Story) -> dict:
    return {
        "id": story.id,
        "person_id": story.person_id,
        "title": story.title,
        "content": story.content,
        "created_at": story.created_at.isoformat(),
    }


def get_stories(db: Session, family_id: int, person_id: int) -> list[dict]:
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.family_id == family_id)
        .first()
    )
    if person is None:
        return []
    rows = (
        db.query(Story)
        .filter(Story.person_id == person_id, Story.family_id == family_id)
        .order_by(Story.id.asc())
        .all()
    )
    return [_story_dict(s) for s in rows]


def add_story(
    db: Session,
    family_id: int,
    person_id: int,
    title: str,
    content: str,
    owner_id=None,
) -> dict:
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.family_id == family_id)
        .first()
    )
    if person is None:
        return {"ok": False, "error": f"找不到 id={person_id} 的成员，请先创建或向用户确认。"}
    title = (title or "").strip()
    content = (content or "").strip()
    if not title:
        return {"ok": False, "error": "故事标题不能为空。"}
    if not content:
        return {"ok": False, "error": "故事内容不能为空。"}
    story = Story(
        person_id=person_id,
        family_id=family_id,
        owner_id=owner_id,
        title=title[:100],
        content=content,
    )
    db.add(story)
    db.flush()
    return {"ok": True, "story": _story_dict(story)}


def update_story(
    db: Session,
    family_id: int,
    story_id: int,
    title=None,
    content=None,
) -> dict:
    story = (
        db.query(Story)
        .filter(Story.id == story_id, Story.family_id == family_id)
        .first()
    )
    if story is None:
        return {"ok": False, "error": f"找不到 id={story_id} 的故事。"}
    if title is not None:
        title = str(title).strip()
        if not title:
            return {"ok": False, "error": "故事标题不能为空。"}
        story.title = title[:100]
    if content is not None:
        content = str(content).strip()
        if not content:
            return {"ok": False, "error": "故事内容不能为空。"}
        story.content = content
    db.flush()
    return {"ok": True, "story": _story_dict(story)}


def delete_story(db: Session, family_id: int, story_id: int) -> dict:
    story = (
        db.query(Story)
        .filter(Story.id == story_id, Story.family_id == family_id)
        .first()
    )
    if story is None:
        return {"ok": False, "error": f"找不到 id={story_id} 的故事。"}
    db.delete(story)
    db.flush()
    return {"ok": True, "deleted_id": story_id}
