"""家谱作用域下的树/对话/成员接口测试。"""
from app.agent import agent as agent_module
from app.agent import tools
from .helpers import register_and_login


def test_requires_auth(client):
    assert client.get("/api/families").status_code == 401
    assert client.get("/api/families/1/tree").status_code == 401
    assert client.post("/api/families/1/chat", json={"message": "hi"}).status_code == 401


def test_create_family_and_empty_tree(client):
    headers, _ = register_and_login(client, "alice")
    response = client.post("/api/families", json={"name": "张家"}, headers=headers)
    assert response.status_code == 201
    family = response.json()
    assert family["role"] == "owner"
    tree = client.get(f"/api/families/{family['id']}/tree", headers=headers)
    assert tree.status_code == 200
    assert tree.json() == {"persons": [], "relationships": []}


def test_family_isolation(client):
    headers_a, _ = register_and_login(client, "alice")
    headers_b, _ = register_and_login(client, "bob")
    family = client.post("/api/families", json={"name": "张家"}, headers=headers_a).json()
    assert client.get(f"/api/families/{family['id']}/tree", headers=headers_b).status_code == 404
    assert client.get(f"/api/families/{family['id']}/chat/history", headers=headers_b).status_code == 404


def test_patch_person_scoped(client, db_session):
    headers, _ = register_and_login(client, "alice")
    family = client.post("/api/families", json={"name": "张家"}, headers=headers).json()
    created = tools.add_person(db_session, family["id"], name="张伟")
    db_session.commit()
    person_id = created["person"]["id"]

    response = client.patch(
        f"/api/families/{family['id']}/persons/{person_id}",
        json={"note": "长子"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["note"] == "长子"

    missing = client.patch(
        f"/api/families/{family['id']}/persons/999",
        json={"note": "x"},
        headers=headers,
    )
    assert missing.status_code == 404


def test_delete_person_scoped(client, db_session):
    headers, _ = register_and_login(client, "alice")
    family = client.post("/api/families", json={"name": "张家"}, headers=headers).json()
    created = tools.add_person(db_session, family["id"], name="张伟")
    db_session.commit()
    person_id = created["person"]["id"]

    response = client.delete(
        f"/api/families/{family['id']}/persons/{person_id}", headers=headers
    )
    assert response.status_code == 200
    tree = client.get(f"/api/families/{family['id']}/tree", headers=headers).json()
    assert tree["persons"] == []


def test_reset_tree_clears_only_current_family(client, db_session):
    headers, _ = register_and_login(client, "alice")
    family_a = client.post("/api/families", json={"name": "张家"}, headers=headers).json()
    family_b = client.post("/api/families", json={"name": "李家"}, headers=headers).json()
    tools.add_person(db_session, family_a["id"], name="张伟")
    tools.add_person(db_session, family_b["id"], name="李四")
    db_session.commit()

    response = client.post(
        f"/api/families/{family_a['id']}/tree/reset", headers=headers
    )
    assert response.status_code == 200
    tree_a = client.get(f"/api/families/{family_a['id']}/tree", headers=headers).json()
    tree_b = client.get(f"/api/families/{family_b['id']}/tree", headers=headers).json()
    assert tree_a["persons"] == []
    assert len(tree_b["persons"]) == 1


def test_chat_history_scoped(client, db_session):
    headers, _ = register_and_login(client, "alice")
    family = client.post("/api/families", json={"name": "张家"}, headers=headers).json()
    from app.models import ChatMessage

    db_session.add(ChatMessage(role="user", content="你好", family_id=family["id"]))
    db_session.commit()

    history = client.get(
        f"/api/families/{family['id']}/chat/history", headers=headers
    )
    assert history.status_code == 200
    assert history.json()[0]["content"] == "你好"


def test_chat_missing_key_returns_friendly_error(client, monkeypatch):
    monkeypatch.setattr(agent_module, "DEEPSEEK_API_KEY", "")
    headers, _ = register_and_login(client, "alice")
    family = client.post("/api/families", json={"name": "张家"}, headers=headers).json()
    response = client.post(
        f"/api/families/{family['id']}/chat",
        json={"message": "你好"},
        headers=headers,
    )
    assert response.status_code == 400
    assert "DEEPSEEK_API_KEY" in response.json()["detail"]
