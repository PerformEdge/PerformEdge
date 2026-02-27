from fastapi import APIRouter, HTTPException, Query, Header
from fastapi.responses import StreamingResponse
from database import get_database_connection
import re
from datetime import datetime, timedelta
from typing import Optional, List
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch

router = APIRouter(prefix="/attendance-location", tags=["Attendance Location"])

# --- Get KPI summary ---
@router.get("/kpis")
def get_kpis(
    dateRange: Optional[str] = Query("", alias="dateRange"),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
        ):
    try:
        # resolve date range if provided; default to last 7 days
        def _resolve(date_range: Optional[str], default_days: int = 7):
            if dateRange:
                parts = re.split(r"\s+to\s+|\s+-\s+", dateRange)
                if len(parts) >= 2:
                    try:
                        s = datetime.strptime(parts[0].strip(), "%Y-%m-%d").date()
                        e = datetime.strptime(parts[1].strip(), "%Y-%m-%d").date()
                    except Exception:
                        raise HTTPException(status_code=400, detail="Invalid dateRange format. Use YYYY-MM-DD to YYYY-MM-DD")
                else:
                    raise HTTPException(status_code=400, detail="Invalid dateRange format. Use YYYY-MM-DD to YYYY-MM-DD")
            else:
                today = datetime.today().date()
                e = today
                s = today - timedelta(days=default_days - 1)
            return s, e

        # allow start & end as separate query params (fallback for frontend)
        if start and end:
            try:
                s = datetime.strptime(start.strip(), "%Y-%m-%d").date()
                e = datetime.strptime(end.strip(), "%Y-%m-%d").date()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid start/end format. Use YYYY-MM-DD")
        else:
            s, e = _resolve(dateRange)

        conn = get_database_connection()
        cur = conn.cursor(dictionary=True)

        # Total employees
        cur.execute("SELECT COUNT(*) AS total_employees FROM employees WHERE employement_status = 'ACTIVE'")
        total_employees = cur.fetchone()["total_employees"]

        # Remote employees (use location_name instead of work_type)
        cur.execute("""
            SELECT COUNT(*) AS remote_workers
            FROM employees e
            JOIN locations l ON e.location_id = l.location_id
            WHERE l.location_name = 'Remote' AND e.employement_status = 'ACTIVE'
        """)
        remote_workers = cur.fetchone()["remote_workers"]

        # Present today
        today = datetime.now().date()
        cur.execute("""
            SELECT COUNT(DISTINCT e.employee_id) AS present_today
            FROM employees e
            JOIN attendance_records ar ON e.employee_id = ar.employee_id
            JOIN attendance_status_type ast ON ar.status_id = ast.status_id
            WHERE ar.date_of_attendance = %s AND ast.status_name IN ('Present', 'Late', 'Work From Home')
            AND e.employement_status = 'ACTIVE'
        """, (today,))
        present_today = cur.fetchone()["present_today"] or 0

        # Absent today
        cur.execute("""
            SELECT COUNT(DISTINCT e.employee_id) AS absent_today
            FROM employees e
            LEFT JOIN attendance_records ar ON e.employee_id = ar.employee_id AND ar.date_of_attendance = %s
            WHERE (ar.attendance_id IS NULL OR 
                   ar.status_id IN (SELECT status_id FROM attendance_status_type WHERE status_name = 'Absent'))
            AND e.employement_status = 'ACTIVE'
        """, (today,))
        absent_today = cur.fetchone()["absent_today"] or 0

        conn.close()

        return {
            "totalEmployees": total_employees,
            "presentToday": present_today,
            "absentToday": absent_today,
            "remoteWorkers": remote_workers
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))