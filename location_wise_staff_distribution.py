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


# ============================================================
# 📊 MAIN ENDPOINT
# ============================================================

@router.get("/location-wise-staff")
def location_wise_staff_distribution(
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
