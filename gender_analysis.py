from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Header, Query
from fastapi.responses import StreamingResponse
from database import get_database_connection
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from io import BytesIO
from datetime import datetime
from security import verify_token
from fastapi.responses import StreamingResponse
import io
import re
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


router = APIRouter(prefix="/eim", tags=["Gender Analysis"])


# ============================================================
# 🔐 COMPANY RESOLUTION
# ============================================================

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

    # 1️⃣ Query override (testing only)
    if company_id_query:
        return company_id_query

    # 2️⃣ From JWT token
    cid = _company_id_from_token(authorization)
    if cid:
        return cid

    # 3️⃣ No company → reject
    raise HTTPException(status_code=401, detail="Company not resolved")


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


# ==============================
# GET DATA
# ==============================

@router.get("/gender-analysis")
def get_gender_analysis(
     date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    resolved_company_id = _resolve_company_id(company_id, authorization)

    filters_sql = ""
    params: List = []

    # ---------------- DATE FILTER ----------------
    if date_range:
        parsed_range = _parse_date_range(date_range)
        if parsed_range:
            filters_sql += " AND e.join_date BETWEEN %s AND %s "
            params.extend(parsed_range)

    # ---------------- DEPARTMENT FILTER ----------------
    if department:
        filters_sql += " AND e.department_id = %s "
        params.append(department)

    # ---------------- LOCATION FILTER ----------------
    if location:
        filters_sql += " AND e.location_id = %s "
        params.append(location)
    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            e.full_name,
            e.gender,
            d.department_name
        FROM employees e
        JOIN departments d ON e.department_id = d.department_id
        WHERE e.gender IS NOT NULL
        AND e.employement_status = 'ACTIVE'
        AND e.company_id = %s
        {filters_sql}
    """.format(filters_sql=filters_sql)

    cursor.execute(query, [resolved_company_id] + params)
    employees = cursor.fetchall()

    cursor.close()
    conn.close()

    total = len(employees)

    male_count = sum(1 for e in employees if e["gender"].lower() == "male")
    female_count = sum(1 for e in employees if e["gender"].lower() == "female")

    male_percentage = round((male_count / total) * 100, 2) if total else 0
    female_percentage = round((female_count / total) * 100, 2) if total else 0

    return {
        "summary": {
            "male": male_percentage,
            "female": female_percentage
        },
        "total": total,
        "employees": employees
    }


# ==============================
# DOWNLOAD PDF REPORT
# ==============================

@router.get("/gender-analysis/report")
def download_gender_report(
    company_id: str = Query(...),
    department_id: str = Query(None)
):
    data = get_gender_analysis(company_id, department_id)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []

    title_style = ParagraphStyle(name="Title", fontSize=16)
    elements.append(Paragraph("Gender Analysis Report", title_style))
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ParagraphStyle(name="Normal")))
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph(f"Total Employees: {data['total']}", ParagraphStyle(name="Normal")))
    elements.append(Paragraph(f"Male %: {data['summary']['male']}%", ParagraphStyle(name="Normal")))
    elements.append(Paragraph(f"Female %: {data['summary']['female']}%", ParagraphStyle(name="Normal")))
    elements.append(Spacer(1, 0.4 * inch))

    table_data = [["Name", "Department", "Gender"]]

    for emp in data["employees"]:
        table_data.append([
            emp["full_name"],
            emp["department_name"],
            emp["gender"]
        ])

    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))

    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=gender_analysis_report.pdf"}
    )
