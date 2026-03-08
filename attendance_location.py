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
            if date_range:
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

        # Present today
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

        # Absent today
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


    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))