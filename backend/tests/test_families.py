"""家谱协作：邀请、成员管理与角色权限测试。"""
from app.agent import tools
from .helpers import register_and_login


def _create_family(client, headers, name="张家"):
    return client.post("/api/families", json={"name": name}, headers=headers).json()


def test_invite_join_and_role_flow(client, db_session):
    headers_a, _ = register_and_login(client, "alice")
    headers_b, _ = register_and_login(client, "bob")
    family = _create_family(client, headers_a)

    invite = client.post(
        f"/api/families/{family['id']}/invites", headers=headers_a
    ).json()
    code = invite["code"]

    wrong = client.post(
        "/api/families/join", json={"code": "XXXXXX"}, headers=headers_b
    )
    assert wrong.status_code == 400

    joined = client.post(
        "/api/families/join", json={"code": code}, headers=headers_b
    ).json()
    assert joined["role"] == "editor"

    duplicate = client.post(
        "/api/families/join", json={"code": code}, headers=headers_b
    )
    assert duplicate.status_code == 400

    # editor 可以编辑家谱
    created = tools.add_person(db_session, family["id"], name="张伟")
    db_session.commit()
    person_id = created["person"]["id"]
    patch = client.patch(
        f"/api/families/{family['id']}/persons/{person_id}",
        json={"note": "长子"},
        headers=headers_b,
    )
    assert patch.status_code == 200

    # owner 把 bob 降为 viewer
    members = client.get(
        f"/api/families/{family['id']}/members", headers=headers_a
    ).json()
    bob = next(m for m in members if m["username"] == "bob")
    demote = client.patch(
        f"/api/families/{family['id']}/members/{bob['user_id']}",
        json={"role": "viewer"},
        headers=headers_a,
    )
    assert demote.status_code == 200

    # viewer 只读：不能编辑、不能聊天，但能看树
    assert (
        client.patch(
            f"/api/families/{family['id']}/persons/{person_id}",
            json={"note": "x"},
            headers=headers_b,
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/families/{family['id']}/chat",
            json={"message": "你好"},
            headers=headers_b,
        ).status_code
        == 403
    )
    assert (
        client.get(f"/api/families/{family['id']}/tree", headers=headers_b).status_code
        == 200
    )


def test_regenerate_invite_invalidates_old(client):
    headers_a, _ = register_and_login(client, "alice")
    headers_b, _ = register_and_login(client, "bob")
    family = _create_family(client, headers_a)
    code_one = client.post(
        f"/api/families/{family['id']}/invites", headers=headers_a
    ).json()["code"]
    code_two = client.post(
        f"/api/families/{family['id']}/invites", headers=headers_a
    ).json()["code"]
    assert code_one != code_two
    assert (
        client.post(
            "/api/families/join", json={"code": code_one}, headers=headers_b
        ).status_code
        == 400
    )


def test_only_owner_manages_members(client):
    headers_a, _ = register_and_login(client, "alice")
    headers_b, _ = register_and_login(client, "bob")
    family = _create_family(client, headers_a)
    code = client.post(
        f"/api/families/{family['id']}/invites", headers=headers_a
    ).json()["code"]
    client.post("/api/families/join", json={"code": code}, headers=headers_b)

    assert (
        client.post(f"/api/families/{family['id']}/invites", headers=headers_b).status_code
        == 403
    )
    assert (
        client.get(f"/api/families/{family['id']}/members", headers=headers_b).status_code
        == 403
    )
    assert (
        client.delete(f"/api/families/{family['id']}", headers=headers_b).status_code
        == 403
    )

    members = client.get(
        f"/api/families/{family['id']}/members", headers=headers_a
    ).json()
    owner = next(m for m in members if m["username"] == "alice")
    assert (
        client.patch(
            f"/api/families/{family['id']}/members/{owner['user_id']}",
            json={"role": "viewer"},
            headers=headers_a,
        ).status_code
        == 400
    )


def test_remove_member_revokes_access(client, db_session):
    headers_a, _ = register_and_login(client, "alice")
    headers_b, _ = register_and_login(client, "bob")
    family = _create_family(client, headers_a)
    code = client.post(
        f"/api/families/{family['id']}/invites", headers=headers_a
    ).json()["code"]
    client.post("/api/families/join", json={"code": code}, headers=headers_b)

    members = client.get(
        f"/api/families/{family['id']}/members", headers=headers_a
    ).json()
    bob = next(m for m in members if m["username"] == "bob")
    assert (
        client.delete(
            f"/api/families/{family['id']}/members/{bob['user_id']}",
            headers=headers_a,
        ).status_code
        == 200
    )
    assert (
        client.get(f"/api/families/{family['id']}/tree", headers=headers_b).status_code
        == 404
    )


def test_non_member_cannot_see_members(client):
    headers_a, _ = register_and_login(client, "alice")
    headers_c, _ = register_and_login(client, "carol")
    family = _create_family(client, headers_a)
    assert (
        client.get(
            f"/api/families/{family['id']}/members", headers=headers_c
        ).status_code
        == 404
    )
