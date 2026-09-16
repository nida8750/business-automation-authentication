import hashlib

from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

_password_hash = PasswordHash((BcryptHasher(),))


def hash_password(plain_password: str) -> str:
    """Hash a plain password for storage. Never store the plain value."""
    if not plain_password:
        raise ValueError("Password must not be empty.")
    return _password_hash.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if the plain password matches the stored hash."""
    if not plain_password or not hashed_password:
        return False
    return _password_hash.verify(plain_password, hashed_password)


def hash_token(raw_token: str) -> str:
    """SHA-256 lookup hash for high-entropy tokens (email verify, password reset, refresh jti)."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
