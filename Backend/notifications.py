from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from database import get_db_connection
from security import verify_token

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# DB helpers

def _fetch_all(sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        try:
            conn.close()
        except Exception:
            pass


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
    # Fallback for local testing
    return 1

# API

@router.get("")
def list_notifications(
    limit: int = Query(50, ge=1, le=200, alias="limit"),
    unread_only: bool = Query(False, alias="unreadOnly"),
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(user_id, authorization)

    sql = """
      SELECT notification_id, messages, created_at, is_read
      FROM notifications
      WHERE user_id=%s
    """
    params: List[Any] = [uid]
    if unread_only:
        sql += " AND is_read=0"
    sql += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)

    rows = _fetch_all(sql, tuple(params))

    # Ensure JSON-friendly datetime serialization
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
    row = _fetch_all(
        "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=%s AND is_read=0",
        (uid,),
    )
    cnt = int(row[0]["cnt"]) if row else 0
    return {"count": cnt}


class MarkReadRequest(BaseModel):
    ids: List[str]


@router.post("/mark-read")
def mark_read(
    body: MarkReadRequest,
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(user_id, authorization)

    if not body.ids:
        raise HTTPException(status_code=400, detail="No notification ids provided")

    # Build placeholders for IN clause
    placeholders = ",".join(["%s"] * len(body.ids))
    sql = f"UPDATE notifications SET is_read=1 WHERE user_id=%s AND notification_id IN ({placeholders})"
    params = tuple([uid, *body.ids])

    updated = _execute(sql, params)
    return {"updated": updated}


@router.post("/mark-all-read")
def mark_all_read(
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(user_id, authorization)
    updated = _execute(
        "UPDATE notifications SET is_read=1 WHERE user_id=%s AND is_read=0",
        (uid,),
    )
    return {"updated": updated}
