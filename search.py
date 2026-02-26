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


@router.get("")
def search(
    query: str = Query("", alias="query"),
    limit: int = Query(20, ge=1, le=50, alias="limit"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Global search used by the top search bar.

    For now, we search employees (name, email, employee_code).
    """

    _require_auth(authorization)
    # Default to the company in the JWT so search results stay scoped
    # to the logged-in organisation (Manager/Employee).
    if not company_id:
        company_id = _company_id_from_token(authorization)

    q = (query or "").strip()
    if not q:
        return {"query": q, "employees": []}

    like = f"%{q}%"

    base_sql = """
        SELECT
          e.employee_id,
          e.full_name AS name,
          e.employee_code,
          u.email,
          d.department_name AS department,
          l.location_name AS location,
          jr.role_name AS role
        FROM employees e
        LEFT JOIN users u ON u.user_id = e.user_id
        LEFT JOIN departments d ON d.department_id = e.department_id
        LEFT JOIN locations l ON l.location_id = e.location_id
        LEFT JOIN job_roles jr ON jr.job_role_id = e.job_role_id
        WHERE e.employement_status='ACTIVE'
          AND (
            e.full_name LIKE %s
            OR u.email LIKE %s
            OR e.employee_code LIKE %s
          )
        ORDER BY e.full_name ASC
        LIMIT %s
    """

    params: List[Any] = [like, like, like, limit]
    if company_id:
        # Optional scoping when explicitly requested.
        base_sql = base_sql.replace(
            "WHERE e.employement_status='ACTIVE'",
            "WHERE e.company_id=%s AND e.employement_status='ACTIVE'",
        )
        params = [company_id, like, like, like, limit]

    rows = _fetch_all(base_sql, tuple(params))

    return {"query": q, "employees": rows}
