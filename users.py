from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from database import get_database_connection
from security import verify_token

router = APIRouter(prefix="/users", tags=["Users"])


_MANAGER_ROLE_NAMES = {"ADMIN", "MANAGER", "HR"}


def _require_payload(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Support either `sub` (preferred) or legacy `user_id`.
    user_id = payload.get("sub") or payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Normalise to int when possible
    try:
        payload["user_id"] = int(user_id)
    except Exception:
        payload["user_id"] = user_id

    return payload


@router.get("/me")
def me(authorization: Optional[str] = Header(default=None)):
    payload = _require_payload(authorization)
    user_id = payload["user_id"]

    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)

    # User basics
    cur.execute(
        "SELECT user_id, user_name, email, company_id FROM users WHERE user_id=%s",
        (user_id,),
    )
    user = cur.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    # Company name (optional)
    cur.execute(
        "SELECT company_name FROM companies WHERE company_id=%s",
        (user["company_id"],),
    )
    c = cur.fetchone()
    company_name = c["company_name"] if c else None

    # Roles
    cur.execute(
        """
        SELECT r.role_name
        FROM user_roles ur
        JOIN roles r ON r.role_id = ur.role_id
        WHERE ur.user_id = %s
        """,
        (user_id,),
    )
    roles = [r["role_name"] for r in cur.fetchall()]
    role_category = (
        "manager" if any(r in _MANAGER_ROLE_NAMES for r in roles) else "employee"
    )

    # Employee profile (if the user is linked to an employee record)
    cur.execute(
        """
        SELECT
            e.employee_id,
            e.employee_code,
            e.full_name,
            e.department_id,
            d.department_name,
            e.location_id,
            l.location_name
        FROM employees e
        LEFT JOIN departments d ON d.department_id = e.department_id
        LEFT JOIN locations l ON l.location_id = e.location_id
        WHERE e.user_id = %s
        """,
        (user_id,),
    )
    emp = cur.fetchone() or {}

    conn.close()

    return {
        "user_id": user["user_id"],
        "user_name": user["user_name"],
        "email": user["email"],
        "company_id": user["company_id"],
        "company_name": company_name,
        "role": role_category,
        "roles": roles,
        "employee_id": emp.get("employee_id"),
        "employee_code": emp.get("employee_code"),
        "full_name": emp.get("full_name") or user["user_name"],
        "department": emp.get("department_name"),
        "location": emp.get("location_name"),
    }