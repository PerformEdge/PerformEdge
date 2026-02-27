from fastapi import APIRouter, Header, Query, HTTPException
from datetime import date
from typing import Optional

from security import verify_token
from database import get_database_connection

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _payload_from_auth(authorization: Optional[str]) -> dict:
    if not authorization:
        return {}
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return {}
    try:
        return verify_token(parts[1]) or {}
    except Exception:
        return {}


def _resolve_company_id(company_id_query: Optional[str], authorization: Optional[str]) -> str:
    if company_id_query:
        return company_id_query
    payload = _payload_from_auth(authorization)
    cid = payload.get("company_id") if isinstance(payload, dict) else None
    return str(cid) if cid else "C001"


def safe_fetchone(cursor):
    row = cursor.fetchone()
    return row if row else {}


def to_int(x, default=0):
    try:
        return int(x)
    except:
        return default


def to_float(x, default=0.0):
    try:
        return float(x)
    except:
        return default


@router.get("/overview")
def dashboard_overview(
    start: date,
    end: date,
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    if start > end:
        raise HTTPException(status_code=400, detail="Invalid date range: start cannot be after end")

    cid = _resolve_company_id(company_id, authorization)
    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # ----------- CARDS -----------

        cursor.execute("SELECT COUNT(*) AS c FROM employees WHERE company_id=%s AND employement_status='ACTIVE'", (cid,))
        total_employees = to_int(safe_fetchone(cursor).get("c"))

        cursor.execute("""
            SELECT COUNT(*) AS c
            FROM employees
            WHERE company_id=%s
              AND employement_status='ACTIVE'
              AND join_date BETWEEN %s AND %s
        """, (cid, start, end))
        new_employees = to_int(safe_fetchone(cursor).get("c"))

        cursor.execute("""
            SELECT COUNT(*) AS c
            FROM leave_records lr
            JOIN employees e ON e.employee_id = lr.employee_id
            WHERE e.company_id=%s
              AND e.employement_status='ACTIVE'
              AND UPPER(COALESCE(lr.leave_status, '')) = 'APPROVED'
              AND lr.started_date <= %s
              AND lr.end_date >= %s
        """, (cid, end, start))
        on_leave = to_int(safe_fetchone(cursor).get("c"))

        cursor.execute("""
            SELECT COALESCE(SUM(GREATEST(s.hours_worked - 8, 0)), 0) AS ot
            FROM attendance_sessions s
            JOIN attendance_records a ON a.attendance_id = s.attendance_id
            JOIN employees e ON e.employee_id = a.employee_id
            WHERE e.company_id=%s
              AND e.employement_status='ACTIVE'
              AND a.date_of_attendance BETWEEN %s AND %s
        """, (cid, start, end))
        overtime = to_float(safe_fetchone(cursor).get("ot"))