"""API 端点测试。"""
from app.agent import agent as agent_module
from app.agent import tools
from app.models import ChatMessage


def test_get_empty_tree(client):
    response = client.get("/api/tree")
    assert response.status_code == 200
    assert response.json() == {"persons": [], "relationships": []}


def test_patch_person(client, db_session):
    created = tools.add_person(db_session, name="张伟")
    db_session.commit()
    person_id = created["person"]["id"]

    response = client.patch(f"/api/persons/{person_id}", json={"note": "长子"})
    assert response.status_code == 200
    assert response.json()["note"] == "长子"


def test_patch_missing_person_returns_404(client):
    response = client.patch("/api/persons/999", json={"note": "x"})
    assert response.status_code == 404


def test_delete_person(client, db_session):
    created = tools.add_person(db_session, name="张伟")
    db_session.commit()
    person_id = created["person"]["id"]

    response = client.delete(f"/api/persons/{person_id}")
    assert response.status_code == 200
    assert client.get("/api/tree").json()["persons"] == []


def test_reset_tree_clears_everything(client, db_session):
    a = tools.add_person(db_session, name="张伟")["person"]
    b = tools.add_person(db_session, name="李秀兰")["person"]
    tools.add_relationship(db_session, "spouse", a["id"], b["id"])
    db_session.add(ChatMessage(role="user", content="你好"))
    db_session.commit()

    response = client.post("/api/tree/reset")
    assert response.status_code == 200
    assert client.get("/api/tree").json() == {"persons": [], "relationships": []}
    assert client.get("/api/chat/history").json() == []


def test_chat_missing_key_returns_friendly_error(client, monkeypatch):
    monkeypatch.setattr(agent_module, "DEEPSEEK_API_KEY", "")
    response = client.post("/api/chat", json={"message": "你好"})
    assert response.status_code == 400
    assert "DEEPSEEK_API_KEY" in response.json()["detail"]


def test_chat_history(client, db_session):
    db_session.add(ChatMessage(role="user", content="你好"))
    db_session.add(ChatMessage(role="assistant", content="你好！"))
    db_session.commit()
    response = client.get("/api/chat/history")
    assert response.status_code == 200
    data = response.json()
    assert [m["content"] for m in data] == ["你好", "你好！"]
