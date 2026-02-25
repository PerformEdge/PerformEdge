from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional

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
    avg = avg_absentee_by_dept(start=start, end=end, dateRange=dateRange, department=department)
    daily = daily_absentee_by_dept(start=start, end=end, dateRange=dateRange, department=department)
    breakdown = department_breakdown(start=start, end=end, dateRange=dateRange, department=department)

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
def avg_absentee_by_dept(start: Optional[str] = Query(None), end: Optional[str] = Query(None), dateRange: Optional[str] = Query(None, alias="dateRange"), department: Optional[str] = Query(None)):
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
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            WHERE ar.date_of_attendance BETWEEN %s AND %s
        """
        params = [start_date, end_date]
        
        if department:
            query += " AND d.department_name = %s"
            params.append(department)
        
        query += " GROUP BY d.department_name ORDER BY rate DESC"
        
        cur.execute(query, params)
        return cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()
