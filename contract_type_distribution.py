from datetime import date
from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
from date_utils import resolve_date_range

router = APIRouter(prefix="/eim", tags=["EIM"])


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



#  MAIN ENDPOINT


@router.get("/contract-type-distribution")
def contract_type_distribution(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    authorization: Optional[str] = Header(None),
):

    company_id = _get_company_id(authorization)

    filters = []
    params: List = [company_id]

    #  DATE FILTER 
    if date_range:
        try:
            start_dt, end_dt = resolve_date_range(date_range=date_range)
            filters.append("e.join_date BETWEEN %s AND %s")
            params.extend([start_dt.isoformat(), end_dt.isoformat()])
        except HTTPException:
            raise

    #  DEPARTMENT FILTER 
    if department:
        filters.append("e.department_id = %s")
        params.append(department)

    #  LOCATION FILTER 
    if location:
        filters.append("e.location_id = %s")
        params.append(location)

    filter_sql = ""
    if filters:
        filter_sql = " AND " + " AND ".join(filters)

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        #  TOTAL STAFF 
        cursor.execute(f"""
            SELECT COUNT(*) AS total
            FROM employees e
            WHERE e.company_id = %s
            AND e.employement_status = 'ACTIVE'
            {filter_sql}
        """, params)

        total_staff = cursor.fetchone()["total"] or 0

        #  CONTRACT COUNTS 
        cursor.execute(f"""
            SELECT ec.contract_type, COUNT(*) AS count
            FROM employment_contract ec
            JOIN employees e ON e.employee_id = ec.employee_id
            WHERE e.company_id = %s
            AND e.employement_status = 'ACTIVE'
            AND ec.is_current = 1
            {filter_sql}
            GROUP BY ec.contract_type
        """, params)

        rows = cursor.fetchall()

        permanent = 0
        consultants = 0
        probation = 0

        for row in rows:
            ctype = (row["contract_type"] or "").lower()
            count = row["count"]

            if ctype == "full-time":
                permanent = count
            elif ctype == "consultant":
                consultants = count
            elif ctype == "probation":
                probation = count

        # SUMMARY 
        def percentage(value):
            return round((value / total_staff) * 100, 0) if total_staff else 0

        summary = [
            {"type": "Permanent", "percentage": percentage(permanent)},
            {"type": "Consultants", "percentage": percentage(consultants)},
            {"type": "Probation", "percentage": percentage(probation)},
        ]

        #  EMPLOYEE TABLE 
        cursor.execute(f"""
            SELECT
                e.full_name AS name,
                d.department_name AS department,
                ec.contract_type AS contract
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN employment_contract ec
                ON ec.employee_id = e.employee_id
                AND ec.is_current = 1
            WHERE e.company_id = %s
            AND e.employement_status = 'ACTIVE'
            {filter_sql}
        """, params)

        employees = cursor.fetchall()

        return {
            "kpis": {
                "total": total_staff,
                "permanent": permanent,
                "consultants": consultants,
                "probation": probation
            },
            "summary": summary,
            "employees": employees
        }

    finally:
        cursor.close()
        conn.close()
