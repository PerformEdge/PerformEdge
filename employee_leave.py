import random
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from database import get_database_connection
from employee_common import _get_employee_id, _require_employee, _require_payload
from employee_dashboard import employee_dashboard_overview

router = APIRouter(prefix="/employee", tags=["Employee Leave"])


class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None


@router.get("/leave/summary")
def my_leave_summary(authorization: Optional[str] = Header(default=None)):
    payload = _require_payload(authorization)
    _require_employee(payload)

    # Reuse overview calculations (small DB cost, keeps behaviour consistent)
    data = employee_dashboard_overview(authorization)
    return data["leave"]


@router.get("/leave/records")
def my_leave_records(authorization: Optional[str] = Header(default=None)):
    payload = _require_payload(authorization)
    _require_employee(payload)

    employee_id = _get_employee_id(payload)

    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT leave_id AS leave_record_id,
               leave_type,
               started_date AS start_date,
               end_date,
               leave_status,
               reason
        FROM leave_records
        WHERE employee_id=%s
        ORDER BY started_date DESC
        LIMIT 100
        """,
        (employee_id,),
    )
    rows = cur.fetchall() or []
    conn.close()

    records = []
    for r in rows:
        try:
            days = (r["end_date"] - r["start_date"]).days + 1
        except Exception:
            days = None
        records.append(
            {
                "leave_record_id": r.get("leave_record_id"),
                "leave_type": r.get("leave_type"),
                "start_date": r.get("start_date").isoformat() if r.get("start_date") else None,
                "end_date": r.get("end_date").isoformat() if r.get("end_date") else None,
                "days": days,
                "status": r.get("leave_status"),
                "reason": r.get("reason"),
            }
        )

    return {"records": records}


@router.post("/leave/request")
def request_leave(payload_in: LeaveRequestCreate, authorization: Optional[str] = Header(default=None)):
    payload = _require_payload(authorization)
    _require_employee(payload)

    employee_id = _get_employee_id(payload)

    # Basic validation
    if payload_in.end_date < payload_in.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    leave_id = f"LR{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{random.randint(100, 999)}"

    conn = get_database_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO leave_records
        (leave_id, employee_id, leave_type, started_date, end_date, reason, leave_status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            leave_id,
            employee_id,
            payload_in.leave_type,
            payload_in.start_date,
            payload_in.end_date,
            payload_in.reason or "",
            "PENDING",
        ),
    )
    conn.commit()
    conn.close()

    return {"ok": True, "leave_record_id": leave_id}