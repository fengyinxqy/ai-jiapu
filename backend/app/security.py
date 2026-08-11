"""密码哈希、会话 token 与邀请码生成。"""
import hashlib
import hmac
import secrets

PBKDF2_ITERATIONS = 200_000
INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iterations, salt, expected = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            int(iterations),
        )
        return hmac.compare_digest(digest.hex(), expected)
    except (ValueError, TypeError):
        return False


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def create_token() -> tuple[str, str]:
    """返回 (明文 token, 入库哈希)。"""
    token = secrets.token_urlsafe(32)
    return token, sha256_hex(token)


def generate_invite_code(length: int = 6) -> str:
    return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(length))
