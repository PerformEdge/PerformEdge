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

        # ----------- GENDER -----------

        cursor.execute("""
            SELECT COALESCE(gender, 'Unknown') AS label, COUNT(*) AS value
            FROM employees
            WHERE company_id=%s
              AND employement_status='ACTIVE'
            GROUP BY gender
        """, (cid,))
        gender_chart = cursor.fetchall() or []

        # ----------- AGE -----------

        cursor.execute("""
            SELECT
              SUM(TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 20 AND 30) AS a1,
              SUM(TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 31 AND 40) AS a2,
              SUM(TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN 41 AND 50) AS a3,
              SUM(TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) >= 51) AS a4
            FROM employees
            WHERE company_id=%s
              AND employement_status='ACTIVE'
        """, (cid,))
        age = safe_fetchone(cursor)
        age_chart = [
            {"label": "20-30", "value": to_int(age.get("a1"))},
            {"label": "31-40", "value": to_int(age.get("a2"))},
            {"label": "41-50", "value": to_int(age.get("a3"))},
            {"label": "51+", "value": to_int(age.get("a4"))},
        ]

        # ----------- EMPLOYEE TYPE -----------

        cursor.execute("""
                        SELECT buckets.label, COALESCE(counts.value, 0) AS value
                        FROM (
                            SELECT 'Permanent' AS label
                            UNION ALL SELECT 'Consultants'
                            UNION ALL SELECT 'Probation'
                        ) AS buckets
                        LEFT JOIN (
                            SELECT
                                CASE
                                    WHEN LOWER(COALESCE(ec.contract_type, '')) IN ('full-time', 'permanent') THEN 'Permanent'
                                    WHEN LOWER(COALESCE(ec.contract_type, '')) = 'consultant' THEN 'Consultants'
                                    WHEN LOWER(COALESCE(ec.contract_type, '')) = 'probation' THEN 'Probation'
                                    ELSE NULL
                                END AS label,
                                COUNT(*) AS value
                            FROM employees e
                            LEFT JOIN employment_contract ec
                                ON ec.employee_id = e.employee_id
                             AND ec.is_current = 1
                            WHERE e.company_id=%s
                                AND e.employement_status='ACTIVE'
                            GROUP BY label
                        ) AS counts
                            ON counts.label = buckets.label
                """, (cid,))
        employee_type_chart = cursor.fetchall() or []
        employee_type_chart = [
            {
                "label": str(item.get("label") or "").lower(),
                "value": to_int(item.get("value")),
            }
            for item in employee_type_chart
        ]

        # ----------- ATTENDANCE -----------

        cursor.execute("""
            SELECT
              SUM(ast.status_name = 'Present') AS present,
              SUM(ast.status_name = 'Absent') AS absent
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            JOIN employees e ON e.employee_id = ar.employee_id
            WHERE e.company_id=%s
              AND e.employement_status='ACTIVE'
              AND ar.date_of_attendance BETWEEN %s AND %s
        """, (cid, start, end))
        att = safe_fetchone(cursor)

        attendance = {
            "present": to_int(att.get("present")),
            "absent": to_int(att.get("absent"))
        }

        # ----------- TOP PERFORMANCE -----------

        cursor.execute("""
            SELECT
              COALESCE(e.full_name, u.email) AS name,
              jr.role_name AS role,
              ROUND(AVG(pr.overall_score), 0) AS score
            FROM performance_reviews pr
            JOIN performance_cycle pc ON pc.cycle_id = pr.cycle_id
            LEFT JOIN employees e ON e.employee_id = pr.employee_id
            LEFT JOIN users u ON u.user_id = e.user_id
            LEFT JOIN job_roles jr ON jr.job_role_id = e.job_role_id
            WHERE e.company_id=%s
              AND e.employement_status='ACTIVE'
              AND pc.start_date <= %s AND pc.end_date >= %s
            GROUP BY e.employee_id, name, role
            ORDER BY score DESC
            LIMIT 5
        """, (cid, end, start))
        top_performers = cursor.fetchall() or []

        # ----------- CALENDAR -----------

        cursor.execute("""
            SELECT
              lr.leave_id,
              lr.started_date,
              lr.end_date,
              lr.reason,
              lr.leave_status,
              e.full_name
            FROM leave_records lr
            LEFT JOIN employees e ON e.employee_id = lr.employee_id
            WHERE e.company_id=%s
              AND e.employement_status='ACTIVE'
              AND lr.started_date <= %s AND lr.end_date >= %s
            ORDER BY lr.started_date
        """, (cid, end, start))
        calendar = cursor.fetchall() or []

        return {
            "cards": {
                "total_employee": total_employees,
                "new_employee": new_employees,
                "on_leave": on_leave,
                "over_time": overtime
            },
            "charts": {
                "gender": gender_chart,
                "age": age_chart,
                "employee_type": employee_type_chart,
                "attendance": attendance
            },
            "employee_performance": top_performers,
            "calendar": calendar
        }

    finally:
        cursor.close()
        conn.close()