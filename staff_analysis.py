from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict, Tuple
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from datetime import date
import io
import re

router = APIRouter(prefix="/eim", tags=["EIM"])


#  GET COMPANY ID FROM JWT

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


def _parse_date_range(date_range: str) -> Optional[Tuple[str, str]]:
    if not date_range:
        return None

    parts = re.split(r"\s+to\s+|\.\.", date_range.strip())
    if len(parts) != 2:
        return None

    start_str, end_str = parts[0].strip(), parts[1].strip()
    if not start_str or not end_str:
        return None

    return start_str, end_str


#  MAIN STAFF ANALYSIS ENDPOINT


@router.get("/staff-analysis")
def staff_analysis(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    authorization: Optional[str] = Header(None),
):

    company_id = _get_company_id(authorization)

    conn = get_database_connection()
    cursor = conn.cursor(dictionary=True)

    filters_sql = " AND e.company_id = %s "
    params: List = [company_id]

    #  DATE FILTER 
    if date_range:
        parsed_range = _parse_date_range(date_range)
        if parsed_range:
            start_str, end_str = parsed_range
            filters_sql += " AND e.join_date BETWEEN %s AND %s "
            params.extend([start_str, end_str])

    #  DEPARTMENT FILTER 
    if department:
        filters_sql += " AND e.department_id = %s "
        params.append(department)

    #  LOCATION FILTER 
    if location:
        filters_sql += " AND e.location_id = %s "
        params.append(location)

    today = date.today()
