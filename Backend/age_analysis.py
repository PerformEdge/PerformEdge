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

    if company_id_query:
        return company_id_query

    cid = _company_id_from_token(authorization)
    if cid:
        return cid

    raise HTTPException(status_code=401, detail="Company not resolved")





# ============================================================
# 📊 MAIN ENDPOINT
# ============================================================

@router.get("/age-analysis")
def age_analysis(
     date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):

    resolved_company_id = _resolve_company_id(company_id, authorization)

    filters_sql = ""
    params: List = []

    if department:
        filters_sql += " AND e.department_id = %s "
        params.append(department)

    if location:
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

    try:

        cursor.execute(f"""
            SELECT 
                e.full_name,
                e.gender,
                e.date_of_birth,
                d.department_name
            FROM employees e
            LEFT JOIN departments d 
                ON e.department_id = d.department_id
            WHERE e.company_id = %s
              AND e.employement_status = 'ACTIVE'
              {filters_sql}
        """, [resolved_company_id] + params)

        employees = cursor.fetchall()

        today = date.today()

        age_order = [
            "Under 25",
            "25-29",
            "30-34",
            "35-39",
            "40-44",
            "45+"
        ]

        distribution = {
            label: {
                "label": label,
                "total": 0,
                "male": 0,
                "female": 0
            }
            for label in age_order
        }

        table_data = []

        for emp in employees:

            dob = emp["date_of_birth"]
            if not dob:
                continue

            age = today.year - dob.year - (
                (today.month, today.day) < (dob.month, dob.day)
            )

            if age < 25:
                label = "Under 25"
            elif age < 30:
                label = "25-29"
            elif age < 35:
                label = "30-34"
            elif age < 40:
                label = "35-39"
            elif age < 45:
                label = "40-44"
            else:
                label = "45+"

            distribution[label]["total"] += 1

            if emp["gender"] == "Male":
                distribution[label]["male"] += 1
            elif emp["gender"] == "Female":
                distribution[label]["female"] += 1

            table_data.append({
                "name": emp["full_name"],
                "age": age,
                "department": emp["department_name"]
            })

        return {
            "distribution": list(distribution.values()),
            "table": table_data
        }

    finally:
        cursor.close()
        conn.close()


# ============================================================
# 📄 PDF GENERATOR
# ============================================================

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

    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, title)
    y -= 22

    if subtitle:
        c.setFont("Helvetica", 10)
        c.drawString(x, y, subtitle)
        y -= 18

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


# ============================================================
# 📥 REPORT ENDPOINT
# ============================================================

@router.get("/age-analysis/report")
def age_analysis_report(
     date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):

    data = age_analysis(
        department=department,
        location=location,
        date_range=date_range,
        company_id=company_id,
        authorization=authorization,
    )

    distribution = data.get("distribution", [])
    employees = data.get("table", [])

    filters = {
        "Department": department or "All",
    }

    lines: List[str] = [
        "Age Distribution Summary",
        "",
    ]

    for item in distribution:
        lines.append(
            f"{item['label']} → Total: {item['total']} | "
            f"Male: {item['male']} | Female: {item['female']}"
        )

    lines.extend(["", "Employee List (first 100)"])

    for emp in employees[:100]:
        lines.append(
            f"- {emp['name']} | Age: {emp['age']} | {emp['department']}"
        )

    buf = _pdf_make(
        title="Age Analysis Report",
        subtitle=f"Generated on {date.today().isoformat()}",
        filters=filters,
        lines=lines,
    )

    return _pdf_response("age_analysis_report.pdf", buf)
