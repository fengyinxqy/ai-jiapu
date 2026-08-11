"""Agent 主循环：调用 DeepSeek 函数调用 API 维护家谱。"""
import json
import logging
import time

import openai
from openai import OpenAI

from ..config import (
    CHAT_HISTORY_LIMIT,
    DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL,
    DEEPSEEK_MODEL,
    MAX_TOOL_ROUNDS,
)
from ..models import ChatMessage
from . import prompts, tools

logger = logging.getLogger(__name__)


class AgentError(Exception):
    """Agent 运行失败（配置缺失、网络/API 错误等），可直接展示给用户。"""


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "add_person",
            "description": "新增一位家庭成员。若姓名已存在会失败，此时应向用户确认是否为同一人。",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "人物姓名"},
                    "gender": {
                        "type": "string",
                        "enum": ["male", "female", "unknown"],
                        "description": "性别：男/女/未知",
                    },
                    "birth_year": {"type": "integer", "description": "出生年份，未知可省略"},
                    "death_year": {"type": "integer", "description": "去世年份，未知可省略"},
                    "note": {"type": "string", "description": "备注，如职业、居住地等"},
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_person",
            "description": "更新已有成员的姓名、性别、出生/去世年份或备注。",
            "parameters": {
                "type": "object",
                "properties": {
                    "person_id": {"type": "integer", "description": "成员 id"},
                    "name": {"type": "string"},
                    "gender": {"type": "string", "enum": ["male", "female", "unknown"]},
                    "birth_year": {"type": "integer"},
                    "death_year": {"type": "integer"},
                    "note": {"type": "string"},
                },
                "required": ["person_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_person",
            "description": "删除一位成员及其所有关系。",
            "parameters": {
                "type": "object",
                "properties": {
                    "person_id": {"type": "integer", "description": "成员 id"},
                },
                "required": ["person_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_relationship",
            "description": (
                "建立关系：spouse 为配偶关系；parent_child 为亲子关系，"
                "此时 person_a_id 是父母、person_b_id 是子女。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["spouse", "parent_child"],
                        "description": "关系类型",
                    },
                    "person_a_id": {"type": "integer"},
                    "person_b_id": {"type": "integer"},
                },
                "required": ["type", "person_a_id", "person_b_id"],
            },
        },
    },
]


def _build_client() -> OpenAI:
    return OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)


def _load_history(db, limit: int) -> list[dict]:
    rows = db.query(ChatMessage).order_by(ChatMessage.id.desc()).limit(limit).all()
    rows.reverse()
    return [{"role": m.role, "content": m.content} for m in rows]


def _format_tree_summary(db) -> str:
    data = tools.get_tree_data(db)
    gender_text = {"male": "男", "female": "女", "unknown": "未知"}
    lines = ["成员："]
    for person in data["persons"]:
        extra = []
        if person["birth_year"] is not None:
            extra.append(f"出生 {person['birth_year']}")
        if person["death_year"] is not None:
            extra.append(f"去世 {person['death_year']}")
        suffix = f"（{'，'.join(extra)}）" if extra else ""
        lines.append(
            f"- id={person['id']} {person['name']}"
            f"（{gender_text.get(person['gender'], '未知')}）{suffix}"
        )
    lines.append("关系：")
    name_by_id = {p["id"]: p["name"] for p in data["persons"]}
    for rel in data["relationships"]:
        a = name_by_id.get(rel["person_a_id"], f"#{rel['person_a_id']}")
        b = name_by_id.get(rel["person_b_id"], f"#{rel['person_b_id']}")
        if rel["type"] == "spouse":
            lines.append(f"- spouse: {a} ↔ {b}")
        else:
            lines.append(f"- parent_child: {a} → {b}（父母 → 子女）")
    return "\n".join(lines)


def _safe_args(raw: str) -> dict:
    try:
        value = json.loads(raw or "{}")
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


def _run_tool(db, name: str, args: dict) -> dict:
    try:
        if name == "add_person":
            return tools.add_person(db, **args)
        if name == "update_person":
            return tools.update_person(db, **args)
        if name == "delete_person":
            return tools.delete_person(db, **args)
        if name == "add_relationship":
            return tools.add_relationship(db, **args)
        return {"ok": False, "error": f"未知工具：{name}"}
    except TypeError as exc:
        return {"ok": False, "error": f"工具参数有误：{exc}"}
    except Exception as exc:  # noqa: BLE001
        logger.exception("工具执行失败")
        return {"ok": False, "error": f"工具执行失败：{exc}"}


def _chat_with_retry(client, *, messages, tools_schema, model=DEEPSEEK_MODEL):
    kwargs = {
        "model": model,
        "messages": messages,
        "tools": tools_schema,
        "temperature": 0.2,
    }
    try:
        return client.chat.completions.create(**kwargs)
    except openai.AuthenticationError as exc:
        raise AgentError(
            "DeepSeek API Key 无效或已过期，请检查 backend/.env 中的 DEEPSEEK_API_KEY。"
        ) from exc
    except (openai.RateLimitError, openai.APITimeoutError, openai.APIConnectionError) as exc:
        time.sleep(2)
        try:
            return client.chat.completions.create(**kwargs)
        except (
            openai.RateLimitError,
            openai.APITimeoutError,
            openai.APIConnectionError,
        ) as exc2:
            raise AgentError(
                "DeepSeek 服务暂时不可用（限流或网络问题），请稍后重试。"
            ) from exc2
    except openai.BadRequestError as exc:
        raise AgentError(f"请求 DeepSeek 失败：{exc}") from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("调用 DeepSeek 失败")
        raise AgentError(f"调用 DeepSeek 失败：{exc}") from exc


def run_agent(db, user_message: str) -> str:
    """执行一轮对话：持久化消息、运行工具调用循环，返回最终回复。"""
    if not DEEPSEEK_API_KEY:
        raise AgentError(
            "尚未配置 DeepSeek API Key：请在 backend/.env 中填入 "
            "DEEPSEEK_API_KEY（参考 backend/.env.example）。"
        )

    db.add(ChatMessage(role="user", content=user_message))
    db.commit()

    history = _load_history(db, CHAT_HISTORY_LIMIT)
    system_prompt = prompts.SYSTEM_PROMPT.format(
        tree_summary=_format_tree_summary(db)
    )
    messages = [{"role": "system", "content": system_prompt}, *history]

    client = _build_client()
    response = _chat_with_retry(
        client, messages=messages, tools_schema=TOOL_SCHEMAS
    )

    for _ in range(MAX_TOOL_ROUNDS):
        message = response.choices[0].message
        tool_calls = message.tool_calls or []
        if not tool_calls:
            break
        messages.append(
            {
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments,
                        },
                    }
                    for call in tool_calls
                ],
            }
        )
        for call in tool_calls:
            result = _run_tool(
                db, call.function.name, _safe_args(call.function.arguments)
            )
            db.commit()
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(result, ensure_ascii=False),
                }
            )
        response = _chat_with_retry(
            client, messages=messages, tools_schema=TOOL_SCHEMAS
        )
    else:
        # 达到工具轮次上限：要求模型给出最终答复
        response = _chat_with_retry(
            client, messages=messages, tools_schema=[]
        )

    reply = (response.choices[0].message.content or "").strip()
    if not reply:
        reply = "已更新家谱。还有什么需要补充的吗？"
    db.add(ChatMessage(role="assistant", content=reply))
    db.commit()
    return reply
