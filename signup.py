from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import mysql.connector

from database import get_database_connection

router = APIRouter(prefix="/auth", tags=["Authentication"])

# SIGNUP 
class SignupRequest(BaseModel):
    company_id: str
    user_name: str
    email: EmailStr
    password: str

@router.post("/signup")
def signup(data: SignupRequest):
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
            (data.company_id, data.email, data.password, "active", data.user_name),
        )
        conn.commit()

        return {"message": "Signup successful", "user_id": cursor.lastrowid}

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    finally:
        cursor.close()
        conn.close()
