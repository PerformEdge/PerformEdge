from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from database import get_db_connection
from security import verify_token

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _column_is_boolean(table_name: str, column_name: str) -> bool:
    """See messages.py for why this deliberately avoids caching."""
    conn = None
    cur = None
    try:
        conn = get_db_connection()

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
        sql += " AND is_read=%s"
        params.append(_flag_value("notifications", "is_read", False))
    sql += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)

    rows = _fetch_all(sql, tuple(params))

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
    unread_value = _flag_value("notifications", "is_read", False)
    rows = _fetch_all(
        "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=%s AND is_read=%s",
        (uid, unread_value),
    )
    cnt = int(rows[0]["cnt"]) if rows else 0
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

    placeholders = ",".join(["%s"] * len(body.ids))
    read_value = _flag_value("notifications", "is_read", True)
    sql = (
        f"UPDATE notifications SET is_read=%s "
        f"WHERE user_id=%s AND notification_id IN ({placeholders})"
    )
    params = tuple([read_value, uid, *body.ids])

    updated = _execute(sql, params)
    return {"updated": updated}


@router.post("/mark-all-read")
def mark_all_read(
    user_id: Optional[int] = Query(None, alias="user_id"),
    authorization: Optional[str] = Header(None),
):
    uid = _resolve_user_id(user_id, authorization)
    read_value = _flag_value("notifications", "is_read", True)
    unread_value = _flag_value("notifications", "is_read", False)
    updated = _execute(
        "UPDATE notifications SET is_read=%s WHERE user_id=%s AND is_read=%s",
        (read_value, uid, unread_value),
    )
    return {"updated": updated}
