from fastapi import APIRouter , Query, Header, HTTPException
from typing import Optional, List
from security import verify_token
from fastapi.responses import FileResponse
from datetime import date
from database import get_database_connection
from date_utils import resolve_date_range

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import fonts
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

import os

router = APIRouter(prefix="/eim", tags=["Upcoming Birthdays"])

#  COMPANY FROM TOKEN
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





# ---------------- MAIN DATA API ---------------- #

@router.get("/upcoming-birthdays")
def get_upcoming_birthdays(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    authorization: Optional[str] = Header(None),
):
    company_id = _get_company_id(authorization)

    filters = []
    params: List = [company_id]
    start_dt = None
    end_dt = None

    # -------- DATE FILTER --------
    if date_range:
        try:
            start_dt, end_dt = resolve_date_range(date_range=date_range)
        except HTTPException:
            raise

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

    query = f"""
    SELECT 
        e.full_name AS name,
        e.department_id,
        e.date_of_birth
    FROM employees e
    WHERE e.company_id = %s
      AND e.employement_status = 'ACTIVE'
      AND e.date_of_birth IS NOT NULL
      {filter_sql}
    """
    cursor.execute(query, params)
    employees = cursor.fetchall()


    # Get department names
    dept_query = "SELECT department_id, department_name FROM departments WHERE company_id = %s"
    cursor.execute(dept_query, (company_id,))
    departments = {row['department_id']: row['department_name'] for row in cursor.fetchall()}

    today = date.today()
    results = []

    for emp in employees:
        dob = emp["date_of_birth"]
        
        # Get department name
        dept_name = departments.get(emp["department_id"], "Unknown")

        this_year_birthday = dob.replace(year=today.year)
        if this_year_birthday < today:
            this_year_birthday = dob.replace(year=today.year + 1)

        days_left = (this_year_birthday - today).days

        should_include = False

        if start_dt and end_dt:
            should_include = start_dt <= this_year_birthday <= end_dt
        else:
            should_include = 0 <= days_left <= 30

        if should_include:

            if days_left <= 7:
                tag = "This Week"
            elif days_left <= 14:
                tag = "Soon"
            else:
                tag = "Next Month"

            results.append({
                "name": emp["name"],
                "department": dept_name,
                "birthday": this_year_birthday.strftime("%Y-%m-%d"),
                "days_left": f"{days_left} days",
                "tag": tag
            })

    results.sort(key=lambda x: int(x["days_left"].split()[0]))

    highlights = [
        {
            "name": r["name"],
            "department": r["department"],
            "date": r["birthday"]
        }
        for r in results[:3]
    ]

    cursor.close()
    conn.close()

    return {
        "highlights": highlights,
        "table": results
    }


# ---------------- PDF DOWNLOAD API ---------------- #

@router.get("/upcoming-birthdays/report")
def download_upcoming_birthdays_report(
    authorization: Optional[str] = Header(None),
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
):
    data = get_upcoming_birthdays(
        date_range=date_range,
        department=department,
        location=location,
        authorization=authorization
    )


    file_path = "upcoming_birthdays_report.pdf"
    doc = SimpleDocTemplate(file_path)

    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph("Upcoming Birthdays Report", styles["Title"]))
    elements.append(Spacer(1, 0.5 * inch))

    table_data = [["Name", "Department", "Birthday", "Days Left", "Tag"]]

    for row in data["table"]:
        table_data.append([
            row["name"],
            row["department"],
            row["birthday"],
            row["days_left"],
            row["tag"]
        ])

    table = Table(table_data, repeatRows=1)

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("ALIGN", (3, 1), (3, -1), "CENTER"),
    ]))

    elements.append(table)
    doc.build(elements)

    return FileResponse(
        path=file_path,
        filename="Upcoming_Birthdays_Report.pdf",
        media_type="application/pdf"
    )