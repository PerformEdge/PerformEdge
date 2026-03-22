from datetime import date
from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from date_utils import resolve_date_range, active_during_range_sql

router = APIRouter(prefix="/eim", tags=["EIM"])


#  COMPANY RESOLUTION
def _company_id_from_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None

    parts = authorization.split()

    if len(parts) == 2 and parts[0].lower() == "bearer":
        payload = verify_token(parts[1])
        return payload.get("company_id")

    return None


def _resolve_company_id(
    company_id_query: Optional[str],
    authorization: Optional[str],
) -> str:

    # Query override (testing only)
    if company_id_query:
        return company_id_query

    # From JWT token
    cid = _company_id_from_token(authorization)
    if cid:
        return cid

    # No company → reject
    raise HTTPException(status_code=401, detail="Company not resolved")



#  MAIN ENDPOINT
@router.get("/location-wise-staff")
def location_wise_staff_distribution(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):

    resolved_company_id = _resolve_company_id(company_id, authorization)

    filters_sql = ""
    params: List = []

    #  DEPARTMENT FILTER 
    if department:
        filters_sql += " AND e.department_id = %s "
        params.append(department)

    #  LOCATION FILTER 
    if location:
        filters_sql += " AND e.location_id = %s "
        params.append(location)

    #  DATE FILTER 
    if date_range:
        start_date, end_date = resolve_date_range(date_range=date_range)
        active_clause, active_params = active_during_range_sql(
            alias="e",
            start_date=start_date,
            end_date=end_date,
        )
        filters_sql += active_clause
        params.extend(active_params)

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        #  TOTAL STAFF 
        cursor.execute(f"""
            SELECT COUNT(*) AS total
            FROM employees e
            WHERE e.company_id = %s
              AND e.employement_status = 'ACTIVE'
              {filters_sql}
        """, [resolved_company_id] + params)

        total_staff = cursor.fetchone()["total"] or 0

        # LOCATION DISTRIBUTION 
        cursor.execute(f"""
            SELECT 
                l.location_name AS location,
                COUNT(e.employee_id) AS count
            FROM locations l
            LEFT JOIN employees e
                ON l.location_id = e.location_id
                AND e.company_id = %s
                AND e.employement_status = 'ACTIVE'
                {filters_sql}
            WHERE l.company_id = %s
            GROUP BY l.location_name
        """, [resolved_company_id] + params + [resolved_company_id])

        location_data = cursor.fetchall()

        # EMPLOYEE TABLE 
        cursor.execute(f"""
            SELECT
                e.full_name AS name,
                d.department_name AS department,
                l.location_name AS location
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN locations l ON e.location_id = l.location_id
            WHERE e.company_id = %s
              AND e.employement_status = 'ACTIVE'
              {filters_sql}
        """, [resolved_company_id] + params)

        employees = cursor.fetchall()

        #  MAX / MIN 
        max_location = ""
        min_location = ""

        if location_data:
            sorted_data = sorted(location_data, key=lambda x: x["count"])
            min_location = sorted_data[0]["location"]
            max_location = sorted_data[-1]["location"]

        #Builds KPI cards showing key location-based staff distribution insights
        return {
            "kpis": {
                "max_location": max_location,
                "min_location": min_location,
                "total_staff": total_staff,
                "total_locations": len(location_data)
            },
            "chart": location_data,
            "employees": employees
        }

    finally:
        cursor.close()
        conn.close()


#  PDF GENERATOR
def _pdf_make(
    *,
    title: str,
    subtitle: str = "",
    filters: Optional[Dict[str, str]] = None,
    lines: Optional[List[str]] = None,
) -> io.BytesIO:

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    x = 48
    y = height - 56

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, title)
    y -= 22

    # Subtitle
    if subtitle:
        c.setFont("Helvetica", 10)
        c.drawString(x, y, subtitle)
        y -= 18

    # Filters
    if filters:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x, y, "Filters")
        y -= 14
        c.setFont("Helvetica", 10)

        for k, v in filters.items():
            if y < 72:
                c.showPage()
                y = height - 56
            c.drawString(x, y, f"{k}: {v}")
            y -= 13

        y -= 6

    # Content
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
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


#  REPORT ENDPOINT
#Generates and downloads the location-wise staff distribution report as a PDF
@router.get("/location-wise-staff/report")
def location_wise_staff_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):

    data = location_wise_staff_distribution(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )

    chart = data.get("chart", [])
    employees = data.get("employees", [])
    kpis = data.get("kpis", {})

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Summary",
        f"Total Staff: {kpis.get('total_staff', 0)}",
        f"Total Locations: {kpis.get('total_locations', 0)}",
        f"Location with Max Staff: {kpis.get('max_location', '-')}",
        f"Location with Min Staff: {kpis.get('min_location', '-')}",
        "",
        "Location Distribution",
    ]

    for item in chart:
        lines.append(f"- {item.get('location')}: {item.get('count')} staff")

    lines.extend(["", "Employee List (first 100)"])

    for emp in employees[:100]:
        lines.append(
            f"- {emp.get('name')} | {emp.get('department')} | {emp.get('location')}"
        )

    buf = _pdf_make(
        title="Location-wise Staff Distribution",
        subtitle=f"Generated on {date.today().isoformat()}",
        filters=filters,
        lines=lines,
    )

    return _pdf_response("location_wise_staff_report.pdf", buf)
