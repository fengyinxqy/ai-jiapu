"""家谱工具函数测试（所有操作限定在家谱内）。"""
from app.agent import tools
from app.models import Relationship


def test_add_person_ok(db_session):
    result = tools.add_person(
        db_session,
        1,
        name="张伟",
        gender="男",
        birth_date="1990-05-12",
        note="长子",
    )
    assert result["ok"] is True
    assert result["person"]["gender"] == "male"
    assert result["person"]["birth_date"] == "1990-05-12"
    assert result["person"]["note"] == "长子"
    assert result["person"]["id"] is not None


def test_add_person_invalid_date_rejected(db_session):
    result = tools.add_person(db_session, 1, name="张伟", birth_date="1990年5月")
    assert result["ok"] is False
    assert "日期格式" in result["error"]


def test_update_person_invalid_date_rejected(db_session):
    created = tools.add_person(db_session, 1, name="张伟")
    result = tools.update_person(
        db_session, 1, person_id=created["person"]["id"], death_date="2020/01/01"
    )
    assert result["ok"] is False


def test_add_person_duplicate_name_rejected(db_session):
    tools.add_person(db_session, 1, name="张伟")
    result = tools.add_person(db_session, 1, name="张伟")
    assert result["ok"] is False
    assert "同名" in result["error"]


def test_same_name_allowed_in_different_families(db_session):
    assert tools.add_person(db_session, 1, name="张伟")["ok"] is True
    assert tools.add_person(db_session, 2, name="张伟")["ok"] is True


def test_add_person_empty_name_rejected(db_session):
    result = tools.add_person(db_session, 1, name="   ")
    assert result["ok"] is False


def test_update_person_missing_returns_error(db_session):
    result = tools.update_person(db_session, 1, person_id=999, name="X")
    assert result["ok"] is False


def test_update_person_ok(db_session):
    created = tools.add_person(db_session, 1, name="张伟")
    person_id = created["person"]["id"]
    result = tools.update_person(db_session, 1, person_id=person_id, note="长子")
    assert result["ok"] is True
    assert result["person"]["note"] == "长子"


def test_person_operations_are_family_scoped(db_session):
    created = tools.add_person(db_session, 1, name="张伟")
    person_id = created["person"]["id"]
    assert tools.update_person(db_session, 2, person_id=person_id, note="x")["ok"] is False
    assert tools.delete_person(db_session, 2, person_id=person_id)["ok"] is False


def test_delete_person_removes_relationships(db_session):
    child = tools.add_person(db_session, 1, name="张伟")["person"]
    parent = tools.add_person(db_session, 1, name="张建国")["person"]
    tools.add_relationship(db_session, 1, "parent_child", parent["id"], child["id"])
    result = tools.delete_person(db_session, 1, child["id"])
    assert result["ok"] is True
    assert db_session.query(Relationship).count() == 0


def test_spouse_orders_ids_and_dedupes(db_session):
    a = tools.add_person(db_session, 1, name="张建国")["person"]
    b = tools.add_person(db_session, 1, name="李秀兰")["person"]
    first = tools.add_relationship(db_session, 1, "spouse", b["id"], a["id"])
    assert first["ok"] is True
    assert first["relationship"]["person_a_id"] == a["id"]
    assert first["relationship"]["person_b_id"] == b["id"]
    second = tools.add_relationship(db_session, 1, "spouse", a["id"], b["id"])
    assert second["ok"] is False


def test_parent_child_cycle_rejected(db_session):
    a = tools.add_person(db_session, 1, name="张伟")["person"]
    b = tools.add_person(db_session, 1, name="张建国")["person"]
    tools.add_relationship(db_session, 1, "parent_child", b["id"], a["id"])
    result = tools.add_relationship(db_session, 1, "parent_child", a["id"], b["id"])
    assert result["ok"] is False
    assert "循环" in result["error"]


def test_relationship_unknown_person_rejected(db_session):
    result = tools.add_relationship(db_session, 1, "spouse", 1, 2)
    assert result["ok"] is False


def test_self_relationship_rejected(db_session):
    person = tools.add_person(db_session, 1, name="张伟")["person"]
    result = tools.add_relationship(
        db_session, 1, "parent_child", person["id"], person["id"]
    )
    assert result["ok"] is False


def test_get_tree_data_filters_by_family(db_session):
    tools.add_person(db_session, 1, name="张伟")
    tools.add_person(db_session, 2, name="李四")
    assert len(tools.get_tree_data(db_session, 1)["persons"]) == 1
    assert len(tools.get_tree_data(db_session, 2)["persons"]) == 1
