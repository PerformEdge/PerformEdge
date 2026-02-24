from datetime import date
from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
import re

router = APIRouter(prefix="/eim", tags=["EIM"])


# ============================================================
#  COMPANY FROM TOKEN
# ============================================================

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


def _parse_date_range(date_range: str) -> Optional[List[str]]:
    if not date_range:
        return None

    parts = re.split(r"\s+to\s+|\.\.", date_range.strip())
    if len(parts) != 2:
        return None

    start_str, end_str = parts[0].strip(), parts[1].strip()
    if not start_str or not end_str:
        return None

    return [start_str, end_str]


# ============================================================
#  CATEGORY DISTRIBUTION
# ============================================================

@router.get("/category-distribution")
def category_distribution(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    authorization: Optional[str] = Header(None),
):

    company_id = _get_company_id(authorization)

    filters = []
    params: List = [company_id]

    # -------- DATE FILTER --------
    if date_range:
        parsed_range = _parse_date_range(date_range)
        if parsed_range:
            filters.append("e.join_date BETWEEN %s AND %s")
            params.extend(parsed_range)

    # -------- DEPARTMENT FILTER --------
    if department:
        filters.append("e.department_id = %s")
        params.append(department)

    # -------- LOCATION FILTER --------
    if location:
        filters.append("e.location_id = %s")
        params.append(location)

    filter_sql = ""
    if filters:
        filter_sql = " AND " + " AND ".join(filters)

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # ================= TOTAL STAFF =================
        cursor.execute(f"""
            SELECT COUNT(*) AS total
            FROM employees e
            WHERE e.company_id = %s
              AND e.employement_status = 'ACTIVE'
              {filter_sql}
        """, params)

        total_staff = cursor.fetchone()["total"] or 0

        # ================= CATEGORY COUNTS =================
        cursor.execute(f"""
            SELECT e.category AS category, COUNT(*) AS count
            FROM employees e
            WHERE e.company_id = %s
              AND e.employement_status = 'ACTIVE'
              {filter_sql}
            GROUP BY e.category
        """, params)

        rows = cursor.fetchall()

        academic = 0
        administrative = 0

        for row in rows:
            ctype = (row["category"] or "").lower()
            count = row["count"]

            if ctype == "academic":
                academic = count
            elif ctype == "administrative":
                administrative = count

        # ================= SUMMARY =================
        def percentage(value):
            return round((value / total_staff) * 100, 0) if total_staff else 0

        summary = [
            {"type": "Academic", "percentage": percentage(academic)},
            {"type": "Administrative", "percentage": percentage(administrative)},
        ]

        # ================= EMPLOYEE TABLE =================
        cursor.execute(f"""
            SELECT
                e.full_name AS name,
                d.department_name AS department,
                e.category AS category
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            WHERE e.company_id = %s
              AND e.employement_status = 'ACTIVE'
              {filter_sql}
        """, params)

        employees = cursor.fetchall()

        #  IMPORTANT: Always return labels & values
        return {
            "labels": ["Academic", "Administrative"],
            "values": [academic, administrative],
            "total_staff": total_staff,
            "summary": summary,
            "employees": employees or []
        }

    finally:
        cursor.close()
        conn.close()


# ============================================================
# PDF GENERATOR
# ============================================================

def _pdf_make(title: str, 
    subtitle: str = "",filters: Dict[str, str] = None, lines: List[str] = None) -> io.BytesIO:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    x = 50
    y = height - 60

    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, title)
    y -= 30

    # ---- Subtitle ----
    if subtitle:
        c.setFont("Helvetica", 10)
        c.drawString(x, y, subtitle)
        y -= 18

    # ---- Filters ----
    if filters:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x, y, "Filters")
        y -= 14

        c.setFont("Helvetica", 10)
        for k, v in filters.items():
            if y < 70:
                c.showPage()
                y = height - 60
                c.setFont("Helvetica", 10)

            c.drawString(x, y, f"{k}: {v}")
            y -= 13

        y -= 6

    c.setFont("Helvetica", 10)

    for line in lines:
        if y < 70:
            c.showPage()
            y = height - 60
            c.setFont("Helvetica", 10)

        c.drawString(x, y, str(line))
        y -= 15

    c.save()
    buf.seek(0)
    return buf


def _pdf_response(filename: str, buf: io.BytesIO):
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ============================================================
# 📥 REPORT ENDPOINT
# ============================================================

@router.get("/category-distribution/report")
def category_distribution_report(
    authorization: Optional[str] = Header(None),
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
):

    data = category_distribution(
        date_range=date_range,
        department=department,
        location=location,
        authorization=authorization
    )
    
    filters = {
        "Date Range": date_range or "All Time",
        "Department": department or "All Departments",
        "Location": location or "All Locations"
    }

    lines = [
        " Category Distribution:",
    ]

    for item in data["summary"]:
        lines.append(f" - {item['type']}: {item['percentage']}%")
    
    lines.extend(["", "Employee List (Name | Department | Category)"])

    
    for emp in data["employees"]:
        lines.append(f"{emp['name']} | {emp['department']} | {emp['category']}")
        
        
    buf = _pdf_make(title="Category Distribution Report", 
                    subtitle=f"Generated on {date.today().isoformat()}",
                    filters=filters, 
                    lines=lines
                    )

    return _pdf_response("category_distribution_report.pdf", buf)
