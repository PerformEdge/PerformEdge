from datetime import date
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query

from database import get_database_connection
from security import verify_token

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
    except Exception:
        return default



def to_float(x, default=0.0):
    try:
        return float(x)
    except Exception:
        return default



def _full_years_on(today: date, born_on: Optional[date]) -> Optional[int]:
    if not born_on:
        return None
    years = today.year - born_on.year
    if (today.month, today.day) < (born_on.month, born_on.day):
        years -= 1
    return years


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
        cursor.execute(
            "SELECT COUNT(*) AS c FROM employees WHERE company_id=%s AND employement_status='ACTIVE'",
            (cid,),
        )
        total_employees = to_int(safe_fetchone(cursor).get("c"))

        cursor.execute(
            """
            SELECT COUNT(*) AS c
            FROM employees
            WHERE company_id=%s
              AND employement_status='ACTIVE'
              AND join_date BETWEEN %s AND %s
            """,
            (cid, start, end),
        )
        new_employees = to_int(safe_fetchone(cursor).get("c"))

        cursor.execute(
            """
            SELECT COUNT(*) AS c
            FROM leave_records lr
            JOIN employees e ON e.employee_id = lr.employee_id
            WHERE e.company_id=%s
              AND e.employement_status='ACTIVE'
              AND UPPER(COALESCE(lr.leave_status, '')) = 'APPROVED'
              AND lr.started_date <= %s
              AND lr.end_date >= %s
            """,
            (cid, end, start),
        )
        on_leave = to_int(safe_fetchone(cursor).get("c"))

        cursor.execute(
            """
            SELECT COALESCE(SUM(GREATEST(s.hours_worked - 8, 0)), 0) AS ot
            FROM attendance_sessions s
            JOIN attendance_records a ON a.attendance_id = s.attendance_id
            JOIN employees e ON e.employee_id = a.employee_id
            WHERE e.company_id=%s
              AND e.employement_status='ACTIVE'
              AND a.date_of_attendance BETWEEN %s AND %s
            """,
            (cid, start, end),
        )
        overtime = to_float(safe_fetchone(cursor).get("ot"))

        cursor.execute(
            """
            SELECT COALESCE(gender, 'Unknown') AS label, COUNT(*) AS value
            FROM employees
            WHERE company_id=%s
              AND employement_status='ACTIVE'
            GROUP BY gender
            """,
            (cid,),
        )
        gender_chart = cursor.fetchall() or []

        today = date.today()
        cursor.execute(
            """
            SELECT date_of_birth
            FROM employees
            WHERE company_id=%s
              AND employement_status='ACTIVE'
            """,
            (cid,),
        )
        age_rows = cursor.fetchall() or []
        age_buckets = {"20-30": 0, "31-40": 0, "41-50": 0, "51+": 0}
        for row in age_rows:
            age_years = _full_years_on(today, row.get("date_of_birth"))
            if age_years is None:
                continue
            if 20 <= age_years <= 30:
                age_buckets["20-30"] += 1
            elif 31 <= age_years <= 40:
                age_buckets["31-40"] += 1
            elif 41 <= age_years <= 50:
                age_buckets["41-50"] += 1
            elif age_years >= 51:
                age_buckets["51+"] += 1

        age_chart = [
            {"label": label, "value": value}
            for label, value in age_buckets.items()
        ]

        try:
            cursor.execute(
                """
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
                """,
                (cid,),
            )
            employee_type_chart = cursor.fetchall() or []
            employee_type_chart = [
                {
                    "label": str(item.get("label") or "").lower(),
                    "value": to_int(item.get("value")),
                }
                for item in employee_type_chart
            ]
        except Exception:
            employee_type_chart = [
                {"label": "permanent", "value": 0},
                {"label": "consultants", "value": 0},
                {"label": "probation", "value": 0},
            ]

        cursor.execute(
            """
            SELECT
              SUM(CASE WHEN ast.status_name = 'Present' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN ast.status_name = 'Absent' THEN 1 ELSE 0 END) AS absent
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            JOIN employees e ON e.employee_id = ar.employee_id
            WHERE e.company_id=%s
              AND e.employement_status='ACTIVE'
              AND ar.date_of_attendance BETWEEN %s AND %s
            """,
            (cid, start, end),
        )
        att = safe_fetchone(cursor)
        attendance = {
            "present": to_int(att.get("present")),
            "absent": to_int(att.get("absent")),
        }

        try:
            cursor.execute(
                """
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
                GROUP BY e.employee_id, e.full_name, u.email, jr.role_name
                ORDER BY score DESC
                LIMIT 5
                """,
                (cid, end, start),
            )
            top_performers = cursor.fetchall() or []
        except Exception:
            top_performers = []

        try:
            cursor.execute(
                """
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
                """,
                (cid, end, start),
            )
            calendar = cursor.fetchall() or []
        except Exception:
            calendar = []

        return {
            "cards": {
                "total_employee": total_employees,
                "new_employee": new_employees,
                "on_leave": on_leave,
                "over_time": overtime,
            },
            "charts": {
                "gender": gender_chart,
                "age": age_chart,
                "employee_type": employee_type_chart,
                "attendance": attendance,
            },
            "employee_performance": top_performers,
            "calendar": calendar,
        }
    finally:
        cursor.close()
        conn.close()
