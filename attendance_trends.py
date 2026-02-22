from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional

from database import get_database_connection
from attendance_location import _pdf_make, _pdf_response
from date_utils import resolve_date_range

router = APIRouter(prefix="/attendance-trends", tags=["Attendance Trends"])

# --- Last 5 days absentee ---
@router.get("/last-5-days")
def absentee_last_5_days(start: Optional[str] = Query(None), end: Optional[str] = Query(None), dateRange: Optional[str] = Query(None, alias="dateRange")):
    """Get absentee count for each day in the date range"""
    start_date, end_date = resolve_date_range(date_range=dateRange, start=start, end=end, default_days=5)
    
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT ar.date_of_attendance,
                   DAYNAME(ar.date_of_attendance) AS day,
                   COUNT(*) AS absent
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            WHERE ast.status_name='Absent'
              AND ar.date_of_attendance BETWEEN %s AND %s
            GROUP BY ar.date_of_attendance
            ORDER BY ar.date_of_attendance
        """, (start_date, end_date))
        rows = cur.fetchall()
        return [{"date": str(r["date_of_attendance"]), "day": r["day"][:3], "absent": r["absent"]} for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()

# --- Download Report for Attendance Trends ---
@router.get("/report")
def attendance_trends_report(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    dateRange: Optional[str] = Query(None, alias="dateRange"),
    department: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
):
    """Download a PDF report for Attendance Trends."""