from datetime import date
from fastapi import APIRouter, Header, HTTPException, Query
from typing import Optional, List, Dict
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
from date_utils import resolve_date_range, active_during_range_sql

router = APIRouter(prefix="/eim", tags=["EIM"])

#  COMPANY RESOLUTION (SECURE)

def _get_company_id(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid token format")

    payload = verify_token(parts[1])
    company_id = payload.get("company_id")

    if not company_id:
        raise HTTPException(status_code=403, detail="Company ID missing in token")

    return company_id



#  BUSINESS LOGIC (REUSABLE FUNCTION)
# Apply date range filter to return records only within the selected period

def _get_service_year_data(
    company_id: str,
    date_range: Optional[str] = "",
    department: Optional[str] = "",
    location: Optional[str] = "",
):

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    today = date.today()

    filters_sql = " WHERE e.company_id = %s "
    params: List = [company_id]

    # DEPARTMENT FILTER
    if department:
        filters_sql += " AND e.department_id = %s "
        params.append(department)

    # LOCATION FILTER
    if location:
        filters_sql += " AND e.location_id = %s "
        params.append(location)

    # DATE FILTER (employees active during selected period)
    if date_range:
        start_date, end_date = resolve_date_range(date_range=date_range)
        active_clause, active_params = active_during_range_sql(
            alias="e",
            start_date=start_date,
            end_date=end_date,
        )
        filters_sql += active_clause
        params.extend(active_params)

    #  DISTRIBUTION 
    cursor.execute(f"""
        SELECT label, COUNT(*) AS value
        FROM (
            SELECT
                CASE
                    WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) < 1 THEN '0-1'
                    WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) BETWEEN 1 AND 3 THEN '1-3'
                    WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) BETWEEN 4 AND 6 THEN '4-6'
                    WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) BETWEEN 7 AND 10 THEN '7-10'
                    ELSE '10+'
                END AS label
            FROM employees e
            {filters_sql}
        ) t
        GROUP BY label
        ORDER BY
            CASE label
                WHEN '0-1' THEN 1
                WHEN '1-3' THEN 2
                WHEN '4-6' THEN 3
                WHEN '7-10' THEN 4
                ELSE 5
            END
    """, [today, today, today, today] + params)

    chart_rows = cursor.fetchall()

    #  LOYALTY INDEX 
    cursor.execute(f"""
        SELECT
            ROUND(
                IF(COUNT(*) = 0, 0,
                    (SUM(CASE WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) >= 10 THEN 1 ELSE 0 END)
                    / COUNT(*)) * 100
                ), 0
            ) AS loyalty
        FROM employees e
        {filters_sql}
    """, [today] + params)

    loyalty_index = cursor.fetchone()["loyalty"] or 0

    #  TOP LONG SERVING 
    cursor.execute(f"""
        SELECT
            e.full_name AS name,
            TIMESTAMPDIFF(YEAR, e.join_date, %s) AS years
        FROM employees e
        {filters_sql}
        ORDER BY e.join_date ASC
        LIMIT 5
    """, [today] + params)

    top_long_serving = cursor.fetchall()

    #  STAFF TABLE 
    cursor.execute(f"""
        SELECT
            e.full_name AS name,
            d.department_name AS department,
            CONCAT(TIMESTAMPDIFF(YEAR, e.join_date, %s), ' yrs') AS years
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.department_id
        {filters_sql}
        ORDER BY e.join_date
    """, [today] + params)

    staff = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "chart": {
            "labels": [r["label"] for r in chart_rows],
            "values": [r["value"] for r in chart_rows],
        },
        "loyalty_index": loyalty_index,
        "top_long_serving": top_long_serving,
        "staff": staff,
    }


#  API ENDPOINT


@router.get("/service-year-analysis")
def service_year_analysis(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    authorization: Optional[str] = Header(None),
):
    company_id = _get_company_id(authorization)

    return _get_service_year_data(
        company_id=company_id,
        date_range=date_range,
        department=department,
        location=location,
    )



#  PDF GENERATOR
def _pdf_make(
    *,
    title: str,
    subtitle: str = "",
    filters: Optional[Dict[str, str]] = None,
    lines: Optional[List[str]] = None,
) -> io.BytesIO:
    """Create a simple PDF (in-memory) and return a BytesIO buffer."""

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    margin_x = 48
    margin_bottom = 72
    y = height - 56

    # ---- Title ----
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin_x, y, title)
    y -= 22

    # ---- Subtitle ----
    if subtitle:
        c.setFont("Helvetica", 10)
        c.drawString(margin_x, y, subtitle)
        y -= 18

    # ---- Filters ----
    if filters:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin_x, y, "Filters")
        y -= 14

        c.setFont("Helvetica", 10)
        for k, v in filters.items():
            if y < margin_bottom:
                c.showPage()
                y = height - 56
                c.setFont("Helvetica", 10)

            c.drawString(margin_x, y, f"{k}: {v}")
            y -= 13

        y -= 6

    # ---- Content ----
    c.setFont("Helvetica", 10)

    for line in (lines or []):
        if y < margin_bottom:
            c.showPage()
            y = height - 56
            c.setFont("Helvetica", 10)

        c.drawString(margin_x, y, str(line))
        y -= 13

    c.save()
    buf.seek(0)
    return buf

#  REPORT ENDPOINT
# Generate the report using the filtered employee data

@router.get("/service-year-analysis/report")
def service_year_analysis_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    authorization: Optional[str] = Header(None),
):
    company_id = _get_company_id(authorization)

    data = _get_service_year_data(
        company_id=company_id,
        date_range=date_range,
        department=department,
        location=location,
    )
    filters = {
        "Date Range": date_range or "All Time", 
        "Department": department or "All Departments",
        "Location": location or "All Locations",
    }

    lines = [
        f"Loyalty Index: {data['loyalty_index']}%",
        "",
        "Service Year Distribution:",
    ]

    for label, value in zip(data["chart"]["labels"], data["chart"]["values"]):
        lines.append(f"- {label}: {value} years")

    lines.append("")
    lines.append("Top Long-Serving Employees:")

    for emp in data["top_long_serving"]:
        lines.append(f"- {emp['name']} ({emp['years']} yrs)")
    
    for emp in data["staff"]:
        lines.append(f"- {emp['name']} | {emp['department']} | {emp['years']} ")

    buf = _pdf_make(title="Service Year Analysis Report", filters=filters, lines=lines)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=service_year_analysis_report.pdf"},
    )
