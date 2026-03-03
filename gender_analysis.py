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
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from date_utils import resolve_date_range, active_during_range_sql


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


def _get_gender_analysis_data(
    resolved_company_id: str,
    date_range: str = "",
    department: str = "",
    location: str = "",
) -> Dict:
    filters_sql = ""
    params: List = []

    if department and department != "All":
        filters_sql += " AND e.department_id = %s "
        params.append(department)

    if location and location != "All":
        filters_sql += " AND e.location_id = %s "
        params.append(location)

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
    male_count = sum(1 for e in employees if (e["gender"] or "").lower() == "male")
    female_count = sum(1 for e in employees if (e["gender"] or "").lower() == "female")

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

    return _get_gender_analysis_data(
        resolved_company_id=resolved_company_id,
        date_range=date_range,
        department=department,
        location=location,
    )


# ==============================
# DOWNLOAD PDF REPORT
# ==============================

@router.get("/gender-analysis/report")
def download_gender_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    resolved_company_id = _resolve_company_id(company_id, authorization)
    data = _get_gender_analysis_data(
        resolved_company_id=resolved_company_id,
        date_range=date_range,
        department=department,
        location=location,
    )

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
