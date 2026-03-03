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
from email.message import EmailMessage
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

GMAIL_USER = "sdgpperformeedge@gmail.com"
GMAIL_APP_PASSWORD = "uitsfmidykxzzeig"  


def send_otp_email(to_email: str, otp: str):
    msg = EmailMessage()
    msg.set_content(f"Your OTP for password reset is: {otp}")
    msg["Subject"] = "Password Reset OTP"
    msg["From"] = GMAIL_USER
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        smtp.send_message(msg)