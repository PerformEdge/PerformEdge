from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import random
from datetime import datetime, timedelta

from database import get_database_connection
from security import send_otp_email

otp_store = {}

router = APIRouter(prefix="/auth", tags=["Authentication"])

# FORGOT PASSWORD 
class SendOtpRequest(BaseModel):
    email: EmailStr
#otp part
@router.post("/send-otp")
def send_otp(data: SendOtpRequest):

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT user_id FROM users WHERE email=%s", (data.email,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=5)

    otp_store[data.email] = {"otp": otp, "expiry": expiry}

    send_otp_email(data.email, otp)

    return {"message": "OTP sent to your email"}

class ChangePasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str
#change pasword part
@router.post("/change-password")
def change_password(data: ChangePasswordRequest):

    if data.email not in otp_store:
        raise HTTPException(status_code=400, detail="OTP not requested")

    stored = otp_store[data.email]

    if datetime.utcnow() > stored["expiry"]:
        del otp_store[data.email]
        raise HTTPException(status_code=400, detail="OTP expired")

    if stored["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    conn = get_database_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE users SET password=%s WHERE email=%s",
        (data.new_password, data.email)
    )
    conn.commit()

    cursor.close()
    conn.close()

    del otp_store[data.email]

    return {"message": "Password changed successfully"}
