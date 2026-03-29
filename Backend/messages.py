from __future__ import annotations

from datetime import datetime
import uuid
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, EmailStr

from database import get_db_connection
from security import verify_token
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/messages", tags=["Messages"])

# DB helpers
def _fetch_all(sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _fetch_one(sql: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
    rows = _fetch_all(sql, params)
    return rows[0] if rows else None


def _execute(sql: str, params: Tuple[Any, ...] = ()) -> int:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        return cur.rowcount
    finally:
        try:
            conn.close()
        except Exception:
            pass

# Auth helpers
def _payload_from_token(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization:
        return {}
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return verify_token(parts[1]) or {}
    return {}


def _resolve_user_id(user_id_query: Optional[int], authorization: Optional[str]) -> int:
    if user_id_query:
        return int(user_id_query)
    payload = _payload_from_token(authorization)
    if payload.get("user_id") is not None:
        return int(payload["user_id"])
    return 1


# API

@router.get("/inbox")
def inbox(
    limit: int = Query(50, ge=1, le=200, alias="limit"),
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(user_id, authorization)

    rows = _fetch_all(
        """
        SELECT
          m.message_id,
          m.subject,
          m.body,
          m.created_at,
          m.is_read,
          s.user_id AS sender_user_id,
          s.user_name AS sender_name,
          s.email AS sender_email,
          r.user_id AS receiver_user_id,
          r.user_name AS receiver_name,
          r.email AS receiver_email
        FROM messages m
        LEFT JOIN users s ON s.user_id = m.sender_user_id
        LEFT JOIN users r ON r.user_id = m.receiver_user_id
        WHERE m.receiver_user_id=%s
        ORDER BY m.created_at DESC
        LIMIT %s
        """,
        (uid, limit),
    )

    for r in rows:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()

    return {"items": rows}


@router.get("/sent")
def sent(
    limit: int = Query(50, ge=1, le=200, alias="limit"),
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(user_id, authorization)

    rows = _fetch_all(
        """
        SELECT
          m.message_id,
          m.subject,
          m.body,
          m.created_at,
          m.is_read,
          s.user_id AS sender_user_id,
          s.user_name AS sender_name,
          s.email AS sender_email,
          r.user_id AS receiver_user_id,
          r.user_name AS receiver_name,
          r.email AS receiver_email
        FROM messages m
        LEFT JOIN users s ON s.user_id = m.sender_user_id
        LEFT JOIN users r ON r.user_id = m.receiver_user_id
        WHERE m.sender_user_id=%s
        ORDER BY m.created_at DESC
        LIMIT %s
        """,
        (uid, limit),
    )

    for r in rows:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()

    return {"items": rows}


@router.get("/unread-count")
def unread_count(
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(user_id, authorization)
    row = _fetch_one("SELECT COUNT(*) AS cnt FROM messages WHERE receiver_user_id=%s AND is_read=0", (uid,))
    return {"count": int(row["cnt"]) if row else 0}


class SendMessageRequest(BaseModel):
    to_email: EmailStr
    subject: str
    body: str


@router.post("/send")
def send_message(
    payload: SendMessageRequest,
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    sender_id = _resolve_user_id(user_id, authorization)

    receiver = _fetch_one("SELECT user_id FROM users WHERE email=%s", (payload.to_email,))
    if not receiver:
        raise HTTPException(status_code=404, detail="Recipient email not found")

    mid = f"M{uuid.uuid4().hex[:10].upper()}"
    now = datetime.utcnow()

    _execute(
        """
        INSERT INTO messages (message_id, sender_user_id, receiver_user_id, subject, body, created_at, is_read)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (mid, sender_id, int(receiver["user_id"]), payload.subject, payload.body, now, 0),
    )

    return {"message_id": mid}


class MarkReadRequest(BaseModel):
    message_id: str


@router.post("/mark-read")
def mark_read(
    body: MarkReadRequest,
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(user_id, authorization)

    updated = _execute(
        "UPDATE messages SET is_read=1 WHERE receiver_user_id=%s AND message_id=%s",
        (uid, body.message_id),
    )
    return {"updated": updated}
