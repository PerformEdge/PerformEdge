from fastapi import APIRouter, Query, Header, HTTPException
from typing import Optional, List
from attendance_location import _pdf_make, _pdf_response, performance_ranking, training_needs, appraisals_completion, appraisal_completion_status
from datetime import date, timedelta, datetime
from database import get_database_connection
from date_utils import resolve_date_range
import re

router = APIRouter(prefix="/latecomers", tags=["Latecomers"])

@router.get("/summary")
def late_summary(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    """Late summary accepting start/end or dateRange (YYYY-MM-DD to YYYY-MM-DD)."""
    start_resolved, end_resolved = resolve_date_range(date_range=dateRange, start=str(start) if start else None, end=str(end) if end else None, default_days=7)
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT COUNT(*) AS total_late,
                   0 AS avg_minutes
            FROM attendance_records
            WHERE status_id IN (
              SELECT status_id FROM attendance_status_type WHERE status_name='Late'
            )
            AND date_of_attendance BETWEEN %s AND %s
        """, (start_resolved, end_resolved))
        result = cur.fetchone()
        if result is None:
            return {"total_late": 0, "avg_minutes": 0}

        # ensure JSON serializable types
        return {
            "total_late": int(result.get("total_late", 0) or 0),
            "avg_minutes": int(result.get("avg_minutes", 0) or 0),
        }
    finally:
        cur.close()
        conn.close()


@router.get("/by-department")
def late_by_department(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None)):
    start_resolved, end_resolved = resolve_date_range(date_range=dateRange, start=str(start) if start else None, end=str(end) if end else None, default_days=7)
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT d.department_name,
                   COUNT(*) AS late_count,
                   (SELECT COUNT(*) FROM employees e2 WHERE e2.department_id=d.department_id) AS total_staff,
                   ROUND(COUNT(*) / NULLIF((SELECT COUNT(*) FROM employees e2 WHERE e2.department_id=d.department_id), 0) * 100, 1) AS rate,
                   0 AS avg_minutes
            FROM attendance_records ar
            JOIN employees e ON e.employee_id=ar.employee_id
            JOIN departments d ON d.department_id=e.department_id
            WHERE ar.status_id IN (
              SELECT status_id FROM attendance_status_type WHERE status_name='Late'
            )
            AND ar.date_of_attendance BETWEEN %s AND %s
            GROUP BY d.department_id, d.department_name
            ORDER BY rate DESC
        """, (start_resolved, end_resolved))
        rows = cur.fetchall()
        # normalize numeric types for JSON serialization
        normalized = []
        for r in rows:
            normalized.append({
                "department_name": r.get("department_name"),
                "late_count": int(r.get("late_count", 0) or 0),
                "total_staff": int(r.get("total_staff", 0) or 0),
                "rate": float(r.get("rate", 0) or 0),
                "avg_minutes": int(r.get("avg_minutes", 0) or 0),
            })
        return normalized
    finally:
        cur.close()
        conn.close()

@router.get("/7day-trend")
def seven_day_trend(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange')):
    # If dateRange supplied, respect it; otherwise use start/end or default to last 7 days
    start_resolved, end_resolved = resolve_date_range(date_range=dateRange, start=str(start) if start else None, end=str(end) if end else None, default_days=7)

    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        # Get the status_id for 'Late' once
        cur.execute("SELECT status_id FROM attendance_status_type WHERE status_name='Late' LIMIT 1")
        status_result = cur.fetchone()
        if not status_result:
            # No 'Late' status found, return empty 7-day trend
            data = []
            for i in range(6, -1, -1):
                day = end_resolved - timedelta(days=i)
                data.append({"day": day.strftime("%a"), "value": 0})
            return data

        late_status_id = status_result['status_id']

        cur.execute("""
            SELECT DATE(date_of_attendance) AS trend_date,
                   COUNT(*) AS late_count
            FROM attendance_records
            WHERE status_id = %s
            AND date_of_attendance BETWEEN %s AND %s
            GROUP BY DATE(date_of_attendance)
            ORDER BY trend_date
        """, (late_status_id, start_resolved, end_resolved))

        fetched = cur.fetchall()
        result_dict = {}
        for row in fetched:
            trend_val = row.get("trend_date")
            # normalize to date object
            if isinstance(trend_val, datetime):
                trend_key = trend_val.date()
            else:
                trend_key = trend_val
            result_dict[trend_key] = int(row.get("late_count", 0) or 0)

        data = []
        for i in range(6, -1, -1):
            day = end_resolved - timedelta(days=i)
            late_count = result_dict.get(day, 0)
            data.append({"day": day.strftime("%a"), "value": late_count})

        return data
    finally:
        cur.close()
        conn.close()
