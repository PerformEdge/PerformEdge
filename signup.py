from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import mysql.connector
import uuid
from datetime import date
from typing import List, Literal, Optional

from database import get_database_connection

router = APIRouter(prefix="/auth", tags=["Authentication"])

# SIGNUP 
class SignupRequest(BaseModel):
    company_id: str
    user_name: str
    email: EmailStr
    password: str
    signup_as: Literal["employee", "manager"]