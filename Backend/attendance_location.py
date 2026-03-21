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
def get_kpis(dateRange: Optional[str] = Query("", alias="dateRange"), start: Optional[str] = Query(None), end: Optional[str] = Query(None), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    try:
        # resolve date range if provided; default to last 7 days
        def _resolve(date_range: Optional[str], default_days: int = 7):
            if date_range:
                parts = re.split(r"\s+to\s+|\s+-\s+", date_range)
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

        filter_parts = ["e.employement_status = 'ACTIVE'"]
        filter_params = []
        if department and department != "All":
            filter_parts.append("d.department_name = %s")
            filter_params.append(department)
        if location and location != "All":
            filter_parts.append("l.location_name = %s")
            filter_params.append(location)
        where_filter = " AND ".join(filter_parts)

        # Total employees
        cur.execute(f"""
            SELECT COUNT(DISTINCT e.employee_id) AS total_employees
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE {where_filter}
        """, tuple(filter_params))
        total_employees = cur.fetchone()["total_employees"]

        # Remote employees (use location_name instead of work_type)
        cur.execute(f"""
            SELECT COUNT(DISTINCT e.employee_id) AS remote_workers
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE {where_filter}
              AND l.location_name = 'Remote'
        """, tuple(filter_params))
        remote_workers = cur.fetchone()["remote_workers"]

                # Present count across selected date range
        cur.execute(f"""
            SELECT COUNT(DISTINCT e.employee_id) AS present_today
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            JOIN attendance_records ar ON e.employee_id = ar.employee_id
            JOIN attendance_status_type ast ON ar.status_id = ast.status_id
                        WHERE ar.date_of_attendance BETWEEN %s AND %s
              AND ast.status_name IN ('Present', 'Late', 'Work From Home')
              AND {where_filter}
                """, tuple([s, e] + filter_params))
        present_today = cur.fetchone()["present_today"] or 0

                # Absent count across selected date range
        cur.execute(f"""
            SELECT COUNT(DISTINCT e.employee_id) AS absent_today
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
                        LEFT JOIN attendance_records ar ON e.employee_id = ar.employee_id AND ar.date_of_attendance BETWEEN %s AND %s
            LEFT JOIN attendance_status_type ast ON ar.status_id = ast.status_id
            WHERE {where_filter}
                            AND ast.status_name = 'Absent'
                """, tuple([s, e] + filter_params))
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
def trend_7days(dateRange: Optional[str] = Query("", alias="dateRange"), start: Optional[str] = Query(None), end: Optional[str] = Query(None), location: Optional[str] = Query(None), department: Optional[str] = Query(None)):
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

        where_sql = ""
        params = [start_date, end_date]
        if department and department != "All":
            where_sql += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            where_sql += " AND l.location_name = %s"
            params.append(location)

        # Get data for the requested date range
        cur.execute("""
            SELECT DATE(ar.date_of_attendance) AS label,
                   l.location_name,
                   COUNT(*) AS present_count
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            JOIN locations l ON e.location_id = l.location_id
            JOIN attendance_records ar ON e.employee_id = ar.employee_id
            JOIN attendance_status_type ast ON ar.status_id = ast.status_id
            WHERE ar.date_of_attendance BETWEEN %s AND %s
            AND ast.status_name IN ('Present', 'Late', 'Work From Home')
            AND e.employement_status = 'ACTIVE'
        """ + where_sql + """
            GROUP BY label, l.location_name
            ORDER BY label ASC
        """, tuple(params))
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
        # resolve date range if provided
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

        where_sql = " WHERE 1=1"
        params = [start_date, end_date]
        if department and department != "All":
            where_sql += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            where_sql += " AND l.location_name = %s"
            params.append(location)

        cur.execute("""
            SELECT l.location_id,
                   l.location_name AS name,
                   SUM(CASE WHEN ast.status_name IN ('Present', 'Late', 'Work From Home') THEN 1 ELSE 0 END) AS present,
                   SUM(CASE WHEN ast.status_name = 'Absent' THEN 1 ELSE 0 END) AS absent,
                   COUNT(DISTINCT CASE WHEN ast.status_name IS NOT NULL THEN e.employee_id END) AS marked,
                   COUNT(DISTINCT e.employee_id) AS total_in_location
            FROM locations l
            LEFT JOIN employees e ON l.location_id = e.location_id AND e.employement_status = 'ACTIVE'
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN attendance_records ar ON e.employee_id = ar.employee_id AND ar.date_of_attendance BETWEEN %s AND %s
            LEFT JOIN attendance_status_type ast ON ar.status_id = ast.status_id
        """ + where_sql + """
            GROUP BY l.location_id, l.location_name
            ORDER BY l.location_name ASC
        """, tuple(params))
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


# --- PDF Helper Functions ---

def _pdf_make(title: str, subtitle: str, filters: dict, lines: List[str]):
    """Create a PDF document and return the buffer."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=6,
        bold=True,
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#6b7280'),
        spaceAfter=12,
    )
    
    elements = []
    elements.append(Paragraph(title, title_style))
    elements.append(Paragraph(subtitle, subtitle_style))
    
    # Add filters as a table
    filter_data = [["Filter", "Value"]]
    for key, value in filters.items():
        filter_data.append([key, str(value)])
    
    filter_table = Table(filter_data, colWidths=[2*inch, 4*inch])
    filter_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
    ]))
    elements.append(filter_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Add content lines
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
    )
    for line in lines:
        if line == "":
            elements.append(Spacer(1, 0.1*inch))
        else:
            elements.append(Paragraph(line, normal_style))
    
    doc.build(elements)
    buf.seek(0)
    return buf


def _pdf_response(filename: str, buf: io.BytesIO):
    """Return a PDF file as a streaming response."""
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# --- Helper function to get location attendance data ---

def get_location_attendance(date_range: str = "", location: str = "", company_id: Optional[str] = None):
    """Get location attendance data based on filters."""
    try:
        conn = get_database_connection()
        cur = conn.cursor(dictionary=True)

        today = datetime.now().date()

        # Build date range
        if date_range == "7days":
            start_date = today - timedelta(days=6)
        elif date_range == "30days":
            start_date = today - timedelta(days=29)
        elif date_range == "90days":
            start_date = today - timedelta(days=89)
        else:
            start_date = today - timedelta(days=365)

        # Query to get location attendance summary
        query = """
            SELECT l.location_name AS location,
                   COUNT(DISTINCT CASE WHEN ast.status_name IN ('Present', 'Late', 'Work From Home') THEN e.employee_id END) AS present,
                   COUNT(DISTINCT CASE WHEN ast.status_name = 'Absent' THEN e.employee_id END) AS absent,
                   COUNT(DISTINCT e.employee_id) AS total_employees,
                   DATE(ar.date_of_attendance) AS attendance_date
            FROM locations l
            LEFT JOIN employees e ON l.location_id = e.location_id AND e.employement_status = 'ACTIVE'
            LEFT JOIN attendance_records ar ON e.employee_id = ar.employee_id AND ar.date_of_attendance BETWEEN %s AND %s
            LEFT JOIN attendance_status_type ast ON ar.status_id = ast.status_id
        """
        params = [start_date, today]
        
        if location and location != "All":
            query += " WHERE l.location_name = %s"
            params.append(location)
        
        query += " GROUP BY l.location_name, DATE(ar.date_of_attendance) ORDER BY l.location_name, DATE(ar.date_of_attendance) DESC"
        
        cur.execute(query, params)
        rows = cur.fetchall()
        conn.close()
        
        return rows
    except Exception as e:
        return []


# --- Location Summary Statistics ---

def location_summary_stats(date_range: str = "", location: str = ""):
    """Get location summary statistics."""
    try:
        conn = get_database_connection()
        cur = conn.cursor(dictionary=True)

        today = datetime.now().date()

        if date_range == "7days":
            start_date = today - timedelta(days=6)
        elif date_range == "30days":
            start_date = today - timedelta(days=29)
        elif date_range == "90days":
            start_date = today - timedelta(days=89)
        else:
            start_date = today - timedelta(days=365)

        # Get aggregate stats
        query = """
            SELECT COUNT(DISTINCT l.location_id) AS total_locations,
                   COUNT(DISTINCT e.employee_id) AS total_employees,
                   COUNT(DISTINCT CASE WHEN ast.status_name IN ('Present', 'Late', 'Work From Home') THEN e.employee_id END) AS total_present,
                   COUNT(DISTINCT CASE WHEN ast.status_name = 'Absent' THEN e.employee_id END) AS total_absent
            FROM locations l
            LEFT JOIN employees e ON l.location_id = e.location_id AND e.employement_status = 'ACTIVE'
            LEFT JOIN attendance_records ar ON e.employee_id = ar.employee_id AND ar.date_of_attendance BETWEEN %s AND %s
            LEFT JOIN attendance_status_type ast ON ar.status_id = ast.status_id
        """
        params = [start_date, today]
        
        if location and location != "All":
            query += " WHERE l.location_name = %s"
            params.append(location)
        
        cur.execute(query, params)
        row = cur.fetchone()
        conn.close()
        
        return {
            "totalLocations": row.get("total_locations", 0) if row else 0,
            "totalEmployees": row.get("total_employees", 0) if row else 0,
            "totalPresent": row.get("total_present", 0) if row else 0,
            "totalAbsent": row.get("total_absent", 0) if row else 0,
        }
    except Exception as e:
        return {}


# --- Download Report Endpoints ---

@router.get("/report/summary")
def location_summary_report(
    date_range: str = Query("", alias="dateRange"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Location Attendance Summary."""

    attendance_data = get_location_attendance(
        date_range=date_range,
        location=location,
        company_id=company_id,
    )

    stats = location_summary_stats(
        date_range=date_range,
        location=location,
    )

    filters = {
        "Date Range": date_range or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Location Attendance Summary",
        "",
        "Summary Statistics",
        f"Total Locations: {stats.get('totalLocations', 0)}",
        f"Total Employees: {stats.get('totalEmployees', 0)}",
        f"Total Present: {stats.get('totalPresent', 0)}",
        f"Total Absent: {stats.get('totalAbsent', 0)}",
        "",
        "Attendance by Location",
    ]

    # Group data by location and add to report
    location_dict = {}
    for row in attendance_data:
        loc = row.get("location", "Unknown")
        if loc not in location_dict:
            location_dict[loc] = {"present": 0, "absent": 0, "total": 0}
        location_dict[loc]["present"] += row.get("present", 0)
        location_dict[loc]["absent"] += row.get("absent", 0)
        location_dict[loc]["total"] += row.get("total_employees", 0)

    for loc, data in sorted(location_dict.items()):
        present_pct = (data["present"] / data["total"] * 100) if data["total"] > 0 else 0
        lines.append(
            f"- {loc}: Present {data['present']} | Absent {data['absent']} | Total {data['total']} | {present_pct:.1f}%"
        )

    buf = _pdf_make(
        title="Location Attendance Summary",
        subtitle="Attendance Management — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("location_attendance_summary_report.pdf", buf)


@router.get("/report/branchwise")
def location_branchwise_report(
    date_range: str = Query("", alias="dateRange"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Branch-wise Attendance (Present and Absent Cards)."""

    attendance_data = get_location_attendance(
        date_range=date_range,
        location=location,
        company_id=company_id,
    )

    filters = {
        "Date Range": date_range or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Branch-wise Attendance Report",
        "",
        "Present and Absent Card Details",
        "",
    ]

    # Group by location
    location_dict = {}
    for row in attendance_data:
        loc = row.get("location", "Unknown")
        if loc not in location_dict:
            location_dict[loc] = {"records": []}
        location_dict[loc]["records"].append(row)

    # Add location details
    for loc, data in sorted(location_dict.items()):
        lines.append(f"Branch: {loc}")
        lines.append("")
        
        total_present = sum(r.get("present", 0) for r in data["records"])
        total_absent = sum(r.get("absent", 0) for r in data["records"])
        total_employees = data["records"][0].get("total_employees", 0) if data["records"] else 0
        
        lines.append(f"  Present Count: {total_present}")
        lines.append(f"  Absent Count: {total_absent}")
        lines.append(f"  Total Employees: {total_employees}")
        
        if total_employees > 0:
            present_pct = (total_present / total_employees) * 100
            absent_pct = (total_absent / total_employees) * 100
            lines.append(f"  Attendance Rate: {present_pct:.2f}%")
            lines.append(f"  Absence Rate: {absent_pct:.2f}%")
        
        lines.append("")

    buf = _pdf_make(
        title="Branch-wise Attendance Report",
        subtitle="Attendance Management — Present & Absent Cards",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("location_branchwise_attendance_report.pdf", buf)


@router.get("/report/trend")
def location_trend_report(
    date_range: str = Query("", alias="dateRange"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Location Attendance Trend."""

    attendance_data = get_location_attendance(
        date_range=date_range,
        location=location,
        company_id=company_id,
    )

    filters = {
        "Date Range": date_range or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Location Attendance Trend Report",
        "",
        "Daily Attendance Trend",
        "",
    ]

    # Group by date for trend data
    date_dict = {}
    for row in attendance_data:
        date_key = row.get("attendance_date")
        if date_key:
            if date_key not in date_dict:
                date_dict[date_key] = {"present": 0, "absent": 0}
            date_dict[date_key]["present"] += row.get("present", 0)
            date_dict[date_key]["absent"] += row.get("absent", 0)

    # Add trend data sorted by date
    for date_key in sorted(date_dict.keys(), reverse=True)[:30]:  # Last 30 days
        data = date_dict[date_key]
        total = data["present"] + data["absent"]
        if total > 0:
            present_pct = (data["present"] / total) * 100
        else:
            present_pct = 0
        lines.append(
            f"- {date_key}: Present {data['present']} | Absent {data['absent']} | {present_pct:.1f}%"
        )

    buf = _pdf_make(
        title="Location Attendance Trend",
        subtitle="Attendance Management — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("location_attendance_trend_report.pdf", buf)


# Download Report endpoints (Performance / Training / Appraisals / Overview)

try:
    # Prefer the real implementations from the performance module when available.
    from performance import (
        performance_ranking,
        training_needs,
        appraisals_completion,
        appraisal_completion_status,
    )
except Exception:
    # Fallback stubs kept for environments where the performance module
    # cannot be imported (avoids circular import errors during startup).
    def performance_ranking(
        date_range: str = "",
        department: str = "",
        location: str = "",
        company_id: Optional[str] = None,
        authorization: Optional[str] = None,
    ):
        """Fallback stub for performance ranking data."""
        return {"stats": {}, "chart": [], "employees": []}


    def training_needs(
        date_range: str = "",
        department: str = "",
        location: str = "",
        company_id: Optional[str] = None,
        authorization: Optional[str] = None,
    ):
        """Fallback stub for training needs data."""
        return {"stats": {}, "bars": [], "table": []}


    def appraisals_completion(
        date_range: str = "",
        department: str = "",
        location: str = "",
        company_id: Optional[str] = None,
        authorization: Optional[str] = None,
    ):
        """Fallback stub for appraisals completion data."""
        return {"stats": {}, "chart": [], "rows": []}


    def appraisal_completion_status(
        date_range: str = "",
        department: str = "",
        location: str = "",
        company_id: Optional[str] = None,
        authorization: Optional[str] = None,
    ):
        """Alias stub used by overview generator if referenced elsewhere."""
        return appraisals_completion(date_range, department, location, company_id, authorization)


@router.get("/ranking/report")
def ranking_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Performance Ranking Distribution."""

    data = performance_ranking(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )

    stats = (data or {}).get("stats", {})
    chart = (data or {}).get("chart", [])
    employees = (data or {}).get("employees", [])

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Summary",
        f"Average Score: {stats.get('averageScore', 0)}%",
        f"Excellence Rate: {stats.get('excellenceRate', 0)}%",
        f"Needs Improvement: {stats.get('needsImprovement', 0)}",
        f"Top Performers: {stats.get('topPerformers', 0)}",
        "",
        "Ranking Distribution",
    ]

    for it in chart:
        lines.append(f"- {it.get('name')}: {it.get('value')}%")

    lines.extend(["", "Employee Performance Breakdown (first 50)"])
    for r in employees[:50]:
        lines.append(
            f"- {r.get('name')} | {r.get('department')} | {r.get('percentage')}% | {r.get('rating')}"
        )

    buf = _pdf_make(
        title="Performance Ranking Distribution",
        subtitle="PerformEdge — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("performance_ranking_report.pdf", buf)


@router.get("/training/report")
def training_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Training Needs Distribution."""

    data = training_needs(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )

    stats = (data or {}).get("stats", {})
    bars = (data or {}).get("bars", [])
    rows = (data or {}).get("table", [])

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Summary",
        f"Total Employees: {stats.get('totalEmployees', 0)}",
        f"Employees Need Training: {stats.get('employeesNeedTraining', 0)}",
        f"Top Training Category: {stats.get('topTrainingCategory', '-')}",
        f"Average Training Completion: {stats.get('avgTrainingCompletion', 0)}%",
        "",
        "Training Category Distribution",
    ]

    for b in bars:
        lines.append(f"- {b.get('name')}: {b.get('value')}%")

    lines.extend(["", "Employee Breakdown (first 50)"])
    for r in rows[:50]:
        lines.append(
            f"- {r.get('name')} | {r.get('department')} | Tech {r.get('technical', 0)}% | Soft {r.get('softSkills', 0)}% | Leadership {r.get('leadership', 0)}% | Compliance {r.get('compliance', 0)}% | Total {r.get('total', 0)}%"
        )

    buf = _pdf_make(
        title="Training Needs Distribution",
        subtitle="PerformEdge — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("training_needs_report.pdf", buf)


@router.get("/appraisals/report")
def appraisals_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Appraisals Completion Status."""

    data = appraisals_completion(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )

    stats = (data or {}).get("stats", {})
    chart = (data or {}).get("chart", [])
    rows = (data or {}).get("rows", [])

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Summary",
        f"Total Employees: {stats.get('totalEmployees', 0)}",
        f"Appraisals Completed: {stats.get('appraisalsCompleted', 0)}",
        f"Pending Appraisals: {stats.get('pendingAppraisals', 0)}",
        f"Completion Rate: {stats.get('completionRate', 0)}%",
        "",
        "Completion Distribution",
    ]

    for it in chart:
        lines.append(f"- {it.get('name')}: {it.get('value')}%")

    lines.extend(["", "Employee Appraisal Status (first 50)"])
    for r in rows[:50]:
        score = r.get("score")
        score_txt = str(score) if score is not None else "-"
        lines.append(
            f"- {r.get('name')} | {r.get('department')} | {r.get('status')} | Score {score_txt} | {r.get('completionPct')}%"
        )

    buf = _pdf_make(
        title="Appraisals Completion Status",
        subtitle="PerformEdge — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("appraisals_completion_report.pdf", buf)


@router.get("/overview/report")
def overview_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for the Performance Overview page."""

    # Build the overview report by reusing the same data sources as the UI.
    ranking = performance_ranking(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )
    training = training_needs(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )
    appraisals = appraisal_completion_status(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )

    ranking_chart = (ranking or {}).get("chart", [])
    training_bars = (training or {}).get("bars", [])
    appraisals_chart = (appraisals or {}).get("chart", [])

    ranking_stats = (ranking or {}).get("stats", {})
    training_stats = (training or {}).get("stats", {})
    appraisals_stats = (appraisals or {}).get("stats", {})

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Performance Overview",
        "",
        "Ranking Distribution",
    ]
    for it in ranking_chart:
        lines.append(f"- {it.get('name')}: {it.get('value')}%")

    lines.extend(["", "Training Needs Distribution"])
    for b in training_bars:
        lines.append(f"- {b.get('name')}: {b.get('value')}%")

    lines.extend(["", "Appraisals Completion"])
    for it in appraisals_chart:
        lines.append(f"- {it.get('name')}: {it.get('value')}%")

    lines.extend(
        [
            "",
            "Key Stats",
            f"Average Score: {ranking_stats.get('averageScore', 0)}%",
            f"Excellence Rate: {ranking_stats.get('excellenceRate', 0)}%",
            f"Needs Improvement: {ranking_stats.get('needsImprovement', 0)}",
            f"Top Performers: {ranking_stats.get('topPerformers', 0)}",
            "",
            f"Total Employees: {training_stats.get('totalEmployees', 0)}",
            f"Employees Need Training: {training_stats.get('employeesNeedTraining', 0)}",
            f"Top Training Category: {training_stats.get('topTrainingCategory', '-')}",
            f"Avg Training Completion: {training_stats.get('avgTrainingCompletion', 0)}%",
            "",
            f"Appraisals Completed: {appraisals_stats.get('completed', 0)}",
            f"Pending Appraisals: {appraisals_stats.get('pending', 0)}",
            f"Appraisal Completion Rate: {appraisals_stats.get('completionRate', 0)}%",
        ]
    )

    buf = _pdf_make(
        title="Performance Overview",
        subtitle="PerformEdge — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("performance_overview_report.pdf", buf)
