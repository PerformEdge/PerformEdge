from datetime import date
from typing import Dict, List, Optional
import io

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from database import get_database_connection
from date_utils import active_during_range_sql, resolve_date_range
from security import verify_token

router = APIRouter(prefix="/eim", tags=["EIM"])



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



def _years_of_service(reference_date: date, join_date: Optional[date]) -> int:
    if not join_date:
        return 0
    years = reference_date.year - join_date.year
    if (reference_date.month, reference_date.day) < (join_date.month, join_date.day):
        years -= 1
    return max(years, 0)



def _service_bucket(years: int) -> str:
    if years < 1:
        return "0-1"
    if 1 <= years <= 3:
        return "1-3"
    if 4 <= years <= 6:
        return "4-6"
    if 7 <= years <= 10:
        return "7-10"
    return "10+"



def _get_service_year_data(
    company_id: str,
    date_range: Optional[str] = "",
    department: Optional[str] = "",
    location: Optional[str] = "",
):
    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    filters_sql = " WHERE e.company_id = %s "
    params: List = [company_id]

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

    try:
        cursor.execute(
            f"""
            SELECT
                e.full_name AS name,
                e.join_date,
                d.department_name AS department
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            {filters_sql}
            ORDER BY e.join_date ASC, e.full_name ASC
            """,
            tuple(params),
        )
        rows = cursor.fetchall() or []
    finally:
        cursor.close()
        conn.close()

    today = date.today()
    bucket_order = ["0-1", "1-3", "4-6", "7-10", "10+"]
    bucket_counts = {label: 0 for label in bucket_order}
    top_long_serving: List[Dict[str, object]] = []
    staff: List[Dict[str, object]] = []
    loyal_count = 0

    for row in rows:
        years = _years_of_service(today, row.get("join_date"))
        bucket = _service_bucket(years)
        bucket_counts[bucket] += 1
        if years >= 10:
            loyal_count += 1

        top_long_serving.append(
            {
                "name": row.get("name"),
                "years": years,
                "join_date": row.get("join_date"),
            }
        )
        staff.append(
            {
                "name": row.get("name"),
                "department": row.get("department"),
                "years": f"{years} yrs",
                "sort_years": years,
            }
        )

    top_long_serving = [
        {"name": row.get("name"), "years": row.get("years")}
        for row in sorted(
            top_long_serving,
            key=lambda item: (
                item.get("join_date") or date.max,
                str(item.get("name") or ""),
            ),
        )[:5]
    ]

    loyalty_index = round((loyal_count / len(rows)) * 100, 0) if rows else 0

    return {
        "chart": {
            "labels": bucket_order,
            "values": [bucket_counts[label] for label in bucket_order],
        },
        "loyalty_index": loyalty_index,
        "top_long_serving": top_long_serving,
        "staff": [
            {
                "name": row["name"],
                "department": row.get("department"),
                "years": row["years"],
            }
            for row in sorted(
                staff,
                key=lambda item: (-int(item["sort_years"]), str(item.get("name") or "")),
            )
        ],
    }


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

    margin_x = 48
    margin_bottom = 72
    y = height - 56

    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin_x, y, title)
    y -= 22

    if subtitle:
        c.setFont("Helvetica", 10)
        c.drawString(margin_x, y, subtitle)
        y -= 18

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
        lines.append(f"- {label}: {value} employees")

    lines.append("")
    lines.append("Top Long-Serving Employees:")

    for emp in data["top_long_serving"]:
        lines.append(f"- {emp['name']} ({emp['years']} yrs)")

    lines.append("")
    lines.append("Staff:")
    for emp in data["staff"]:
        lines.append(f"- {emp['name']} | {emp['department']} | {emp['years']}")

    buf = _pdf_make(title="Service Year Analysis Report", filters=filters, lines=lines)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=service_year_analysis_report.pdf"},
    )
