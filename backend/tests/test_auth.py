"""认证接口测试。"""
from .helpers import register_and_login


def test_register_login_me_logout(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "secret123"},
    )
    assert response.status_code == 201
    token = response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["username"] == "alice"

    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401

    login = client.post(
        "/api/auth/login",
        json={"username": "alice", "password": "secret123"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["username"] == "alice"


def test_duplicate_username_conflict(client):
    register_and_login(client, "alice")
    response = client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "secret123"},
    )
    assert response.status_code == 409


def test_short_password_rejected(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "bob", "password": "123"},
    )
    assert response.status_code == 422


def test_wrong_password_rejected(client):
    register_and_login(client, "alice", password="secret123")
    response = client.post(
        "/api/auth/login",
        json={"username": "alice", "password": "wrong-pass"},
    )
    assert response.status_code == 401


def test_change_password(client):
    headers, _ = register_and_login(client, "alice")

    wrong = client.post(
        "/api/auth/change-password",
        json={"old_password": "nope", "new_password": "newpass123"},
        headers=headers,
    )
    assert wrong.status_code == 400

    ok = client.post(
        "/api/auth/change-password",
        json={"old_password": "test123456", "new_password": "newpass123"},
        headers=headers,
    )
    assert ok.status_code == 200

    assert (
        client.post(
            "/api/auth/login",
            json={"username": "alice", "password": "test123456"},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/login",
            json={"username": "alice", "password": "newpass123"},
        ).status_code
        == 200
    )
