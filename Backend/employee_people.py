from datetime import date
from typing import Optional

from fastapi import APIRouter, Header

from database import get_database_connection
from employee_common import _require_employee, _require_payload

router = APIRouter(prefix="/employee", tags=["Employee People"])


@router.get("/new-joiners")
def new_joiners(authorization: Optional[str] = Header(default=None), limit: int = 10):
    payload = _require_payload(authorization)
    _require_employee(payload)

    company_id = payload.get("company_id") or "C001"

    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT e.employee_id, e.full_name, e.employee_code, e.join_date, d.department_name
        FROM employees e
        LEFT JOIN departments d ON d.department_id = e.department_id
        WHERE e.company_id=%s
        ORDER BY e.join_date DESC
        LIMIT %s
        """,
        (company_id, limit),
    )
    rows = cur.fetchall() or []
    conn.close()

    return {
        "new_joiners": [
            {
                "employee_id": r.get("employee_id"),
                "employee_code": r.get("employee_code"),
                "full_name": r.get("full_name"),
                "department": r.get("department_name"),
                "join_date": r.get("join_date").isoformat() if r.get("join_date") else None,
            }
            for r in rows
        ]
    }


@router.get("/birthdays")
def upcoming_birthdays(
    authorization: Optional[str] = Header(default=None),
    max_days: int = 30,
    # Backwards/forwards compatibility: some UIs use ?days=...
    days: Optional[int] = None,
):
    payload = _require_payload(authorization)
    _require_employee(payload)

    if days is not None:
        max_days = days

    company_id = payload.get("company_id") or "C001"

    today = date.today()

    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT employee_id, employee_code, full_name, date_of_birth AS birth_date, d.department_name
        FROM employees e
        LEFT JOIN departments d ON d.department_id = e.department_id
        WHERE e.company_id=%s
          AND e.date_of_birth IS NOT NULL
        """,
        (company_id,),
    )
    rows = cur.fetchall() or []
    conn.close()

    upcoming = []
    for r in rows:
        bd: Optional[date] = r.get("birth_date")
        if not bd:
            continue
        next_bd = date(today.year, bd.month, bd.day)
        if next_bd < today:
            next_bd = date(today.year + 1, bd.month, bd.day)
        days_until = (next_bd - today).days
        if 0 <= days_until <= max_days:
            upcoming.append(
                {
                    "employee_id": r.get("employee_id"),
                    "employee_code": r.get("employee_code"),
                    "full_name": r.get("full_name"),
                    "department": r.get("department_name"),
                    "birth_date": bd.isoformat(),
                    "days_until": days_until,
                }
            )

    upcoming.sort(key=lambda x: x.get("days_until", 9999))

    return {"birthdays": upcoming}
