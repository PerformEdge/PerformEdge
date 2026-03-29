from __future__ import annotations

from datetime import datetime
import uuid
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, EmailStr

from database import get_db_connection
from security import verify_token

router = APIRouter(prefix="/messages", tags=["Messages"])


def _column_is_boolean(table_name: str, column_name: str) -> bool:
    """
    Decide whether a flag column is stored as a real boolean or as 0/1.

    Render uses PostgreSQL, while the original project was written for MySQL.
    PostgreSQL returns Python bool values for boolean columns; MySQL commonly
    stores these flags as tinyint(1), which come back as ints.

    We intentionally avoid caching here. A failed first lookup would otherwise
    cache a wrong answer and keep causing `boolean = integer` errors for the
    lifetime of the process.
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()

        # First, inspect a real value if one exists.
        cur = conn.cursor()
        cur.execute(
            f"SELECT {column_name} FROM {table_name} WHERE {column_name} IS NOT NULL LIMIT 1"
        )
        sample = cur.fetchone()
        if sample is not None:
            if isinstance(sample, dict):
                value = sample.get(column_name)
                if value is None and sample:
                    value = next(iter(sample.values()))
            else:
                value = sample[0] if isinstance(sample, (list, tuple)) and sample else sample

            if isinstance(value, bool):
                return True
            if isinstance(value, int) and not isinstance(value, bool):
                return False

        try:
            cur.close()
        except Exception:
            pass

        # Fallback to metadata lookup.
        cur = conn.cursor()
        cur.execute(
            """
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
            LIMIT 1
            """,
            (table_name, column_name),
        )
        row = cur.fetchone()
        if not row:
            return False

        if isinstance(row, dict):
            data_type = row.get("data_type")
        else:
            data_type = row[0] if isinstance(row, (list, tuple)) and row else row

        return str(data_type or "").lower() == "boolean"
    except Exception:
        return False
    finally:
        try:
            if cur is not None:
                cur.close()
        except Exception:
            pass
        try:
            if conn is not None:
                conn.close()
        except Exception:
            pass



def _flag_value(table_name: str, column_name: str, truthy: bool):
    return bool(truthy) if _column_is_boolean(table_name, column_name) else int(truthy)



def _fetch_all(sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cur = None
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        try:
            if cur is not None:
                cur.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass



def _fetch_one(sql: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
    rows = _fetch_all(sql, params)
    return rows[0] if rows else None



def _execute(sql: str, params: Tuple[Any, ...] = ()) -> int:
    conn = get_db_connection()
    cur = None
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        return cur.rowcount
    finally:
        try:
            if cur is not None:
                cur.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass



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

    for row in rows:
        if isinstance(row.get("created_at"), datetime):
            row["created_at"] = row["created_at"].isoformat()

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

    for row in rows:
        if isinstance(row.get("created_at"), datetime):
            row["created_at"] = row["created_at"].isoformat()

    return {"items": rows}


@router.get("/unread-count")
def unread_count(
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(user_id, authorization)
    unread_value = _flag_value("messages", "is_read", False)
    row = _fetch_one(
        "SELECT COUNT(*) AS cnt FROM messages WHERE receiver_user_id=%s AND is_read=%s",
        (uid, unread_value),
    )
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
    unread_value = _flag_value("messages", "is_read", False)

    _execute(
        """
        INSERT INTO messages (message_id, sender_user_id, receiver_user_id, subject, body, created_at, is_read)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            mid,
            sender_id,
            int(receiver["user_id"]),
            payload.subject,
            payload.body,
            now,
            unread_value,
        ),
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
    read_value = _flag_value("messages", "is_read", True)

    updated = _execute(
        "UPDATE messages SET is_read=%s WHERE receiver_user_id=%s AND message_id=%s",
        (read_value, uid, body.message_id),
    )
    return {"updated": updated}
