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

# --- 7-day attendance trend ---
@router.get("/trend7days")
def trend_7days(dateRange: Optional[str] = Query("", alias="dateRange"), start: Optional[str] = Query(None), end: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    try:
        # resolve date range if provided; default to past 7 days
        if start and end:
            try:
                start_date = datetime.strptime(start.strip(), "%Y-%m-%d").date()
                end_date = datetime.strptime(end.strip(), "%Y-%m-%d").date()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid start/end format. Use YYYY-MM-DD")
        elif dateRange:
            parts = re.split(r"\s+to\s+|\s+-\s+", dateRange)
            if len(parts) >= 2:
                try:
                    start_date = datetime.strptime(parts[0].strip(), "%Y-%m-%d").date()
                    end_date = datetime.strptime(parts[1].strip(), "%Y-%m-%d").date()
                except Exception:
                    raise HTTPException(status_code=400, detail="Invalid dateRange format. Use YYYY-MM-DD to YYYY-MM-DD")
            else:
                raise HTTPException(status_code=400, detail="Invalid dateRange format. Use YYYY-MM-DD to YYYY-MM-DD")
        else:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=6)

        conn = get_database_connection()
        cur = conn.cursor(dictionary=True)

        # Get data for the requested date range
        cur.execute("""
            SELECT DATE(ar.date_of_attendance) AS label,
                   l.location_name,
                   COUNT(*) AS present_count
            FROM employees e
            JOIN locations l ON e.location_id = l.location_id
            JOIN attendance_records ar ON e.employee_id = ar.employee_id
            JOIN attendance_status_type ast ON ar.status_id = ast.status_id
            WHERE ar.date_of_attendance BETWEEN %s AND %s
            AND ast.status_name IN ('Present', 'Late', 'Work From Home')
            AND e.employement_status = 'ACTIVE'
            GROUP BY label, l.location_name
            ORDER BY label ASC
        """, (start_date, end_date))
        rows = cur.fetchall()
        conn.close()

        # Prepare data for chart
        labels = sorted(list({str(row["label"]) for row in rows}))
        location_names = sorted(list({row["location_name"] for row in rows}))

        datasets = []
        for loc in location_names:
            data = [next((r["present_count"] for r in rows if str(r["label"]) == lbl and r["location_name"] == loc), 0)
                    for lbl in labels]
            datasets.append({"label": loc, "data": data})

        return {"labels": labels, "datasets": datasets}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# --- Location summary endpoint ---
@router.get("/summary")
def location_summary(dateRange: Optional[str] = Query("", alias="dateRange"), start: Optional[str] = Query(None), end: Optional[str] = Query(None), location: Optional[str] = Query(None), department: Optional[str] = Query(None)):
    try:
        # resolve date range if provided; default to today (summary for a single day)
        if start and end:
            try:
                start_date = datetime.strptime(start.strip(), "%Y-%m-%d").date()
                end_date = datetime.strptime(end.strip(), "%Y-%m-%d").date()
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid start/end format. Use YYYY-MM-DD")
            today = end_date
        elif dateRange:
            parts = re.split(r"\s+to\s+|\s+-\s+", dateRange)
            if len(parts) >= 2:
                try:
                    start_date = datetime.strptime(parts[0].strip(), "%Y-%m-%d").date()
                    end_date = datetime.strptime(parts[1].strip(), "%Y-%m-%d").date()
                except Exception:
                    raise HTTPException(status_code=400, detail="Invalid dateRange format. Use YYYY-MM-DD to YYYY-MM-DD")
            else:
                raise HTTPException(status_code=400, detail="Invalid dateRange format. Use YYYY-MM-DD to YYYY-MM-DD")
            # for summary we use the end_date to show attendance for that day
            today = end_date
        else:
            today = datetime.now().date()

        conn = get_database_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT l.location_id,
                   l.location_name AS name,
                   SUM(CASE WHEN ast.status_name IN ('Present', 'Late', 'Work From Home') THEN 1 ELSE 0 END) AS present,
                   SUM(CASE WHEN ast.status_name = 'Absent' THEN 1 ELSE 0 END) AS absent,
                   COUNT(DISTINCT CASE WHEN ast.status_name IS NOT NULL THEN e.employee_id END) AS marked,
                   COUNT(DISTINCT e.employee_id) AS total_in_location
            FROM locations l
            LEFT JOIN employees e ON l.location_id = e.location_id AND e.employement_status = 'ACTIVE'
            LEFT JOIN attendance_records ar ON e.employee_id = ar.employee_id AND ar.date_of_attendance = %s
            LEFT JOIN attendance_status_type ast ON ar.status_id = ast.status_id
            GROUP BY l.location_id, l.location_name
            ORDER BY l.location_name ASC
        """, (today,))
        summary = cur.fetchall()
        conn.close()

        # Convert to list of dicts with correct format
        result = []
        for row in summary:
            result.append({
                "name": row["name"],
                "present": row["present"] or 0,
                "absent": row["absent"] or 0
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))