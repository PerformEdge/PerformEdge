from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import mysql.connector
import uuid
from datetime import date

from database import get_database_connection

router = APIRouter(prefix="/auth", tags=["Authentication"])

# SIGNUP 
class SignupRequest(BaseModel):
    company_id: str
    user_name: str
    job_role: str
    email: EmailStr
    password: str

@router.post("/signup")
def signup(data: SignupRequest):
    if not data.company_id.strip() or not data.user_name.strip() or not data.job_role.strip():
        raise HTTPException(status_code=400, detail="company_id, user_name and job_role are required")

    # because password column is varchar(6)
    if len(data.password) > 6:
        raise HTTPException(status_code=400, detail="Password must be 6 characters or less")

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT company_id FROM companies WHERE company_id = %s",
            (data.company_id,),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Invalid company_id (company not found)")

        cursor.execute("SELECT user_id FROM users WHERE email = %s", (data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        cursor.execute("SELECT user_id FROM users WHERE user_name = %s", (data.user_name,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username already taken")

        cursor.execute(
            """
            INSERT INTO users (company_id, email, password, status, user_name)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (data.company_id.strip(), data.email, data.password, "ACTIVE", data.user_name.strip()),
        )
        conn.commit()

        # Resolve or create job role for this company.
        normalized_job_role = data.job_role.strip()
        cursor.execute(
            """
            SELECT job_role_id
            FROM job_roles
            WHERE company_id = %s AND LOWER(TRIM(role_name)) = LOWER(TRIM(%s))
            LIMIT 1
            """,
            (data.company_id.strip(), normalized_job_role),
        )
        role_row = cursor.fetchone() or {}
        job_role_id = role_row.get("job_role_id")

        if not job_role_id:
            job_role_id = f"JR{uuid.uuid4().hex[:10].upper()}"
            cursor.execute(
                """
                INSERT INTO job_roles (job_role_id, company_id, role_name, role_level)
                VALUES (%s, %s, %s, %s)
                """,
                (job_role_id, data.company_id.strip(), normalized_job_role, 1),
            )
            conn.commit()

        # Assign a default role so the login screen can correctly gate
        # Employee vs Manager dashboards.
        # Default new users to EMPLOYEE.
        new_user_id = cursor.lastrowid
        try:
            cursor.execute("SELECT role_id FROM roles WHERE role_name='EMPLOYEE' LIMIT 1")
            role_row = cursor.fetchone()
            role_id = (role_row or {}).get("role_id") or "R003"

            ur_id = f"UR{uuid.uuid4().hex[:10].upper()}"
            cursor.execute(
                "INSERT INTO user_roles (user_role_id, user_id, role_id) VALUES (%s, %s, %s)",
                (ur_id, new_user_id, role_id),
            )
            conn.commit()
        except Exception:
            # If roles/user_roles tables are missing, don't fail signup; the
            # system can still work in demo mode.
            pass

        # Create an employee profile linked to the signed-up user.
        # This allows employee dashboard/profile APIs to resolve the user.
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
                    job_role_id,
                    new_user_id,
                    employee_code,
                    data.user_name.strip(),
                    "General",
                    date.today(),
                    "ACTIVE",
                ),
            )
            conn.commit()
        except Exception:
            # Keep auth signup available even if employee bootstrap fails
            # (e.g. partially provisioned schema in demo environments).
            pass

        return {"message": "Signup successful", "user_id": new_user_id}

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    finally:
        cursor.close()
        conn.close()