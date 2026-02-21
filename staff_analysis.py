from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict, Tuple
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from datetime import date
import io
import re

router = APIRouter(prefix="/eim", tags=["EIM"])


#  GET COMPANY ID FROM JWT

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


def _parse_date_range(date_range: str) -> Optional[Tuple[str, str]]:
    if not date_range:
        return None

    parts = re.split(r"\s+to\s+|\.\.", date_range.strip())
    if len(parts) != 2:
        return None

    start_str, end_str = parts[0].strip(), parts[1].strip()
    if not start_str or not end_str:
        return None

    return start_str, end_str


#  MAIN STAFF ANALYSIS ENDPOINT


@router.get("/staff-analysis")
def staff_analysis(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    authorization: Optional[str] = Header(None),
):

    company_id = _get_company_id(authorization)

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    filters_sql = " AND e.company_id = %s "
    params: List = [company_id]

    #  DATE FILTER 
    if date_range:
        parsed_range = _parse_date_range(date_range)
        if parsed_range:
            start_str, end_str = parsed_range
            filters_sql += " AND e.join_date BETWEEN %s AND %s "
            params.extend([start_str, end_str])

    #  DEPARTMENT FILTER 
    if department:
        filters_sql += " AND e.department_id = %s "
        params.append(department)

    #  LOCATION FILTER 
    if location:
        filters_sql += " AND e.location_id = %s "
        params.append(location)

    today = date.today()
    
    try:
     # KPIs 

        cursor.execute(f"""
            SELECT COUNT(*) AS total
            FROM employees e
            WHERE e.employement_status = 'ACTIVE'
            {filters_sql}
        """, params)
        total_staff = cursor.fetchone()["total"] or 0

        cursor.execute(f"""
            SELECT COUNT(*) AS new_joiners
            FROM employees e
            WHERE YEAR(e.join_date) = YEAR(%s)
            {filters_sql}
        """, [today] + params)
        new_joiners = cursor.fetchone()["new_joiners"] or 0

        cursor.execute(f"""
            SELECT COUNT(*) AS resigned
            FROM employees e
            WHERE e.employement_status = 'RESIGNED'
            {filters_sql}
        """, params)
        resigned_staff = cursor.fetchone()["resigned"] or 0

        cursor.execute(f"""
            SELECT COUNT(*) AS pending
            FROM employment_contract ec
            LEFT JOIN employees e ON ec.employee_id = e.employee_id
            WHERE ec.is_current = 0
            {filters_sql}
        """, params)
        pending_recruit = cursor.fetchone()["pending"] or 0
        
        # TREND 

        cursor.execute(f"""
            SELECT MONTH(e.join_date) AS month, COUNT(*) AS count
            FROM employees e
            WHERE YEAR(e.join_date) = YEAR(%s)
            {filters_sql}
            GROUP BY MONTH(e.join_date)
            ORDER BY MONTH(e.join_date)
        """, [today] + params)
        joiner_rows = cursor.fetchall()

        cursor.execute(f"""
            SELECT MONTH(e.retired_date) AS month, COUNT(*) AS count
            FROM employees e
            WHERE e.employement_status = 'RESIGNED'
              AND YEAR(e.retired_date) = YEAR(%s)
            {filters_sql}
            GROUP BY MONTH(e.retired_date)
            ORDER BY MONTH(e.retired_date)
        """, [today] + params)
        resigned_rows = cursor.fetchall()

        months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

        joiners_map = {r["month"]: r["count"] for r in joiner_rows}
        resigned_map = {r["month"]: r["count"] for r in resigned_rows}

        trend = {
            "months": months,
            "new_joiners": [joiners_map.get(i + 1, 0) for i in range(12)],
            "resigned": [resigned_map.get(i + 1, 0) for i in range(12)],
        }

        # DISTRIBUTION 

        current_staff = total_staff - resigned_staff

        distribution = {
            "new_joiners": new_joiners,
            "current_staff": current_staff,
            "resigned": resigned_staff,
        }

        # NEW JOINERS LIST 

        cursor.execute(f"""
            SELECT e.full_name AS name,
                   d.department_name AS department,
                   e.join_date AS date
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE e.employement_status = 'NEW_JOINER'
            {filters_sql}
            ORDER BY e.join_date DESC
            LIMIT 5
        """, params)
        new_joiners_list = cursor.fetchall()

        # RESIGNED LIST 

        cursor.execute(f"""
            SELECT e.full_name AS name,
                   d.department_name AS department,
                   e.retired_date AS date
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE e.employement_status = 'RESIGNED'
            {filters_sql}
            ORDER BY e.retired_date DESC
            LIMIT 5
        """, params)
        resigned_list = cursor.fetchall()

        return {
            "kpis": {
                "total_staff": total_staff,
                "new_joiners": new_joiners,
                "resigned_staff": resigned_staff,
                "pending_recruit": pending_recruit,
            },
            "trend": trend,
            "distribution": distribution,
            "new_joiners_list": new_joiners_list,
            "resigned_list": resigned_list,
        }

    finally:
        cursor.close()
        conn.close()
        

#  PDF GENERATOR


def _pdf_make(title: str, filters: Dict[str, str], lines: List[str]) -> io.BytesIO:

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    x = 50
    y = height - 60

    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, title)
    y -= 25

    c.setFont("Helvetica", 10)

    for k, v in filters.items():
        c.drawString(x, y, f"{k}: {v}")
        y -= 15

    y -= 10

    for line in lines:
        if y < 70:
            c.showPage()
            y = height - 60
            c.setFont("Helvetica", 10)
        c.drawString(x, y, line)
        y -= 14

    c.save()
    buf.seek(0)
    return buf


def _pdf_response(filename: str, buf: io.BytesIO):
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )



#  REPORT DOWNLOAD ENDPOINT


@router.get("/staff-analysis/report")
def staff_analysis_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    authorization: Optional[str] = Header(None),
):

    data = staff_analysis(
        date_range=date_range,
        department=department,
        location=location,
        authorization=authorization,
    )

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines = [
        f"Total Staff: {data['kpis']['total_staff']}",
        f"New Joiners: {data['kpis']['new_joiners']}",
        f"Resigned Staff: {data['kpis']['resigned_staff']}",
        "",
        "Trend (New Joiners): " + ", ".join(map(str, data["trend"]["new_joiners"])),
        "Trend (Resigned): " + ", ".join(map(str, data["trend"]["resigned"])),"",
        
    ]
    
    for nj in data["new_joiners_list"]:
        lines.append(f"New Joiner: {nj['name']} ({nj['department']}) - {nj['date']}")       
        
    for r in data["resigned_list"]:
        lines.append(f"Resigned: {r['name']} ({r['department']}) - {r['date']}")        

    buf = _pdf_make(
        "Staff Analysis Report",
        filters,
        lines
    )

    return _pdf_response("staff_analysis_report.pdf", buf)