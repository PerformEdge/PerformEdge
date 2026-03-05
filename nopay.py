from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import date, datetime, timedelta
import re
from typing import List
from attendance_location import _pdf_make, _pdf_response

from database import get_database_connection
from date_utils import resolve_date_range

router = APIRouter(prefix="/no-pay", tags=["No Pay"])


@router.get("/summary")
def no_pay_summary(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    """Summary of no-pay between start and end or within a dateRange string.
    dateRange formats supported: 'YYYY-MM-DD to YYYY-MM-DD' or 'YYYY-MM-DD - YYYY-MM-DD'.
    """
    start_resolved, end_resolved = resolve_date_range(date_range=dateRange, start=str(start) if start else None, end=str(end) if end else None, default_days=14)
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        filter_sql = ""
        params = [start_resolved, end_resolved]
        if department and department != "All":
            filter_sql += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            filter_sql += " AND l.location_name = %s"
            params.append(location)

        # Total no-pay days and affected employees
        cur.execute("""
            SELECT COUNT(*) AS total_days,
                   COUNT(DISTINCT lr.employee_id) AS employees
            FROM leave_records lr
            JOIN employees e ON e.employee_id = lr.employee_id
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE LOWER(leave_type) LIKE '%no%pay%'
            AND started_date BETWEEN %s AND %s
        """ + filter_sql, tuple(params))
        summary = cur.fetchone()
        
        if summary is None or summary.get("total_days") is None:
            summary = {"total_days": 0, "employees": 0}
        
        # Calculate percentage based on total working days in period
        days_diff = (end_resolved - start_resolved).days + 1
        # Get total employees for percentage calculation
        emp_sql = """
            SELECT COUNT(DISTINCT e.employee_id) as total_employees
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE 1=1
        """
        emp_params = []
        if department and department != "All":
            emp_sql += " AND d.department_name = %s"
            emp_params.append(department)
        if location and location != "All":
            emp_sql += " AND l.location_name = %s"
            emp_params.append(location)
        cur.execute(emp_sql, tuple(emp_params))
        total_emp_result = cur.fetchone()
        total_employees = total_emp_result["total_employees"] if total_emp_result and total_emp_result.get("total_employees") else 1
        
        total_possible_days = total_employees * days_diff
        no_pay_percentage = round((summary["total_days"] / total_possible_days) * 100, 1) if total_possible_days > 0 else 0
        
        summary["no_pay_percentage"] = no_pay_percentage
        summary["monthly_trend"] = "12.5%"  # placeholder
        return summary
    finally:
        cur.close()
        conn.close()