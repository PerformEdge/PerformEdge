from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime

from database import get_database_connection
from security import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# LOGIN 
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(data: LoginRequest):
    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT user_id, company_id, email, password, status, user_name
            FROM users
            WHERE email = %s
        """, (data.email,))
        user = cursor.fetchone()

        if not user or data.password != (user.get("password") or ""):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if (user.get("status") or "").lower() != "active":
            raise HTTPException(status_code=403, detail="User account is inactive")

        cursor.execute(
            "UPDATE users SET last_login = %s WHERE user_id = %s",
            (datetime.utcnow(), user["user_id"])
        )
        conn.commit()

        token = create_access_token({
            "user_id": user["user_id"],
            "company_id": user["company_id"]
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "user_id": user["user_id"],
                "company_id": user["company_id"],
                "email": user["email"],
                "user_name": user.get("user_name")
            }
        }
    finally:
        cursor.close()
        conn.close()