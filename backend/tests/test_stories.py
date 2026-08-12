"""成员故事接口测试：权限、作用域与 CRUD。"""
from app.agent import tools
from .helpers import register_and_login


def _setup(client, db_session, owner="alice", member="bob"):
    headers_a, _ = register_and_login(client, owner)
    headers_b, _ = register_and_login(client, member)
    family = client.post("/api/families", json={"name": "张家"}, headers=headers_a).json()
    code = client.post(
        f"/api/families/{family['id']}/invites", headers=headers_a
    ).json()["code"]
    client.post("/api/families/join", json={"code": code}, headers=headers_b)
    person = tools.add_person(db_session, family["id"], name="张伟")["person"]
    db_session.commit()
    return headers_a, headers_b, family, person


def test_story_crud_and_roles(client, db_session):
    headers_a, headers_b, family, person = _setup(client, db_session)
    base = f"/api/families/{family['id']}/persons/{person['id']}/stories"

    # editor 创建
    created = client.post(
        base,
        json={"title": "年少学艺", "content": "十四岁离家学木工。"},
        headers=headers_b,
    )
    assert created.status_code == 201
    story_id = created.json()["id"]

    # viewer 只读
    members = client.get(
        f"/api/families/{family['id']}/members", headers=headers_a
    ).json()
    bob = next(m for m in members if m["username"] == "bob")
    client.patch(
        f"/api/families/{family['id']}/members/{bob['user_id']}",
        json={"role": "viewer"},
        headers=headers_a,
    )
    assert client.get(base, headers=headers_b).status_code == 200
    assert (
        client.post(
            base, json={"title": "x", "content": "y"}, headers=headers_b
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"{base}/{story_id}", json={"content": "z"}, headers=headers_b
        ).status_code
        == 403
    )

    # owner 更新与删除
    updated = client.patch(
        f"{base}/{story_id}",
        json={"content": "十四岁离家学木工，三年出师。"},
        headers=headers_a,
    )
    assert updated.status_code == 200
    assert "三年出师" in updated.json()["content"]
    assert client.delete(f"{base}/{story_id}", headers=headers_a).status_code == 200
    assert client.get(base, headers=headers_a).json() == []


def test_stories_isolated_between_families(client, db_session):
    headers_a, _, family, person = _setup(client, db_session)
    base = f"/api/families/{family['id']}/persons/{person['id']}/stories"
    client.post(base, json={"title": "故事", "content": "内容"}, headers=headers_a)

    headers_c, _ = register_and_login(client, "carol")
    family_c = client.post("/api/families", json={"name": "李家"}, headers=headers_c).json()
    person_c = tools.add_person(db_session, family_c["id"], name="李四")["person"]
    db_session.commit()

    assert (
        client.get(
            f"/api/families/{family_c['id']}/persons/{person_c['id']}/stories",
            headers=headers_c,
        ).json()
        == []
    )
    # 用别的家谱的成员 id 访问故事 → 404（成员不存在）
    assert (
        client.get(
            f"/api/families/{family['id']}/persons/{person_c['id']}/stories",
            headers=headers_a,
        ).status_code
        == 404
    )


def test_stories_require_auth_and_membership(client, db_session):
    headers_a, _, family, person = _setup(client, db_session)
    base = f"/api/families/{family['id']}/persons/{person['id']}/stories"
    assert client.get(base).status_code == 401

    headers_c, _ = register_and_login(client, "carol")
    assert client.get(base, headers=headers_c).status_code == 404
