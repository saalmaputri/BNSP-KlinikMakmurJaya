import pytest

from app.core.exceptions import AppException
from app.utils.security import JWTManager, PasswordHasher


def test_password_hash_and_verify():
    hasher = PasswordHasher()
    password_hash = hasher.hash("Password123")
    assert password_hash != "Password123"
    assert hasher.verify("Password123", password_hash)


def test_weak_password_rejected():
    hasher = PasswordHasher()
    with pytest.raises(AppException):
        hasher.hash("weak")


def test_jwt_access_token_roundtrip():
    manager = JWTManager()
    token = manager.create_access_token("user-id", "ADMIN")
    payload = manager.decode(token)
    assert payload["sub"] == "user-id"
    assert payload["role"] == "ADMIN"
