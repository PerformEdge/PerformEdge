rom fastapi import APIRouter, Query, HTTPException
from datetime import date, datetime, timedelta
from typing import Optional
import re

from database import get_database_connection
from date_utils import resolve_date_range

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("/summary")
def attendance_summary(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    dateRange: Optional[str] = Query(None, alias='dateRange'),
    department: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
        ):
    # resolve date range using shared utility
    start_date, end_date = resolve_date_range(date_range=dateRange, start=start, end=end, default_days=5)
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)

    try:
        # Calculate attendance KPI counts with optional department and location filters
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
            "overtime": 0  
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

        finally:
        cur.close()
        conn.close()