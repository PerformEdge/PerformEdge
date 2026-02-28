from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List, Dict, Tuple
from database import get_database_connection
from security import verify_token
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from datetime import date
import io
from date_utils import resolve_date_range

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
    dim_filters_sql = " AND e.company_id = %s "
    dim_params: List = [company_id]
    start_dt = None
    end_dt = None

    # ---------------- DATE FILTER ----------------
    if date_range:
        try:
            start_dt, end_dt = resolve_date_range(date_range=date_range)
            filters_sql += " AND e.join_date BETWEEN %s AND %s "
            params.extend([start_dt.isoformat(), end_dt.isoformat()])
        except HTTPException:
            raise

    # ---------------- DEPARTMENT FILTER ----------------
    if department:
        filters_sql += " AND e.department_id = %s "
        params.append(department)
        dim_filters_sql += " AND e.department_id = %s "
        dim_params.append(department)

    # ---------------- LOCATION FILTER ----------------
    if location:
        filters_sql += " AND e.location_id = %s "
        params.append(location)
        dim_filters_sql += " AND e.location_id = %s "
        dim_params.append(location)

    today = date.today()

    try:
        # ================= KPIs =================

        cursor.execute(f"""
            SELECT COUNT(*) AS total
            FROM employees e
            WHERE e.employement_status = 'ACTIVE'
            {filters_sql}
        """, params)
        total_staff = cursor.fetchone()["total"] or 0

        cursor.execute(f"""
            SELECT COUNT(*) AS new_joiners
            FROM employees e
            WHERE 1=1
            {dim_filters_sql}
            {'AND e.join_date BETWEEN %s AND %s' if start_dt and end_dt else 'AND YEAR(e.join_date) = YEAR(%s)'}
        """, ([*dim_params, start_dt.isoformat(), end_dt.isoformat()] if start_dt and end_dt else [*dim_params, today]))
        new_joiners = cursor.fetchone()["new_joiners"] or 0

        cursor.execute(f"""
            SELECT COUNT(*) AS resigned
            FROM employees e
            WHERE (e.employement_status = 'RESIGNED' OR e.retired_date IS NOT NULL)
            {dim_filters_sql}
            {'AND COALESCE(e.retired_date, e.join_date) BETWEEN %s AND %s' if start_dt and end_dt else 'AND YEAR(COALESCE(e.retired_date, e.join_date)) = YEAR(%s)'}
        """, ([*dim_params, start_dt.isoformat(), end_dt.isoformat()] if start_dt and end_dt else [*dim_params, today]))
        resigned_staff = cursor.fetchone()["resigned"] or 0

        cursor.execute(f"""
            SELECT COUNT(*) AS pending
            FROM employment_contract ec
            LEFT JOIN employees e ON ec.employee_id = e.employee_id
            WHERE ec.is_current = 0
            {filters_sql}
        """, params)
        pending_recruit = cursor.fetchone()["pending"] or 0

        #  TREND ANALYSIS

        cursor.execute(f"""
            SELECT MONTH(e.join_date) AS month, COUNT(*) AS count
            FROM employees e
            WHERE 1=1
            {dim_filters_sql}
            {'AND e.join_date BETWEEN %s AND %s' if start_dt and end_dt else 'AND YEAR(e.join_date) = YEAR(%s)'}
            GROUP BY MONTH(e.join_date)
            ORDER BY MONTH(e.join_date)
        """, ([*dim_params, start_dt.isoformat(), end_dt.isoformat()] if start_dt and end_dt else [*dim_params, today]))
        joiner_rows = cursor.fetchall()

        cursor.execute(f"""
                        SELECT MONTH(COALESCE(e.retired_date, e.join_date)) AS month, COUNT(*) AS count
            FROM employees e
                        WHERE (e.employement_status = 'RESIGNED' OR e.retired_date IS NOT NULL)
                        {dim_filters_sql}
                        {'AND COALESCE(e.retired_date, e.join_date) BETWEEN %s AND %s' if start_dt and end_dt else 'AND YEAR(COALESCE(e.retired_date, e.join_date)) = YEAR(%s)'}
                        GROUP BY MONTH(COALESCE(e.retired_date, e.join_date))
                        ORDER BY MONTH(COALESCE(e.retired_date, e.join_date))
                """, ([*dim_params, start_dt.isoformat(), end_dt.isoformat()] if start_dt and end_dt else [*dim_params, today]))
        resigned_rows = cursor.fetchall()

        months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

        joiners_map = {r["month"]: r["count"] for r in joiner_rows}
        resigned_map = {r["month"]: r["count"] for r in resigned_rows}

        trend = {
            "months": months,
            "new_joiners": [joiners_map.get(i + 1, 0) for i in range(12)],
            "resigned": [resigned_map.get(i + 1, 0) for i in range(12)],
        }

        #  DISTRIBUTION 

        current_staff = total_staff - resigned_staff

        distribution = {
            "new_joiners": new_joiners,
            "current_staff": current_staff,
            "resigned": resigned_staff,
        }

        #  NEW JOINERS LIST 

        cursor.execute(f"""
            SELECT e.full_name AS name,
                   d.department_name AS department,
                   e.join_date AS date
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE 1=1
            {dim_filters_sql}
            {'AND e.join_date BETWEEN %s AND %s' if start_dt and end_dt else 'AND YEAR(e.join_date) = YEAR(%s)'}
            ORDER BY e.join_date DESC
            LIMIT 5
        """, ([*dim_params, start_dt.isoformat(), end_dt.isoformat()] if start_dt and end_dt else [*dim_params, today]))
        new_joiners_list = cursor.fetchall()

        #  RESIGNED LIST 

        cursor.execute(f"""
            SELECT e.full_name AS name,
                   d.department_name AS department,
                   COALESCE(e.retired_date, e.join_date) AS date
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE (e.employement_status = 'RESIGNED' OR e.retired_date IS NOT NULL)
            {dim_filters_sql}
            {'AND COALESCE(e.retired_date, e.join_date) BETWEEN %s AND %s' if start_dt and end_dt else 'AND YEAR(COALESCE(e.retired_date, e.join_date)) = YEAR(%s)'}
            ORDER BY COALESCE(e.retired_date, e.join_date) DESC
            LIMIT 5
        """, ([*dim_params, start_dt.isoformat(), end_dt.isoformat()] if start_dt and end_dt else [*dim_params, today]))
        resigned_list = cursor.fetchall()

        return {
            "kpis": {
                "total_staff": total_staff,
                "new_joiners": new_joiners,
                "resigned_staff": resigned_staff,
                "pending_recruit": pending_recruit,
            },
            "trend": trend,
            "distribution": distribution,
            "new_joiners_list": new_joiners_list,
            "resigned_list": resigned_list,
        }

    finally:
        cursor.close()
        conn.close()


#  PDF GENERATOR


def _pdf_make(title: str, filters: Dict[str, str], lines: List[str]) -> io.BytesIO:

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    x = 50
    y = height - 60

    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, title)
    y -= 25

    c.setFont("Helvetica", 10)

    for k, v in filters.items():
        c.drawString(x, y, f"{k}: {v}")
        y -= 15

    y -= 10

    for line in lines:
        if y < 70:
            c.showPage()
            y = height - 60
            c.setFont("Helvetica", 10)
        c.drawString(x, y, line)
        y -= 14

    c.save()
    buf.seek(0)
    return buf


def _pdf_response(filename: str, buf: io.BytesIO):
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


#  REPORT DOWNLOAD ENDPOINT


@router.get("/staff-analysis/report")
def staff_analysis_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    authorization: Optional[str] = Header(None),
):

    data = staff_analysis(
        date_range=date_range,
        department=department,
        location=location,
        authorization=authorization,
    )

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines = [
        f"Total Staff: {data['kpis']['total_staff']}",
        f"New Joiners: {data['kpis']['new_joiners']}",
        f"Resigned Staff: {data['kpis']['resigned_staff']}",
        "",
        "Trend (New Joiners): " + ", ".join(map(str, data["trend"]["new_joiners"])),
        "Trend (Resigned): " + ", ".join(map(str, data["trend"]["resigned"])),
    ]
    
    for nj in data["new_joiners_list"]:
        lines.append(f"New Joiner: {nj['name']} ({nj['department']}) - {nj['date']}")       
        
    for r in data["resigned_list"]:
        lines.append(f"Resigned: {r['name']} ({r['department']}) - {r['date']}")  
    buf = _pdf_make(
        "Staff Analysis Report",
        filters,
        lines
    )

    return _pdf_response("staff_analysis_report.pdf", buf)