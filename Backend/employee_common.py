"""Shared helpers for Employee dashboard routes.

Keeping auth + small DB helpers in one place reduces duplication while
allowing each feature area to live in its own router module.

Python compatibility: 3.9+
"""

from typing import Any, Dict, Optional

from fastapi import HTTPException

from database import get_database_connection
from security import verify_token


def _require_payload(authorization: Optional[str]) -> Dict[str, Any]:
    """Validate Bearer token and return a normalized payload."""

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Normalise user_id
    user_id = payload.get("sub") or payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        payload["user_id"] = int(user_id)
    except Exception:
        payload["user_id"] = user_id

    return payload


def _require_employee(payload: Dict[str, Any]) -> None:
    role = (payload.get("role") or "").lower()
    if role != "employee":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Please log in as Employee to view this page.",
        )


def _get_employee_id(payload: Dict[str, Any]) -> str:
    """Resolve employee_id for the logged-in user."""

    if payload.get("employee_id"):
        return str(payload["employee_id"])

    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT employee_id FROM employees WHERE user_id=%s",
        (payload["user_id"],),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    return str(row["employee_id"])


def _rating_for_score(company_id: str, score: Optional[float]) -> Optional[str]:
    """Map numeric score to rating label using performance_rating_scale."""

    if score is None:
        return None

    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT rating_name, min_score, max_score
        FROM performance_rating_scale
        WHERE company_id=%s
        ORDER BY min_score DESC
        """,
        (company_id,),
    )
    rows = cur.fetchall() or []
    conn.close()

    for r in rows:
        try:
            if float(r["min_score"]) <= float(score) <= float(r["max_score"]):
                return r["rating_name"]
        except Exception:
            continue

    return None
