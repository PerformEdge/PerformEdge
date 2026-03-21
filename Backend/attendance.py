from fastapi import APIRouter, Query, HTTPException
from datetime import date, datetime, timedelta
from typing import Optional
import re
import io

from database import get_database_connection
from date_utils import resolve_date_range
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

router = APIRouter(prefix="/attendance", tags=["Attendance"])


def _pdf_make(*, title: str, subtitle: str = "", lines: Optional[list] = None) -> io.BytesIO:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    x = 48
    y = height - 56

    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, title)
    y -= 22

    if subtitle:
        c.setFont("Helvetica", 10)
        c.drawString(x, y, subtitle)
        y -= 18

    c.setFont("Helvetica", 10)
    for line in (lines or []):
        if y < 72:
            c.showPage()
            y = height - 56
            c.setFont("Helvetica", 10)
        c.drawString(x, y, str(line))
        y -= 13

    c.save()
    buf.seek(0)
    return buf


def _pdf_response(filename: str, buf: io.BytesIO) -> StreamingResponse:
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/latest-date")
def attendance_latest_date(default_days: int = Query(5, ge=1, le=31)):
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT MAX(date_of_attendance) AS latest_date FROM attendance_records")
        row = cur.fetchone() or {}
        latest_date = row.get("latest_date")

        if latest_date is None:
            latest_date = date.today()

        start_date = latest_date - timedelta(days=default_days - 1)
        return {
            "start": start_date.isoformat(),
            "end": latest_date.isoformat(),
            "latest": latest_date.isoformat()
        }
    finally:
        cur.close()
        conn.close()


@router.get("/summary")
def attendance_summary(start: Optional[str] = Query(None), end: Optional[str] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    # resolve date range using shared utility
    start_date, end_date = resolve_date_range(date_range=dateRange, start=start, end=end, default_days=5)
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        # KPI: Present, Late, On Leave (Absent), and count other statuses
        # join employees to allow department/location filters
        base_params = [start_date, end_date]
        filter_sql = ""
        if department and department != "All":
            filter_sql += " AND d.department_name = %s"
            base_params.append(department)
        if location and location != "All":
            filter_sql += " AND l.location_name = %s"
            base_params.append(location)

        cur.execute(f"""
            SELECT
              SUM(CASE WHEN ast.status_name='Present' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN ast.status_name='Late' THEN 1 ELSE 0 END) AS late,
              SUM(CASE WHEN ast.status_name='Absent' THEN 1 ELSE 0 END) AS on_leave
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            JOIN employees e ON e.employee_id = ar.employee_id
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE ar.date_of_attendance BETWEEN %s AND %s
            """ + filter_sql, tuple(base_params))
        kpis_row = cur.fetchone()
        
        # Convert to proper numbers
        kpis = {
            "present": int(kpis_row["present"] or 0),
            "late": int(kpis_row["late"] or 0),
            "on_leave": int(kpis_row["on_leave"] or 0),
            "overtime": 0  # Simplified - no overtime_sessions in schema
        }

        # Late Comers by Department
        # Late comers by department with optional filters
        params = [start_date, end_date]
        late_filter = ""
        if department and department != "All":
            late_filter += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            late_filter += " AND l.location_name = %s"
            params.append(location)

        cur.execute(f"""
            SELECT d.department_name, COUNT(*) AS late_count
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id=ar.status_id
            JOIN employees e ON e.employee_id=ar.employee_id
            JOIN departments d ON d.department_id=e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE ast.status_name='Late' AND ar.date_of_attendance BETWEEN %s AND %s
            """ + late_filter + " GROUP BY d.department_id, d.department_name ORDER BY late_count DESC", tuple(params))
        late = cur.fetchall()

        # No Pay (Absent) by Department - using Absent as no pay indicator
        params = [start_date, end_date]
        nopay_filter = ""
        if department and department != "All":
            nopay_filter += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            nopay_filter += " AND l.location_name = %s"
            params.append(location)

        cur.execute(f"""
            SELECT d.department_name, COUNT(*) AS no_pay_count
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id=ar.status_id
            JOIN employees e ON e.employee_id=ar.employee_id
            JOIN departments d ON d.department_id=e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE ast.status_name='Absent' AND ar.date_of_attendance BETWEEN %s AND %s
            """ + nopay_filter + " GROUP BY d.department_id, d.department_name ORDER BY no_pay_count DESC", tuple(params))
        no_pay = cur.fetchall()

        # Absentees by Day (Last 5 days) - using Absent status
        params = [start_date, end_date]
        absentee_filter = ""
        if department and department != "All":
            absentee_filter += " AND e.department_id = (SELECT department_id FROM departments WHERE department_name = %s LIMIT 1)"
            params.append(department)
        if location and location != "All":
            absentee_filter += " AND e.location_id = (SELECT location_id FROM locations WHERE location_name = %s LIMIT 1)"
            params.append(location)

        cur.execute(f"""
            SELECT ar.date_of_attendance AS day, COUNT(*) AS absent_count
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id=ar.status_id
            JOIN employees e ON e.employee_id = ar.employee_id
            WHERE ast.status_name='Absent'
              AND ar.date_of_attendance BETWEEN %s AND %s
            """ + absentee_filter + " GROUP BY ar.date_of_attendance ORDER BY ar.date_of_attendance DESC LIMIT 5", tuple(params))
        absentee = cur.fetchall()

        # Attendance by Location
        params = [start_date, end_date]
        loc_filter = ""
        if department and department != "All":
            loc_filter += " AND e.department_id = (SELECT department_id FROM departments WHERE department_name = %s LIMIT 1)"
            params.append(department)
        if location and location != "All":
            loc_filter += " AND l.location_name = %s"
            params.append(location)

        cur.execute(f"""
            SELECT l.location_name, 
              SUM(CASE WHEN ast.status_name='Present' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN ast.status_name='Absent' THEN 1 ELSE 0 END) AS absent
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            JOIN employees e ON e.employee_id=ar.employee_id
            JOIN locations l ON l.location_id=e.location_id
            WHERE ar.date_of_attendance BETWEEN %s AND %s
            """ + loc_filter + " GROUP BY l.location_id, l.location_name ORDER BY l.location_name", tuple(params))
        locations = cur.fetchall()

        return {
            "kpis": kpis,
            "late": late,
            "no_pay": no_pay,
            "absentee": absentee,
            "locations": locations
        }

    finally:
        cur.close()
        conn.close()


@router.get("/report")
def attendance_report(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    dateRange: Optional[str] = Query(None, alias="dateRange"),
    department: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
):
    data = attendance_summary(
        start=start,
        end=end,
        dateRange=dateRange,
        department=department,
        location=location,
    )

    start_date, end_date = resolve_date_range(date_range=dateRange, start=start, end=end, default_days=5)

    lines = [
        f"Date Range: {start_date.isoformat()} to {end_date.isoformat()}",
        f"Department: {department or 'All'}",
        f"Location: {location or 'All'}",
        "",
        f"Present: {data['kpis']['present']}",
        f"Late: {data['kpis']['late']}",
        f"On Leave: {data['kpis']['on_leave']}",
        f"Overtime: {data['kpis']['overtime']}",
        "",
        "Late Comers by Department:",
    ]

    for row in data.get("late", []):
        lines.append(f"- {row.get('department_name', 'Unknown')}: {row.get('late_count', 0)}")

    lines.append("")
    lines.append("No Pay (Absent) by Department:")
    for row in data.get("no_pay", []):
        lines.append(f"- {row.get('department_name', 'Unknown')}: {row.get('no_pay_count', 0)}")

    lines.append("")
    lines.append("Absentees by Day:")
    for row in data.get("absentee", []):
        day_val = row.get("day")
        if hasattr(day_val, "isoformat"):
            day_text = day_val.isoformat()
        else:
            day_text = str(day_val)
        lines.append(f"- {day_text}: {row.get('absent_count', 0)}")

    buf = _pdf_make(
        title="Attendance Summary Report",
        subtitle=f"Generated on {date.today().isoformat()}",
        lines=lines,
    )
    return _pdf_response("attendance_summary_report.pdf", buf)
