from datetime import date
from fastapi import APIRouter, Header, HTTPException, Query
from typing import Optional, List, Dict
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

router = APIRouter(prefix="/eim", tags=["EIM"])

# ============================================================
# 🔐 COMPANY RESOLUTION (SECURE)
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


# ============================================================
# 📊 BUSINESS LOGIC (REUSABLE FUNCTION)
# ============================================================

def _get_service_year_data(
    company_id: str,
    date_range: Optional[str] = "",
    department: Optional[str] = "",
    location: Optional[str] = "",
):

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    today = date.today()

    filters_sql = " WHERE e.company_id = %s "
    params: List = [company_id]

    # DATE FILTER
    if date_range:
        try:
            start_str, end_str = date_range.split(" to ")
            filters_sql += " AND e.join_date BETWEEN %s AND %s "
            params.extend([start_str.strip(), end_str.strip()])
        except:
            pass

    # DEPARTMENT FILTER
    if department:
        filters_sql += " AND e.department_id = %s "
        params.append(department)

    # LOCATION FILTER
    if location:
        filters_sql += " AND e.location_id = %s "
        params.append(location)

    # ================= DISTRIBUTION =================
    cursor.execute(f"""
        SELECT label, COUNT(*) AS value
        FROM (
            SELECT
                CASE
                    WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) < 1 THEN '0-1'
                    WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) BETWEEN 1 AND 3 THEN '1-3'
                    WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) BETWEEN 4 AND 6 THEN '4-6'
                    WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) BETWEEN 7 AND 10 THEN '7-10'
                    ELSE '10+'
                END AS label
            FROM employees e
            {filters_sql}
        ) t
        GROUP BY label
        ORDER BY
            CASE label
                WHEN '0-1' THEN 1
                WHEN '1-3' THEN 2
                WHEN '4-6' THEN 3
                WHEN '7-10' THEN 4
                ELSE 5
            END
    """, [today, today, today, today] + params)

    chart_rows = cursor.fetchall()

    # ================= LOYALTY INDEX =================
    cursor.execute(f"""
        SELECT
            ROUND(
                IF(COUNT(*) = 0, 0,
                    (SUM(CASE WHEN TIMESTAMPDIFF(YEAR, e.join_date, %s) >= 10 THEN 1 ELSE 0 END)
                    / COUNT(*)) * 100
                ), 0
            ) AS loyalty
        FROM employees e
        {filters_sql}
    """, [today] + params)

    loyalty_index = cursor.fetchone()["loyalty"] or 0

    # ================= TOP LONG SERVING =================
    cursor.execute(f"""
        SELECT
            e.full_name AS name,
            TIMESTAMPDIFF(YEAR, e.join_date, %s) AS years
        FROM employees e
        {filters_sql}
        ORDER BY e.join_date ASC
        LIMIT 5
    """, [today] + params)

    top_long_serving = cursor.fetchall()

    # ================= STAFF TABLE =================
    cursor.execute(f"""
        SELECT
            e.full_name AS name,
            d.department_name AS department,
            CONCAT(TIMESTAMPDIFF(YEAR, e.join_date, %s), ' yrs') AS years
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.department_id
        {filters_sql}
        ORDER BY e.join_date
    """, [today] + params)

    staff = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "chart": {
            "labels": [r["label"] for r in chart_rows],
            "values": [r["value"] for r in chart_rows],
        },
        "loyalty_index": loyalty_index,
        "top_long_serving": top_long_serving,
        "staff": staff,
    }


# ============================================================
# 📊 API ENDPOINT
# ============================================================

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

