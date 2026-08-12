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

    reply = run_agent(db_session, 1, 1, "我叫张伟")

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

    reply = run_agent(db_session, 1, 1, "我叫张伟")

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
        run_agent(db_session, 1, 1, "你好")


def test_agent_data_is_family_scoped(monkeypatch, db_session):
    from app.agent import tools

    responses = [
        FakeResponse(
            FakeMessage(
                tool_calls=[
                    FakeToolCall("call_1", "add_person", json.dumps({"name": "张伟"}))
                ]
            )
        ),
        FakeResponse(FakeMessage(content="已添加张伟。")),
        FakeResponse(
            FakeMessage(
                tool_calls=[
                    FakeToolCall("call_2", "add_person", json.dumps({"name": "李四"}))
                ]
            )
        ),
        FakeResponse(FakeMessage(content="已添加李四。")),
    ]
    _install_fake(monkeypatch, responses)

    run_agent(db_session, 1, 1, "我叫张伟")
    run_agent(db_session, 1, 2, "我叫李四")

    assert [p["name"] for p in tools.get_tree_data(db_session, 1)["persons"]] == ["张伟"]
    assert [p["name"] for p in tools.get_tree_data(db_session, 2)["persons"]] == ["李四"]


def test_agent_history_is_per_user(monkeypatch, db_session):
    responses = [
        FakeResponse(
            FakeMessage(
                tool_calls=[
                    FakeToolCall("call_1", "add_person", json.dumps({"name": "张伟"}))
                ]
            )
        ),
        FakeResponse(FakeMessage(content="已添加张伟。")),
        FakeResponse(
            FakeMessage(
                tool_calls=[
                    FakeToolCall("call_2", "add_person", json.dumps({"name": "李四"}))
                ]
            )
        ),
        FakeResponse(FakeMessage(content="已添加李四。")),
    ]
    client = _install_fake(monkeypatch, responses)

    run_agent(db_session, 1, 1, "我叫张伟")
    run_agent(db_session, 2, 1, "我叫李四")

    # 第二个用户在同一个家谱里，历史里不应出现第一个用户的消息
    second_call_messages = client.chat.completions.calls[2]["messages"]
    user_contents = [
        m.get("content", "")
        for m in second_call_messages
        if m.get("role") == "user"
    ]
    assert any("李四" in c for c in user_contents)
    assert not any("张伟" in c for c in user_contents)


def test_agent_adds_story(monkeypatch, db_session):
    from app.agent import tools
    from app.models import Story

    person = tools.add_person(db_session, 1, name="张伟")["person"]
    db_session.commit()

    responses = [
        FakeResponse(
            FakeMessage(
                tool_calls=[
                    FakeToolCall(
                        "call_1",
                        "add_story",
                        json.dumps(
                            {"person_id": person["id"], "title": "年少学艺", "content": "十四岁离家学木工。"}
                        ),
                    )
                ]
            )
        ),
        FakeResponse(FakeMessage(content="已为张伟记录故事《年少学艺》。")),
    ]
    _install_fake(monkeypatch, responses)

    reply = run_agent(db_session, 1, 1, "我爷爷张伟年轻时学木工")

    assert reply == "已为张伟记录故事《年少学艺》。"
    story = db_session.query(Story).first()
    assert story is not None
    assert story.title == "年少学艺"
    assert story.person_id == person["id"]
