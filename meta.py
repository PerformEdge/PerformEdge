from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, Query

from database import get_db_connection
from security import verify_token

router = APIRouter(prefix="/meta", tags=["Meta"])

# Auth helpers

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


def _resolve_company_id(company_id_query: Optional[str], authorization: Optional[str]) -> str:
    # 1) Query param wins (useful for local testing)
    if company_id_query:
        return company_id_query

    # 2) Token
    cid = _company_id_from_token(authorization)
    if cid:
        return cid

    # 3) Fallback
    return "C001"

# Endpoints

@router.get("/departments")
def list_departments(
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Return departments for dropdowns."""

    cid = _resolve_company_id(company_id, authorization)
    rows = _fetch_all(
        """
        SELECT department_id AS id, department_name AS name
        FROM departments
        WHERE company_id=%s
        ORDER BY department_name ASC
        """,
        (cid,),
    )
    return {"items": rows}


@router.get("/locations")
def list_locations(
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Return locations for dropdowns."""

    cid = _resolve_company_id(company_id, authorization)
    rows = _fetch_all(
        """
        SELECT location_id AS id, location_name AS name
        FROM locations
        WHERE company_id=%s
        ORDER BY location_name ASC
        """,
        (cid,),
    )
    return {"items": rows}
