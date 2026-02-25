from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException, Query

from database import get_db_connection
from security import verify_token

router = APIRouter(prefix="/search", tags=["Search"])


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


def _company_id_from_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        payload = verify_token(parts[1])
        return payload.get("company_id")
    return None


def _require_auth(authorization: Optional[str]) -> Dict[str, Any]:
    """Ensure the request includes a valid JWT.

    We keep search protected because it exposes employee directory data.
    """

    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    payload = verify_token(parts[1])
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload