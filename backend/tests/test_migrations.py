"""旧单机数据迁移测试。"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.migrations import run_migrations
from app.models import ChatMessage, Family, Person, User


def test_legacy_data_migrated_to_admin(tmp_path):
    db_path = tmp_path / "legacy.db"
    engine = create_engine(f"sqlite:///{db_path}")
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE persons ("
                "id INTEGER PRIMARY KEY, name VARCHAR(100), gender VARCHAR(10), "
                "birth_date VARCHAR(10), death_date VARCHAR(10), note TEXT, "
                "owner_id VARCHAR(64), family_id VARCHAR(64), created_at DATETIME)"
            )
        )
        conn.execute(text("INSERT INTO persons (name, gender) VALUES ('萧祺彦', 'male')"))
        conn.execute(
            text(
                "CREATE TABLE relationships ("
                "id INTEGER PRIMARY KEY, type VARCHAR(20), person_a_id INTEGER, "
                "person_b_id INTEGER, owner_id VARCHAR(64), family_id VARCHAR(64), "
                "created_at DATETIME)"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE chat_messages ("
                "id INTEGER PRIMARY KEY, role VARCHAR(20), content TEXT, "
                "family_id VARCHAR(64), created_at DATETIME)"
            )
        )
        conn.execute(
            text("INSERT INTO chat_messages (role, content) VALUES ('user', '你好')")
        )

    run_migrations(engine)

    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    with session_factory() as db:
        admin = db.query(User).filter(User.username == "admin").first()
        assert admin is not None
        family = db.query(Family).filter(Family.owner_id == admin.id).first()
        assert family is not None
        person = db.query(Person).first()
        assert person.family_id is not None and int(person.family_id) == family.id
        chat = db.query(ChatMessage).first()
        assert chat.family_id is not None and int(chat.family_id) == family.id
    engine.dispose()
