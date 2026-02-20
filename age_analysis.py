from datetime import date
from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
import io
import re
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

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
        parsed_range = _parse_date_range(date_range)
        if not parsed_range:
            raise HTTPException(status_code=400, detail="Invalid dateRange format. Use 'YYYY-MM-DD to YYYY-MM-DD' or 'YYYY-MM-DD..YYYY-MM-DD'.")
        filters_sql += " AND e.join_date BETWEEN %s AND %s "
        params.extend(parsed_range)

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