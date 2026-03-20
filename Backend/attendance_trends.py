from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional
import re

from database import get_database_connection
from attendance_location import _pdf_make, _pdf_response
from date_utils import resolve_date_range

router = APIRouter(prefix="/attendance-trends", tags=["Attendance Trends"])

# --- Last 5 days absentee ---
@router.get("/last-5-days")
def absentee_last_5_days(start: Optional[str] = Query(None), end: Optional[str] = Query(None), dateRange: Optional[str] = Query(None, alias="dateRange")):
    """Get absentee count for each day in the date range"""
    start_date, end_date = resolve_date_range(date_range=dateRange, start=start, end=end, default_days=5)
    
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT ar.date_of_attendance,
                   DAYNAME(ar.date_of_attendance) AS day,
                   COUNT(*) AS absent
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            WHERE ast.status_name='Absent'
              AND ar.date_of_attendance BETWEEN %s AND %s
            GROUP BY ar.date_of_attendance
            ORDER BY ar.date_of_attendance
        """, (start_date, end_date))
        rows = cur.fetchall()
        return [{"date": str(r["date_of_attendance"]), "day": r["day"][:3], "absent": r["absent"]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()


# --- Download Report for Attendance Trends ---
@router.get("/report")
def attendance_trends_report(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    dateRange: Optional[str] = Query(None, alias="dateRange"),
    department: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
):
    """Download a PDF report for Attendance Trends."""

    # reuse existing endpoints data
    last5 = absentee_last_5_days(start=start, end=end, dateRange=dateRange)
    avg = avg_absentee_by_dept(start=start, end=end, dateRange=dateRange, department=department, location=location)
    daily = daily_absentee_by_dept(start=start, end=end, dateRange=dateRange, department=department, location=location)
    breakdown = department_breakdown(start=start, end=end, dateRange=dateRange, department=department, location=location)

    filters = {
        "Start": start or dateRange or "All",
        "End": end or "",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines = [
        "Attendance Trends Report",
        "",
        "Last 5 Days Absentee Summary",
    ]
    for r in (last5 or []):
        lines.append(f"- {r.get('date') or r.get('day')}: {r.get('absent', 0)}%")

    lines.extend(["", "Average Absentee Rate by Department"]) 
    for r in (avg or []):
        # handle different key names returned by query
        dept = r.get('dept') or r.get('department') or r.get('department_name')
        rate = r.get('rate') or r.get('Rate') or 0
        employees = r.get('total_employees') or r.get('totalEmployees') or 0
        lines.append(f"- {dept}: {rate}% (Employees: {employees})")

    lines.extend(["", "Daily Absentee Trends by Department (sample)"])
    datasets = (daily or {}).get("datasets", []) if isinstance(daily, dict) else []
    labels = (daily or {}).get("labels", []) if isinstance(daily, dict) else []
    for ds in datasets:
        vals = ", ".join(str(v) for v in (ds.get("data") or []))
        lines.append(f"- {ds.get('label')}: {vals}")

    lines.extend(["", "Detailed Department Breakdown"]) 
    for r in (breakdown or []):
        lines.append(f"- {r.get('dept')}: Staff {r.get('staff',0)} | Mon {r.get('mon',0)} | Tue {r.get('tue',0)} | Wed {r.get('wed',0)} | Thu {r.get('thu',0)} | Fri {r.get('fri',0)} | 5-Day Avg {r.get('avg',0)}")

    buf = _pdf_make(
        title="Attendance Trends",
        subtitle="Attendance — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("attendance_trends_report.pdf", buf)

# --- Avg absentee by department ---
@router.get("/avg-by-department")
def avg_absentee_by_dept(start: Optional[str] = Query(None), end: Optional[str] = Query(None), dateRange: Optional[str] = Query(None, alias="dateRange"), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    """Get average absentee rate by department"""
    start_date, end_date = resolve_date_range(date_range=dateRange, start=start, end=end, default_days=7)
    
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT d.department_name AS dept,
                   COUNT(DISTINCT ar.employee_id) AS total_employees,
                   ROUND(SUM(CASE WHEN ast.status_name='Absent' THEN 1 ELSE 0 END) 
                         / COUNT(*) * 100, 1) AS rate
            FROM attendance_records ar
            JOIN employees e ON e.employee_id = ar.employee_id
            JOIN departments d ON d.department_id = e.department_id
            JOIN locations l ON l.location_id = e.location_id
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            WHERE ar.date_of_attendance BETWEEN %s AND %s
        """
        params = [start_date, end_date]
        
        if department and department != "All":
            query += " AND d.department_name = %s"
            params.append(department)

        if location and location != "All":
            query += " AND l.location_name = %s"
            params.append(location)
        
        query += " GROUP BY d.department_name ORDER BY rate DESC"
        
        cur.execute(query, params)
        return cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()

# --- Daily absentee by department ---
@router.get("/daily-by-department")
def daily_absentee_by_dept(start: Optional[str] = Query(None), end: Optional[str] = Query(None), dateRange: Optional[str] = Query(None, alias="dateRange"), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    """Get daily absentee trends by department"""
    start_date, end_date = resolve_date_range(date_range=dateRange, start=start, end=end, default_days=7)
    
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT d.department_name AS dept,
                   ar.date_of_attendance,
                   DAYNAME(ar.date_of_attendance) AS day,
                   COUNT(*) AS absent
            FROM attendance_records ar
            JOIN employees e ON e.employee_id = ar.employee_id
            JOIN departments d ON d.department_id = e.department_id
                        JOIN locations l ON l.location_id = e.location_id
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            WHERE ast.status_name='Absent'
              AND ar.date_of_attendance BETWEEN %s AND %s
        """
        params = [start_date, end_date]
        
        if department and department != "All":
            query += " AND d.department_name = %s"
            params.append(department)

        if location and location != "All":
            query += " AND l.location_name = %s"
            params.append(location)
        
        query += " GROUP BY d.department_name, ar.date_of_attendance ORDER BY d.department_name, ar.date_of_attendance"
        
        cur.execute(query, params)
        rows = cur.fetchall()

        # Transform to frontend structure
        depts = {}
        days_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for r in rows:
            dept = r["dept"]
            day_short = r["day"][:3]
            if dept not in depts:
                depts[dept] = {d: 0 for d in days_order}
            depts[dept][day_short] = r["absent"]

        datasets = []
        colors = ["#ef4444", "#f87171", "#fb923c", "#dc2626", "#ea580c", "#a16207", "#7c2d12"]
        for idx, (dept, data) in enumerate(depts.items()):
            datasets.append({
                "label": dept,
                "data": [data[d] for d in days_order[:5]],
                "borderColor": colors[idx % len(colors)],
                "backgroundColor": colors[idx % len(colors)] + "20",
                "fill": True,
                "tension": 0.35,
                "pointRadius": 4,
                "borderWidth": 3,
            })

        return {"labels": days_order[:5], "datasets": datasets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()

# --- Department breakdown table ---
@router.get("/dept-breakdown")
def department_breakdown(start: Optional[str] = Query(None), end: Optional[str] = Query(None), dateRange: Optional[str] = Query(None, alias="dateRange"), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    """Get detailed department breakdown with daily absent counts"""
    start_date, end_date = resolve_date_range(date_range=dateRange, start=start, end=end, default_days=7)
    
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT d.department_name AS dept,
                   COUNT(DISTINCT e.employee_id) AS staff,
                   SUM(CASE WHEN DAYNAME(ar.date_of_attendance)='Monday' AND ast.status_name='Absent' THEN 1 ELSE 0 END) AS mon,
                   SUM(CASE WHEN DAYNAME(ar.date_of_attendance)='Tuesday' AND ast.status_name='Absent' THEN 1 ELSE 0 END) AS tue,
                   SUM(CASE WHEN DAYNAME(ar.date_of_attendance)='Wednesday' AND ast.status_name='Absent' THEN 1 ELSE 0 END) AS wed,
                   SUM(CASE WHEN DAYNAME(ar.date_of_attendance)='Thursday' AND ast.status_name='Absent' THEN 1 ELSE 0 END) AS thu,
                   SUM(CASE WHEN DAYNAME(ar.date_of_attendance)='Friday' AND ast.status_name='Absent' THEN 1 ELSE 0 END) AS fri
            FROM employees e
            JOIN departments d ON d.department_id = e.department_id
                 JOIN locations l ON l.location_id = e.location_id
            LEFT JOIN attendance_records ar 
                   ON ar.employee_id = e.employee_id 
                   AND ar.date_of_attendance BETWEEN %s AND %s
            LEFT JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            WHERE 1=1
        """
        params = [start_date, end_date]
        
        if department and department != "All":
            query += " AND d.department_name = %s"
            params.append(department)

        if location and location != "All":
            query += " AND l.location_name = %s"
            params.append(location)
        
        query += " GROUP BY d.department_name ORDER BY staff DESC"
        
        cur.execute(query, params)
        rows = cur.fetchall()

        for r in rows:
            total = sum([r.get("mon") or 0, r.get("tue") or 0, r.get("wed") or 0, r.get("thu") or 0, r.get("fri") or 0])
            r["avg"] = round(total / 5, 1) if total > 0 else 0
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()

# --- Get available departments ---
@router.get("/departments")
def get_departments():
    """Get list of all departments"""
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT DISTINCT department_name FROM departments ORDER BY department_name")
        rows = cur.fetchall()
        return [r["department_name"] for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()
