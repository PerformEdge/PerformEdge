from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import date, datetime, timedelta
import re
from typing import List
from attendance_location import _pdf_make, _pdf_response

from database import get_database_connection
from date_utils import resolve_date_range

router = APIRouter(prefix="/no-pay", tags=["No Pay"])

NO_PAY_LIKE = "%no%pay%"


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
        params = [NO_PAY_LIKE, start_resolved, end_resolved]
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
            WHERE LOWER(leave_type) LIKE %s
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


@router.get("/by-department")
def no_pay_by_department(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    start_resolved, end_resolved = resolve_date_range(date_range=dateRange, start=str(start) if start else None, end=str(end) if end else None, default_days=14)
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        filter_sql = ""
        filter_params = []
        if department and department != "All":
            filter_sql += " AND d.department_name = %s"
            filter_params.append(department)
        if location and location != "All":
            filter_sql += " AND l.location_name = %s"
            filter_params.append(location)

        # First get total NoPay days
        cur.execute("""
            SELECT COUNT(*) as total
            FROM leave_records lr
            JOIN employees e ON e.employee_id = lr.employee_id
            JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE LOWER(leave_type) LIKE %s
            AND started_date BETWEEN %s AND %s
        """ + filter_sql, tuple([NO_PAY_LIKE, start_resolved, end_resolved] + filter_params))
        total_row = cur.fetchone()
        total_nopay = total_row["total"] if total_row and total_row.get("total") else 1
        
        cur.execute("""
            SELECT d.department_name,
                   COUNT(*) AS no_pay_days,
                   ROUND(COUNT(*) / %s * 100, 1) AS no_pay_percentage
            FROM leave_records lr
            JOIN employees e ON e.employee_id=lr.employee_id
            JOIN departments d ON d.department_id=e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE LOWER(lr.leave_type) LIKE %s
            AND lr.started_date BETWEEN %s AND %s
        """ + filter_sql + """
            GROUP BY d.department_name
        """, tuple([total_nopay, NO_PAY_LIKE, start_resolved, end_resolved] + filter_params))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/distribution")
def no_pay_distribution(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        # resolve dates using shared utility
        start_resolved, end_resolved = resolve_date_range(date_range=dateRange, start=str(start) if start else None, end=str(end) if end else None, default_days=14)

        filter_sql = ""
        params = [NO_PAY_LIKE, start_resolved, end_resolved]
        if department and department != "All":
            filter_sql += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            filter_sql += " AND l.location_name = %s"
            params.append(location)

        cur.execute("""
            SELECT d.department_name, COUNT(*) AS days
            FROM leave_records lr
            JOIN employees e ON e.employee_id=lr.employee_id
            JOIN departments d ON d.department_id=e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE LOWER(lr.leave_type) LIKE %s
            AND lr.started_date BETWEEN %s AND %s
        """ + filter_sql + """
            GROUP BY d.department_name
            ORDER BY days DESC
        """, tuple(params))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/details")
def no_pay_details(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        # resolve dates using shared utility
        start_resolved, end_resolved = resolve_date_range(date_range=dateRange, start=str(start) if start else None, end=str(end) if end else None, default_days=14)

        filter_sql = ""
        params = [NO_PAY_LIKE, start_resolved, end_resolved]
        if department and department != "All":
            filter_sql += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            filter_sql += " AND l.location_name = %s"
            params.append(location)

        cur.execute("""
            SELECT d.department_name, e.full_name as employee_name, COUNT(*) AS no_pay_days,
                   COUNT(*)*8 AS no_pay_hours,
                   COUNT(*) AS occurrences
            FROM leave_records lr
            JOIN employees e ON e.employee_id=lr.employee_id
            JOIN departments d ON d.department_id=e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE LOWER(lr.leave_type) LIKE %s
            AND lr.started_date BETWEEN %s AND %s
        """ + filter_sql + """
            GROUP BY d.department_name, e.full_name
            ORDER BY d.department_name, no_pay_days DESC
        """, tuple(params))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()



@router.get("/report")
def no_pay_report(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    """Download a PDF report for No-Pay summary, distribution and details."""
    # reuse existing endpoint logic to collect data
    try:
        summary = no_pay_summary(start=start, end=end, dateRange=dateRange, department=department, location=location)
    except Exception:
        summary = {"total_days": 0, "employees": 0, "no_pay_percentage": 0, "monthly_trend": "-"}

    try:
        by_dept = no_pay_by_department(start=start, end=end, dateRange=dateRange, department=department)
    except Exception:
        by_dept = []

    try:
        distribution = no_pay_distribution(start=start, end=end, dateRange=dateRange)
    except Exception:
        distribution = []

    try:
        details = no_pay_details(start=start, end=end, dateRange=dateRange)
    except Exception:
        details = []

    filters = {
        "Start": (str(start) if start else (dateRange or "All")),
        "End": (str(end) if end else (dateRange or "All")),
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "No-Pay Leave Report",
        "",
        "Summary",
        f"Total No-Pay Days: {summary.get('total_days', 0)}",
        f"Affected Employees: {summary.get('employees', 0)}",
        f"No-Pay Percentage: {summary.get('no_pay_percentage', 0)}%",
        f"Monthly Trend: {summary.get('monthly_trend', '-')}",
        "",
        "By Department",
    ]

    for d in (by_dept or []):
        lines.append(f"- {d.get('department_name', '-')}: {d.get('no_pay_days', 0)} days | {d.get('no_pay_percentage', 0)}%")

    lines.append("")
    lines.append("Distribution (days)")
    for r in (distribution or []):
        lines.append(f"- {r.get('department_name', '-')}: {r.get('days', 0)}")

    lines.append("")
    lines.append("Detailed Breakdown (first 200)")
    for r in (details or [])[:200]:
        lines.append(f"- {r.get('department_name', '-')}: {r.get('employee_name', '-')} | Days {r.get('no_pay_days', 0)} | Hours {r.get('no_pay_hours', 0)} | Occurrences {r.get('occurrences', 0)}")

    buf = _pdf_make(
        title="No-Pay Leave Report",
        subtitle="Attendance — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("no_pay_report.pdf", buf)
