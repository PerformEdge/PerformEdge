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

        finally:
        cur.close()
        conn.close()