"""测试辅助函数。"""


def register_and_login(client, username, password="test123456"):
    response = client.post(
        "/api/auth/register",
        json={"username": username, "password": password},
    )
    assert response.status_code == 201, response.text
    data = response.json()
    return {"Authorization": f"Bearer {data['token']}"}, data["user"]
