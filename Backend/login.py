from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from database import get_database_connection
from security import create_access_token
from psycopg2.extras import RealDictCursor
router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    # The UI has a toggle for Employee/Manager. We validate it on the backend to
    # prevent users from accessing the wrong dashboard by simply toggling the UI.
    login_as: Optional[Literal["employee", "manager"]] = None


@router.post("/login")
def login(data: LoginRequest):
    conn = get_database_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """
            SELECT user_id, company_id, email, password, status, user_name
            FROM users
            WHERE email = %s
            """,
            (data.email,),
        )
        user = cursor.fetchone()

        if not user or data.password != (user.get("password") or ""):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if (user.get("status") or "").lower() != "active":
            raise HTTPException(status_code=403, detail="User account is inactive")

        # Resolve role(s) for this user
        cursor.execute(
            """
            SELECT r.role_name
            FROM user_roles ur
            JOIN roles r ON r.role_id = ur.role_id
            WHERE ur.user_id = %s
            """,
            (user["user_id"],),
        )
        roles: List[str] = [
            str(r.get("role_name") or "").upper() for r in (cursor.fetchall() or [])
        ]

        # Map internal roles to the two login modes exposed in the UI.
        # Treat ADMIN / MANAGER / HR as "manager"; everything else is "employee".
        manager_role_names = {"ADMIN", "MANAGER", "HR"}
        role_category: str = (
            "manager" if any(r in manager_role_names for r in roles) else "employee"
        )

        # Validate the login mode selected in UI.
        if data.login_as and data.login_as != role_category:
            expected = "Manager" if role_category == "manager" else "Employee"
            chosen = "Manager" if data.login_as == "manager" else "Employee"
            raise HTTPException(
                status_code=403,
                detail=f"This account cannot log in as {chosen}. Please log in as {expected}.",
            )

        # Employee record (optional)
        cursor.execute(
            """
            SELECT
                e.employee_id,
                e.employee_code,
                e.full_name,
                d.department_name,
                l.location_name
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE e.user_id = %s
            """,
            (user["user_id"],),
        )
        emp = cursor.fetchone() or {}

        cursor.execute(
            "UPDATE users SET last_login = %s WHERE user_id = %s",
            (datetime.utcnow(), user["user_id"]),
        )
        conn.commit()

        token = create_access_token(
            {
                "user_id": int(user["user_id"]),
                "company_id": user["company_id"],
                "role": role_category,
                "roles": roles,
                "employee_id": emp.get("employee_id"),
                "employee_code": emp.get("employee_code"),
            }
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "role": role_category,
            "roles": roles,
            "user": {
                "user_id": user["user_id"],
                "company_id": user["company_id"],
                "email": user["email"],
                "user_name": user.get("user_name"),
                "employee_id": emp.get("employee_id"),
                "employee_code": emp.get("employee_code"),
                "full_name": emp.get("full_name"),
                "department": emp.get("department_name"),
                "location": emp.get("location_name"),
            },
        }
    finally:
        cursor.close()
        conn.close()
