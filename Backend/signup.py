from datetime import date
from typing import Literal
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from database import get_database_connection

router = APIRouter(prefix="/auth", tags=["Authentication"])


class SignupRequest(BaseModel):
    company_id: str
    user_name: str
    email: EmailStr
    password: str
    signup_as: Literal["employee", "manager"]


@router.post("/signup")
def signup(data: SignupRequest):
    if not data.company_id.strip() or not data.user_name.strip():
        raise HTTPException(status_code=400, detail="company_id and user_name are required")

    if len(data.password) > 6:
        raise HTTPException(status_code=400, detail="Password must be 6 characters or less")

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT company_id FROM companies WHERE company_id = %s",
            (data.company_id.strip(),),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Invalid company_id (company not found)")

        cursor.execute("SELECT user_id FROM users WHERE email = %s", (data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        cursor.execute("SELECT user_id FROM users WHERE user_name = %s", (data.user_name.strip(),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username already taken")

        cursor.execute(
            """
            INSERT INTO users (company_id, email, password, status, user_name)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                data.company_id.strip(),
                data.email,
                data.password,
                "ACTIVE",
                data.user_name.strip(),
            ),
        )
        conn.commit()

        new_user_id = getattr(cursor, "lastrowid", None)
        if not new_user_id:
            cursor.execute(
                "SELECT user_id FROM users WHERE email = %s ORDER BY user_id DESC LIMIT 1",
                (data.email,),
            )
            row = cursor.fetchone() or {}
            new_user_id = row.get("user_id")

        if not new_user_id:
            raise HTTPException(status_code=500, detail="Signup succeeded but user id could not be resolved")

        try:
            if data.signup_as == "manager":
                cursor.execute(
                    "SELECT role_id FROM roles WHERE role_name IN ('ADMIN','MANAGER','HR') LIMIT 1"
                )
            else:
                cursor.execute(
                    "SELECT role_id FROM roles WHERE role_name='EMPLOYEE' LIMIT 1"
                )

            role_row = cursor.fetchone() or {}
            role_id = role_row.get("role_id") or "R003"

            ur_id = f"UR{uuid.uuid4().hex[:10].upper()}"
            cursor.execute(
                "INSERT INTO user_roles (user_role_id, user_id, role_id) VALUES (%s, %s, %s)",
                (ur_id, int(new_user_id), role_id),
            )
            conn.commit()
        except Exception:
            # Keep signup working even if role bootstrap is not fully provisioned.
            conn.rollback()

        try:
            employee_id = f"E{uuid.uuid4().hex[:10].upper()}"
            employee_code = f"EMP-{str(new_user_id).zfill(4)}"
            cursor.execute(
                """
                INSERT INTO employees (
                    employee_id,
                    company_id,
                    job_role_id,
                    user_id,
                    employee_code,
                    full_name,
                    category,
                    join_date,
                    employement_status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    employee_id,
                    data.company_id.strip(),
                    None,
                    int(new_user_id),
                    employee_code,
                    data.user_name.strip(),
                    "General",
                    date.today(),
                    "ACTIVE",
                ),
            )
            conn.commit()
        except Exception:
            # Keep auth signup available even if employee bootstrap fails.
            conn.rollback()

        return {"message": "Signup successful", "user_id": int(new_user_id)}

    except HTTPException:
        raise
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
