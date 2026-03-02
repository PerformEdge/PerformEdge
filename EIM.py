from datetime import date
from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import calendar
import io
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


def _resolve_company_id(company_id_query: Optional[str], authorization: Optional[str]) -> str:
    if company_id_query:
        return company_id_query

    cid = _company_id_from_token(authorization)
    if cid:
        return cid

    raise HTTPException(status_code=401, detail="Company not resolved")



#  MAIN EIM DASHBOARD


@router.get("/dashboard")
def eim_dashboard(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):

    resolved_company_id = _resolve_company_id(company_id, authorization)

    filters_sql = ""
    params: List = []
    dim_filters_sql = ""
    dim_params: List = []

    if date_range:
        start_date, end_date = resolve_date_range(date_range=date_range)
        active_clause, active_params = active_during_range_sql(
            alias="e",
            start_date=start_date,
            end_date=end_date,
        )
        filters_sql += active_clause
        params.extend(active_params)

    if department:
        filters_sql += " AND e.department_id = %s "
        params.append(department)
        dim_filters_sql += " AND e.department_id = %s "
        dim_params.append(department)

    if location:
        filters_sql += " AND e.location_id = %s "
        params.append(location)
        dim_filters_sql += " AND e.location_id = %s "
        dim_params.append(location)

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    today = date.today()

    try:

        # KPIs 

        cursor.execute(f"""
            SELECT COUNT(*) AS total
            FROM employees e
            WHERE e.company_id = %s
              AND e.employement_status = 'ACTIVE'
              {filters_sql}
        """, [resolved_company_id] + params)

        total = cursor.fetchone()["total"]

        cursor.execute(f"""
            SELECT COUNT(*) AS joiners
            FROM employees e
            WHERE e.company_id = %s
              {dim_filters_sql}
                            AND YEAR(e.join_date) = YEAR(%s)
                    """, [resolved_company_id] + dim_params + [today])

        joiners = cursor.fetchone()["joiners"]

        cursor.execute(f"""
            SELECT COUNT(*) AS resigned
            FROM employees e
            WHERE e.company_id = %s
                            AND (e.employement_status = 'RESIGNED' OR e.retired_date IS NOT NULL)
              {dim_filters_sql}
                                                        AND YEAR(COALESCE(e.retired_date, e.join_date)) = YEAR(%s)
                    """, [resolved_company_id] + dim_params + [today])

        resigned = cursor.fetchone()["resigned"]

        cursor.execute(f"""
            SELECT ROUND(AVG(TIMESTAMPDIFF(YEAR, e.join_date, %s)),1) AS avg_years
            FROM employees e
            WHERE e.company_id = %s
              AND e.employement_status = 'ACTIVE'
              {filters_sql}
        """, [today, resolved_company_id] + params)

        avg_years = cursor.fetchone()["avg_years"] or 0

        #  GENDER 

        cursor.execute(f"""
            SELECT e.gender AS label, COUNT(*) AS value
            FROM employees e
            WHERE e.company_id = %s
              {filters_sql}
            GROUP BY e.gender
        """, (resolved_company_id,) + tuple(params))

        gender = cursor.fetchall()

        # AGE 

        cursor.execute(f"""
            SELECT
                COALESCE(
                    CASE
                        WHEN TIMESTAMPDIFF(YEAR, date_of_birth, %s) < 25 THEN '-25'
                        WHEN TIMESTAMPDIFF(YEAR, date_of_birth, %s) BETWEEN 25 AND 35 THEN '25-35'
                        WHEN TIMESTAMPDIFF(YEAR, date_of_birth, %s) BETWEEN 36 AND 45 THEN '36-45'
                        WHEN TIMESTAMPDIFF(YEAR, date_of_birth, %s) BETWEEN 46 AND 55 THEN '46-55'
                        ELSE '55+'
                    END,
                    'Unknown'
                ) AS label,
                COUNT(*) AS value
            FROM employees e
            WHERE e.company_id = %s
            {filters_sql}
            GROUP BY label
        """, (today, today, today, today, resolved_company_id) + tuple(params))

        age = cursor.fetchall()

        # STAFF TREND 

        cursor.execute(f"""
            SELECT MONTH(join_date) AS month, COUNT(*) AS count
            FROM employees e
            WHERE e.company_id = %s
                            {dim_filters_sql}
                            AND YEAR(e.join_date) = YEAR(%s)
            GROUP BY MONTH(e.join_date)
                """, tuple([resolved_company_id] + dim_params + [today]))

        join_map = {r["month"]: r["count"] for r in cursor.fetchall()}

        cursor.execute(f"""
            SELECT MONTH(COALESCE(e.retired_date, e.join_date)) AS month, COUNT(*) AS count
            FROM employees e
            WHERE e.company_id = %s
                            AND (e.employement_status = 'RESIGNED' OR e.retired_date IS NOT NULL)
                            {dim_filters_sql}
                            AND YEAR(COALESCE(e.retired_date, e.join_date)) = YEAR(%s)
            GROUP BY MONTH(COALESCE(e.retired_date, e.join_date))
                """, tuple([resolved_company_id] + dim_params + [today]))

        resign_map = {r["month"]: r["count"] for r in cursor.fetchall()}

        months = list(calendar.month_abbr)[1:]

        staff_trend = {
            "labels": months,
            "joiners": [join_map.get(i+1, 0) for i in range(12)],
            "resignations": [resign_map.get(i+1, 0) for i in range(12)],
        }

        #  LOCATION 

        cursor.execute(f"""
            SELECT l.location_name AS label, COUNT(e.employee_id) AS value
            FROM locations l
            LEFT JOIN employees e
                ON l.location_id = e.location_id
                AND e.company_id = %s
            WHERE l.company_id = %s
              {filters_sql}
            GROUP BY l.location_name
        """, (resolved_company_id, resolved_company_id) + tuple(params))

        location_data = cursor.fetchall()
        
       #  CATEGORY 

        cursor.execute(f"""
            SELECT 
                e.category AS label,
                COUNT(*) AS value
            FROM employees e
            WHERE e.company_id = %s
            AND e.employement_status = 'ACTIVE'
            {filters_sql}
            GROUP BY e.category
        """, (resolved_company_id,) + tuple(params))

        category_data = cursor.fetchall()

        
       #  CONTRACT TYPE 

        cursor.execute(f"""
            SELECT 
                ec.contract_type AS label,
                COUNT(*) AS value
            FROM employment_contract ec
            JOIN employees e ON e.employee_id = ec.employee_id
            WHERE e.company_id = %s
            AND e.employement_status = 'ACTIVE'
            AND ec.is_current = 1
            {filters_sql}
            GROUP BY ec.contract_type
        """, (resolved_company_id,) + tuple(params))

        contract_type_data = cursor.fetchall()
        
        permanent = 0
        consultants = 0
        probation = 0

        for row in contract_type_data:
            ctype = (row["label"] or "").lower()
            count = row["value"]

            if ctype == "full-time":
                permanent = count
            elif ctype == "consultant":
                consultants = count
            elif ctype == "probation":
                probation = count

        def percentage(value):
            return round((value / total) * 100, 0) if total else 0
        contract_type_pie = [
            {"label": "Permanent", "percentage": percentage(permanent)},
            {"label": "Consultants", "percentage": percentage(consultants)},
            {"label": "Probation", "percentage": percentage(probation)},
        ]


        #  BIRTHDAYS 

        birthday_filters = ""
        birthday_params: List = [resolved_company_id]

        if department:
            birthday_filters += " AND e.department_id = %s "
            birthday_params.append(department)

        if location:
            birthday_filters += " AND e.location_id = %s "
            birthday_params.append(location)

        cursor.execute(f"""
            SELECT e.full_name AS name,
                   e.date_of_birth AS dob,
                   d.department_name AS department
            FROM employees e
            LEFT JOIN departments d
              ON d.department_id = e.department_id
             AND d.company_id = e.company_id
            WHERE e.company_id = %s
              AND e.employement_status = 'ACTIVE'
              AND e.date_of_birth IS NOT NULL
              {birthday_filters}
        """, tuple(birthday_params))

        birthday_rows = cursor.fetchall()
        birthdays = []

        for row in birthday_rows:
            dob = row.get("dob")
            if not dob:
                continue

            next_birthday = dob.replace(year=today.year)
            if next_birthday < today:
                next_birthday = dob.replace(year=today.year + 1)

            days_left = (next_birthday - today).days
            if 0 <= days_left <= 30:
                birthdays.append({
                    "name": row.get("name"),
                    "date": next_birthday.strftime("%b %d"),
                    "department": row.get("department") or "Unknown",
                    "_days_left": days_left,
                })

        birthdays.sort(key=lambda b: b["_days_left"])
        birthdays = [
            {
                "name": b["name"],
                "date": b["date"],
                "department": b["department"],
            }
            for b in birthdays[:6]
        ]

        return {
            "kpis": {
                "total_employees": total,
                "new_joiners": joiners,
                "resigned_staff": resigned,
                "avg_service_years": avg_years,
            },
            "charts": {
                "gender": gender,
                "age": age,
                "staff_trend": staff_trend,
                "location": location_data,
                "category": category_data,
                "contract_type": contract_type_pie,
            },
            "birthdays": birthdays
}


    finally:
        cursor.close()
        conn.close()



#  PDF REPORT


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


@router.get("/dashboard/report")
def dashboard_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):

    data = eim_dashboard(company_id=company_id, authorization=authorization, date_range=date_range, department=department, location=location)
    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines = [
        f"{k.replace('_', ' ').title()}: {v}"
        for k, v in data["kpis"].items()
    ]
    for emp in data.get("employees", []):
        lines.append(f"{emp['full_name']} - {emp['department']} - {emp['location']}")
        
    for c in data.get("charts", {}).get("contract_type", []):
        lines.append(f"{c['label']}: {c['percentage']}%")
        
    for c in data.get("charts", {}).get("category", []):
        lines.append(f"{c['label']}: {c['value']}")
    for c in data.get("charts", {}).get("location", []):
        lines.append(f"{c['label']}: {c['value']}")
        
    for c in data.get("charts", {}).get("gender", []):
        lines.append(f"{c['label']}: {c['value']}")
        
    for c in data.get("charts", {}).get("age", []):
        lines.append(f"{c['label']}: {c['value']}")
        
    
    buf = _pdf_make(
        title="Location-wise Staff Distribution",
        subtitle=f"Generated on {date.today().isoformat()}",
        filters=filters,
        lines=lines,
    )

    return _pdf_response("eim_dashboard_report.pdf", buf)