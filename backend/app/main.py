"""FastAPI 应用入口。"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .api.chat import router as chat_router
from .api.tree import router as tree_router
from .database import Base, engine

Base.metadata.create_all(bind=engine)


def _run_schema_migration():
    """旧库升级：persons 表把 birth_year/death_year 换成 birth_date/death_date。"""
    with engine.begin() as conn:
        columns = [
            row[1]
            for row in conn.execute(text("PRAGMA table_info(persons)")).fetchall()
        ]
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
                    except Exception:  # noqa: BLE001 - SQLite 版本不支持 DROP COLUMN 时忽略
                        pass


_run_schema_migration()

app = FastAPI(title="AI 家谱", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(tree_router)

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
