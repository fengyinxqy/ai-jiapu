"""数据库迁移：建表、旧字段升级、旧单机数据归入默认账号。"""
from sqlalchemy import inspect, or_, text
from sqlalchemy.orm import sessionmaker

from .database import Base
from .models import ChatMessage, Family, FamilyMember, Person, Relationship, User
from .security import hash_password

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"
DEFAULT_FAMILY_NAME = "我的家谱"


def _table_columns(engine, table_name: str) -> list[str]:
    """跨方言获取表字段名（SQLite / PostgreSQL 通用）。"""
    return [column["name"] for column in inspect(engine).get_columns(table_name)]


def run_migrations(engine) -> None:
    Base.metadata.create_all(bind=engine)
    _normalize_numeric_id_columns(engine)
    _upgrade_person_dates(engine)
    _ensure_person_biography(engine)
    _ensure_chat_owner_column(engine)
    _migrate_legacy_data(engine)
    _backfill_chat_owner(engine)


def _normalize_numeric_id_columns(engine) -> None:
    """PostgreSQL 兼容：把历史 VARCHAR 的 family_id/owner_id 归一为 INTEGER。"""
    if engine.dialect.name == "sqlite":
        return
    targets = (
        ("persons", ("owner_id", "family_id")),
        ("relationships", ("owner_id", "family_id")),
        ("chat_messages", ("owner_id", "family_id")),
        ("stories", ("family_id", "owner_id")),
    )
    with engine.begin() as conn:
        for table, columns in targets:
            existing = {
                col["name"]: str(col["type"]).lower()
                for col in inspect(engine).get_columns(table)
            }
            for column in columns:
                col_type = existing.get(column, "")
                if "char" in col_type or "text" in col_type:
                    conn.execute(
                        text(
                            f"ALTER TABLE {table} ALTER COLUMN {column} "
                            f"TYPE INTEGER USING {column}::integer"
                        )
                    )


def _upgrade_person_dates(engine) -> None:
    """旧库升级：persons 表把 birth_year/death_year 换成 birth_date/death_date。"""
    with engine.begin() as conn:
        columns = _table_columns(engine, "persons")
        for column in ("birth_date", "death_date"):
            if column not in columns:
                conn.execute(text(f"ALTER TABLE persons ADD COLUMN {column} VARCHAR(10)"))
        for old_column in ("birth_year", "death_year"):
            if old_column in columns:
                has_data = conn.execute(
                    text(f"SELECT COUNT(*) FROM persons WHERE {old_column} IS NOT NULL")
                ).scalar()
                if not has_data:
                    try:
                        conn.execute(text(f"ALTER TABLE persons DROP COLUMN {old_column}"))
                    except Exception:  # noqa: BLE001 - 低版本 SQLite 不支持 DROP COLUMN 时忽略
                        pass


def _ensure_chat_owner_column(engine) -> None:
    with engine.begin() as conn:
        columns = _table_columns(engine, "chat_messages")
        if "owner_id" not in columns:
            conn.execute(
                text("ALTER TABLE chat_messages ADD COLUMN owner_id VARCHAR(64)")
            )


def _ensure_person_biography(engine) -> None:
    with engine.begin() as conn:
        columns = _table_columns(engine, "persons")
        if "biography" not in columns:
            conn.execute(
                text("ALTER TABLE persons ADD COLUMN biography TEXT DEFAULT ''")
            )


def _migrate_legacy_data(engine) -> None:
    """单机旧数据（family_id 为空）归入默认账号 admin 的「我的家谱」。"""
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    with session_factory() as db:
        orphan_count = db.query(Person).filter(Person.family_id.is_(None)).count()
        if not orphan_count:
            return

        admin = db.query(User).filter(User.username == DEFAULT_ADMIN_USERNAME).first()
        if admin is None:
            admin = User(
                username=DEFAULT_ADMIN_USERNAME,
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
            )
            db.add(admin)
            db.flush()

        family = (
            db.query(Family)
            .filter(Family.name == DEFAULT_FAMILY_NAME, Family.owner_id == admin.id)
            .first()
        )
        if family is None:
            family = Family(name=DEFAULT_FAMILY_NAME, owner_id=admin.id)
            db.add(family)
            db.flush()

        membership = (
            db.query(FamilyMember)
            .filter(FamilyMember.family_id == family.id, FamilyMember.user_id == admin.id)
            .first()
        )
        if membership is None:
            db.add(FamilyMember(family_id=family.id, user_id=admin.id, role="owner"))

        db.query(Person).filter(Person.family_id.is_(None)).update(
            {"family_id": family.id, "owner_id": admin.id},
            synchronize_session=False,
        )
        for rel in db.query(Relationship).filter(Relationship.family_id.is_(None)).all():
            person = (
                db.query(Person)
                .filter(
                    or_(Person.id == rel.person_a_id, Person.id == rel.person_b_id)
                )
                .first()
            )
            if person is not None:
                rel.family_id = person.family_id
        db.query(ChatMessage).filter(ChatMessage.family_id.is_(None)).update(
            {"family_id": family.id},
            synchronize_session=False,
        )
        db.commit()


def _backfill_chat_owner(engine) -> None:
    """把缺失 owner_id 的聊天记录归属到家谱创建者（对话改为成员私密后的数据补齐）。"""
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE chat_messages SET owner_id = ("
                "  SELECT owner_id FROM families"
                "  WHERE CAST(families.id AS VARCHAR) = CAST(chat_messages.family_id AS VARCHAR)"
                ") WHERE owner_id IS NULL AND family_id IS NOT NULL"
            )
        )
