"""SQLAlchemy 引擎与会话管理。"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATA_DIR, DATABASE_URL

# Vercel 函数目录只读：/tmp SQLite 与 PostgreSQL 都不需要（也无法）创建 data 目录，
# 仅在本地 SQLite 路径下预创建数据目录。
if DATABASE_URL.startswith("sqlite") and not DATABASE_URL.startswith("sqlite:////tmp/"):
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _engine_url(url: str) -> str:
    """显式指定 PostgreSQL 驱动为 psycopg（v3），避免依赖默认的 psycopg2。"""
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    if url.startswith("postgres://"):
        return "postgres+psycopg://" + url[len("postgres://"):]
    return url


ENGINE_URL = _engine_url(DATABASE_URL)

engine = create_engine(
    ENGINE_URL,
    connect_args={"check_same_thread": False} if ENGINE_URL.startswith("sqlite") else {},
)

if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):  # noqa: ARG001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI 依赖：每个请求一个会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
