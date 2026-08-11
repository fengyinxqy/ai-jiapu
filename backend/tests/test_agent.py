"""Agent 主循环测试（使用假客户端，不访问网络）。"""
import json

import pytest

from app.agent import agent as agent_module
from app.agent.agent import AgentError, run_agent
from app.models import ChatMessage, Person


class FakeToolCall:
    def __init__(self, call_id, name, arguments):
        self.id = call_id
        self.type = "function"
        self.function = type("FakeFunction", (), {"name": name, "arguments": arguments})()


class FakeMessage:
    def __init__(self, content=None, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls


class FakeChoice:
    def __init__(self, message):
        self.message = message


class FakeResponse:
    def __init__(self, message):
        self.choices = [FakeChoice(message)]


class FakeCompletions:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self._responses:
            return self._responses.pop(0)
        return FakeResponse(FakeMessage(content="完成"))


class FakeChat:
    def __init__(self, responses):
        self.completions = FakeCompletions(responses)


class FakeClient:
    def __init__(self, responses):
        self.chat = FakeChat(responses)


def _install_fake(monkeypatch, responses):
    client = FakeClient(responses)
    monkeypatch.setattr(agent_module, "_build_client", lambda: client)
    monkeypatch.setattr(agent_module, "DEEPSEEK_API_KEY", "test-key")
    return client


def test_agent_adds_person_and_replies(monkeypatch, db_session):
    responses = [
        FakeResponse(
            FakeMessage(
                tool_calls=[
                    FakeToolCall(
                        "call_1",
                        "add_person",
                        json.dumps({"name": "张伟", "gender": "男"}),
                    )
                ]
            )
        ),
        FakeResponse(FakeMessage(content="已为你添加张伟，还有其他家人要补充吗？")),
    ]
    client = _install_fake(monkeypatch, responses)

    reply = run_agent(db_session, "我叫张伟")

    assert reply == "已为你添加张伟，还有其他家人要补充吗？"
    assert db_session.query(Person).count() == 1
    assert db_session.query(ChatMessage).count() == 2  # user + assistant
    assert client.chat.completions.calls[0]["tools"] is not None


def test_agent_hands_tool_error_back_to_model(monkeypatch, db_session):
    responses = [
        FakeResponse(
            FakeMessage(
                tool_calls=[FakeToolCall("c1", "add_person", json.dumps({"name": "张伟"}))]
            )
        ),
        FakeResponse(
            FakeMessage(
                tool_calls=[FakeToolCall("c2", "add_person", json.dumps({"name": "张伟"}))]
            )
        ),
        FakeResponse(FakeMessage(content="家谱中已有张伟，请问是同一个人吗？")),
    ]
    client = _install_fake(monkeypatch, responses)

    reply = run_agent(db_session, "我叫张伟")

    assert "已有" in reply or "同一个" in reply
    assert db_session.query(Person).count() == 1
    tool_messages = [
        m
        for m in client.chat.completions.calls[1]["messages"]
        if m["role"] == "tool"
    ]
    assert tool_messages and any("同名" in m["content"] for m in tool_messages)


def test_agent_requires_api_key(monkeypatch, db_session):
    monkeypatch.setattr(agent_module, "DEEPSEEK_API_KEY", "")
    with pytest.raises(AgentError):
        run_agent(db_session, "你好")
