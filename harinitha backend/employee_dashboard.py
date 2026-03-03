from datetime import date
from typing import Any, List, Optional

from fastapi import APIRouter, Header

from database import get_database_connection
from employee_common import _get_employee_id, _rating_for_score, _require_employee, _require_payload

router = APIRouter(prefix="/employee", tags=["Employee Dashboard"])


@router.get("/dashboard/overview")
def employee_dashboard_overview(authorization: Optional[str] = Header(default=None)):
    """Employee home dashboard.

    Returns a compact set of widgets for the employee landing page:
    - leave summary
    - performance trend
    - training summary
    - new joiners + upcoming birthdays (company)
    """

    payload = _require_payload(authorization)
    _require_employee(payload)

    company_id = payload.get("company_id") or "C001"
    employee_id = _get_employee_id(payload)

    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)

    # Employee basic profile
    cur.execute(
        """
        SELECT
            e.employee_id,
            e.employee_code,
            e.full_name,
            d.department_name,
            l.location_name,
            e.join_date,
            e.date_of_birth AS birth_date
        FROM employees e
        LEFT JOIN departments d ON d.department_id = e.department_id
        LEFT JOIN locations l ON l.location_id = e.location_id
        WHERE e.employee_id=%s
        """,
        (employee_id,),
    )
    employee = cur.fetchone() or {}

    # Leave summary

    entitlements = {
        "Annual": 14,
        "Sick": 7,
        "Casual": 7,
    }

    # If an entitlements table exists, prefer DB-driven totals.
    try:
        cur.execute(
            "SELECT leave_type, total_days FROM leave_entitlements WHERE employee_id=%s",
            (employee_id,),
        )
        rows = cur.fetchall() or []
        if rows:
            entitlements = {r["leave_type"]: int(r["total_days"]) for r in rows}
    except Exception:
        # Keep defaults when the table is not present.
        pass

    today = date.today()
    year_start = date(today.year, 1, 1)
    year_end = date(today.year, 12, 31)

    cur.execute(
        """
        SELECT leave_type, started_date AS start_date, end_date, leave_status
        FROM leave_records
        WHERE employee_id=%s
          AND started_date BETWEEN %s AND %s
        ORDER BY started_date DESC
        """,
        (employee_id, year_start, year_end),
    )
    leave_rows = cur.fetchall() or []

    used_by_type: dict = {k: 0 for k in entitlements.keys()}
    pending_count = 0
    next_leave = None

    for lr in leave_rows:
        lt = lr.get("leave_type") or "Other"
        status = (lr.get("leave_status") or "").upper()

        # days
        try:
            days = (lr["end_date"] - lr["start_date"]).days + 1
        except Exception:
            days = 0

        if status in {"APPROVED", "APPROVE", "APPROVED "}:
            used_by_type[lt] = used_by_type.get(lt, 0) + max(days, 0)
            if lr.get("start_date") and lr["start_date"] >= today:
                if next_leave is None or lr["start_date"] < next_leave:
                    next_leave = lr["start_date"]
        elif status in {"PENDING"}:
            pending_count += 1

    leave_by_type: List[dict] = []
    total_entitled = 0
    total_used = 0

    for lt in sorted(set(list(entitlements.keys()) + list(used_by_type.keys()))):
        total = int(entitlements.get(lt, 0))
        used = int(used_by_type.get(lt, 0))
        remaining = max(total - used, 0)
        leave_by_type.append(
            {
                "leave_type": lt,
                "total": total,
                "used": used,
                "remaining": remaining,
            }
        )
        total_entitled += total
        total_used += used

    leave_summary = {
        "year": today.year,
        "total_entitled": total_entitled,
        "used": total_used,
        "remaining": max(total_entitled - total_used, 0),
        "pending_requests": pending_count,
        "next_approved_leave": next_leave.isoformat() if next_leave else None,
        "by_type": leave_by_type,
    }

    # Performance summary + trend

    cur.execute(
        """
        SELECT
            pr.review_id,
            pr.cycle_id,
            pc.name AS cycle_name,
            pc.end_date,
            pr.created_at AS review_date,
            pr.overall_score,
            pr.comments AS review_comments
        FROM performance_reviews pr
        JOIN performance_cycle pc ON pc.cycle_id = pr.cycle_id
        WHERE pr.employee_id=%s
        ORDER BY pc.end_date DESC, pr.created_at DESC
        LIMIT 6
        """,
        (employee_id,),
    )
    perf_rows = cur.fetchall() or []

    latest = perf_rows[0] if perf_rows else None
    latest_score = float(latest["overall_score"]) if latest and latest.get("overall_score") is not None else None
    latest_rating = _rating_for_score(company_id, latest_score)

    trend: List[dict] = []
    for r in reversed(perf_rows):
        s = float(r["overall_score"]) if r.get("overall_score") is not None else None
        trend.append(
            {
                "cycle_id": r.get("cycle_id"),
                "cycle_name": r.get("cycle_name"),
                "end_date": r.get("end_date").isoformat() if r.get("end_date") else None,
                "score": s,
                "rating": _rating_for_score(company_id, s),
            }
        )

    criteria: List[dict] = []
    if latest and latest.get("review_id"):
        cur.execute(
            """
            SELECT c.criteria_name, s.score, c.weight AS max_score
            FROM performance_scores s
            JOIN performance_criteria c ON c.criteria_id = s.criteria_id
            WHERE s.review_id=%s
            ORDER BY c.criteria_name
            """,
            (latest["review_id"],),
        )
        for row in cur.fetchall() or []:
            criteria.append(
                {
                    "criteria": row.get("criteria_name"),
                    "score": float(row.get("score") or 0),
                    "max_score": float(row.get("max_score") or 0),
                }
            )

    performance = {
        "latest_score": latest_score,
        "latest_rating": latest_rating,
        "latest_review_date": latest.get("review_date").isoformat() if latest and latest.get("review_date") else None,
        "latest_comments": latest.get("review_comments") if latest else None,
        "trend": trend,
        "criteria": criteria,
    }

    # Training summary

    cur.execute(
        """
        SELECT
            status,
            COUNT(*) AS cnt
        FROM training_requests
        WHERE employee_id=%s
        GROUP BY status
        """,
        (employee_id,),
    )
    tr_rows = cur.fetchall() or []
    training = {"recommended": 0, "requested": 0, "total": 0}
    for r in tr_rows:
        st = (r.get("status") or "").upper()
        cnt = int(r.get("cnt") or 0)
        if st == "APPROVED":
            training["recommended"] += cnt
        else:
            training["requested"] += cnt
        training["total"] += cnt

    # New joiners (company)

    cur.execute(
        """
        SELECT e.employee_id, e.full_name, e.employee_code, e.join_date, d.department_name
        FROM employees e
        LEFT JOIN departments d ON d.department_id = e.department_id
        WHERE e.company_id=%s
        ORDER BY e.join_date DESC
        LIMIT 6
        """,
        (company_id,),
    )
    new_joiners = [
        {
            "employee_id": r.get("employee_id"),
            "employee_code": r.get("employee_code"),
            "full_name": r.get("full_name"),
            "department": r.get("department_name"),
            "join_date": r.get("join_date").isoformat() if r.get("join_date") else None,
        }
        for r in (cur.fetchall() or [])
    ]

    # Upcoming birthdays (company)

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
    b_rows = cur.fetchall() or []

    upcoming: List[dict] = []
    for r in b_rows:
        bd: Optional[date] = r.get("birth_date")
        if not bd:
            continue
        # next birthday date
        next_bd = date(today.year, bd.month, bd.day)
        if next_bd < today:
            next_bd = date(today.year + 1, bd.month, bd.day)
        days_until = (next_bd - today).days
        if 0 <= days_until <= 30:
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
    birthdays = upcoming[:8]

    conn.close()

    return {
        "employee": {
            "employee_id": employee.get("employee_id"),
            "employee_code": employee.get("employee_code"),
            "full_name": employee.get("full_name"),
            "department": employee.get("department_name"),
            "location": employee.get("location_name"),
        },
        "leave": leave_summary,
        "performance": performance,
        "training": training,
        "new_joiners": new_joiners,
        "birthdays": birthdays,
    }