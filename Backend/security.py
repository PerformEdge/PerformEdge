"""JWT helpers.

This project uses a very small auth layer built on top of jose.

Important:
- Tokens are expected to carry a standard `sub` claim (subject) with the user_id.
- For convenience we also keep `user_id` in the payload.

If you change JWT_SECRET between restarts, previously issued tokens will become invalid.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
import os
import smtplib
import base64
import hashlib
import hmac
import secrets
from email.message import EmailMessage
from cryptography.fernet import Fernet
from jose import JWTError, jwt

ALGORITHM = "HS256"


def _get_secret() -> str:
    # Prefer JWT_SECRET (documented), but allow SECRET_KEY for compatibility.
    return (
        os.getenv("JWT_SECRET")
        or os.getenv("SECRET_KEY")
        or "sdgp_dev_secret"  # development fallback
    )


# Read once at import (FastAPI/uvicorn reload will re-import on code changes).
SECRET_KEY = _get_secret()

# Default 60 minutes; override with JWT_EXPIRE_MINUTES
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", str(365 * 24 * 60)))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT.

    Ensures a standard `sub` claim exists when `user_id` is provided.
    """

    to_encode = data.copy()

    # Make sure we always have `sub` for downstream auth checks.
    if "sub" not in to_encode and "user_id" in to_encode:
        to_encode["sub"] = str(to_encode["user_id"])

    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify and decode JWT.

    Returns an empty dict when verification fails.
    """

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return {}

# SECURITY

SECRET_KEY = os.getenv("JWT_SECRET", "CHANGE_THIS_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

GMAIL_USER = "performedge.sdgp@gmail.com"
GMAIL_APP_PASSWORD = "yynevyhblldnmgjv"   # 16-digit app password


def send_otp_email(to_email: str, otp: str):
    msg = EmailMessage()
    msg.set_content(f"Your OTP for password reset is: {otp}")
    msg["Subject"] = "Password Reset OTP"
    msg["From"] = GMAIL_USER
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        smtp.send_message(msg)


def _get_data_encryption_key() -> bytes:
    """Return a Fernet-compatible key for employee data encryption.

    Priority:
    1. DATA_ENCRYPTION_KEY (must already be a valid Fernet key)
    2. Derived key from SECRET_KEY
    """
    raw_key = os.getenv("DATA_ENCRYPTION_KEY")
    if raw_key:
        return raw_key.encode("utf-8")

    digest = hashlib.sha256(SECRET_KEY.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def Data_security_encrypt(data: str) -> str:
    """Encrypt employee data using symmetric encryption."""
    try:
        cipher = Fernet(_get_data_encryption_key())
        encrypted = cipher.encrypt(data.encode("utf-8"))
        return encrypted.decode("utf-8")
    except Exception as exc:
        raise ValueError(f"Encryption failed: {exc}") from exc


def Data_security_decrypt(encrypted_data: str) -> str:
    """Decrypt employee data that was encrypted with Data_security_encrypt."""
    try:
        cipher = Fernet(_get_data_encryption_key())
        decrypted = cipher.decrypt(encrypted_data.encode("utf-8"))
        return decrypted.decode("utf-8")
    except Exception as exc:
        raise ValueError(f"Decryption failed: {exc}") from exc


def Data_security_generate_key() -> str:
    """Generate a new Fernet key to use as DATA_ENCRYPTION_KEY."""
    return Fernet.generate_key().decode("utf-8")


def Data_security_hash(data: str, salt: Optional[str] = None) -> str:
    """Hash sensitive employee data using PBKDF2-HMAC-SHA256.

    Returns a storage-safe string in format: <salt_hex>$<hash_hex>
    """
    salt_bytes = bytes.fromhex(salt) if salt else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", data.encode("utf-8"), salt_bytes, 200000)
    return f"{salt_bytes.hex()}${digest.hex()}"


def Data_security_verify_hash(data: str, stored_hash: str) -> bool:
    """Verify plaintext data against a stored Data_security_hash value."""
    try:
        salt_hex, expected_hex = stored_hash.split("$", 1)
        recalculated = Data_security_hash(data, salt=salt_hex)
        return hmac.compare_digest(recalculated, f"{salt_hex}${expected_hex}")
    except Exception:
        return False


def Data_security_mask(data: str, visible_chars: int = 4) -> str:
    """Mask employee data for safe display in logs/responses.

    Example: ABCDEFGH -> ****EFGH
    """
    if not data:
        return ""
    if visible_chars < 0:
        raise ValueError("visible_chars must be >= 0")
    if len(data) <= visible_chars:
        return "*" * len(data)
    return ("*" * (len(data) - visible_chars)) + data[-visible_chars:]