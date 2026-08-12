"""应用配置：从 backend/.env 或环境变量读取。"""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").strip()
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat").strip()

DATA_DIR = BACKEND_DIR / "data"
if not os.getenv("DATABASE_URL") and os.getenv("VERCEL"):
    # Vercel 函数文件系统只读，SQLite 只能放到 /tmp；数据在冷启动后会丢失。
    # 正式部署请配置 DATABASE_URL（如 PostgreSQL）以获得持久化存储。
    DATABASE_URL = f"sqlite:///{Path('/tmp') / 'jiapu.db'}"
    print(
        "[config] 未检测到 DATABASE_URL，Vercel 上使用 /tmp 临时 SQLite，"
        "数据不持久。请配置 DATABASE_URL（推荐 PostgreSQL）。",
        flush=True,
    )
else:
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'jiapu.db'}")

MAX_TOOL_ROUNDS = int(os.getenv("MAX_TOOL_ROUNDS", "3"))
CHAT_HISTORY_LIMIT = int(os.getenv("CHAT_HISTORY_LIMIT", "30"))
