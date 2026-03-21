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
        filter_sql = ""
        params = [start_resolved, end_resolved]
        if department and department != "All":
            filter_sql += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            filter_sql += " AND l.location_name = %s"
            params.append(location)

        cur.execute("""
            SELECT COUNT(*) AS total_late,
                   0 AS avg_minutes
            FROM attendance_records ar
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            JOIN employees e ON e.employee_id = ar.employee_id
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE ast.status_name='Late'
            AND ar.date_of_attendance BETWEEN %s AND %s
        """ + filter_sql, tuple(params))
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
def late_by_department(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
    start_resolved, end_resolved = resolve_date_range(date_range=dateRange, start=str(start) if start else None, end=str(end) if end else None, default_days=7)
    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)
    try:
        filter_sql = ""
        params = [start_resolved, end_resolved]
        if department and department != "All":
            filter_sql += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            filter_sql += " AND l.location_name = %s"
            params.append(location)

        cur.execute("""
            SELECT d.department_name,
                   COUNT(*) AS late_count,
                   (SELECT COUNT(*) FROM employees e2 WHERE e2.department_id=d.department_id) AS total_staff,
                   ROUND(COUNT(*) / NULLIF((SELECT COUNT(*) FROM employees e2 WHERE e2.department_id=d.department_id), 0) * 100, 1) AS rate,
                   0 AS avg_minutes
            FROM attendance_records ar
            JOIN employees e ON e.employee_id=ar.employee_id
            JOIN departments d ON d.department_id=e.department_id
            JOIN attendance_status_type ast ON ast.status_id = ar.status_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE ast.status_name='Late'
            AND ar.date_of_attendance BETWEEN %s AND %s
        """ + filter_sql + """
            GROUP BY d.department_id, d.department_name
            ORDER BY rate DESC
        """, tuple(params))
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
def seven_day_trend(start: Optional[date] = Query(None), end: Optional[date] = Query(None), dateRange: Optional[str] = Query(None, alias='dateRange'), department: Optional[str] = Query(None), location: Optional[str] = Query(None)):
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

        filter_sql = ""
        params = [late_status_id, start_resolved, end_resolved]
        if department and department != "All":
            filter_sql += " AND d.department_name = %s"
            params.append(department)
        if location and location != "All":
            filter_sql += " AND l.location_name = %s"
            params.append(location)

        cur.execute("""
            SELECT DATE(date_of_attendance) AS trend_date,
                   COUNT(*) AS late_count
            FROM attendance_records ar
            JOIN employees e ON e.employee_id = ar.employee_id
            LEFT JOIN departments d ON d.department_id = e.department_id
            LEFT JOIN locations l ON l.location_id = e.location_id
            WHERE ar.status_id = %s
            AND ar.date_of_attendance BETWEEN %s AND %s
        """ + filter_sql + """
            GROUP BY DATE(date_of_attendance)
            ORDER BY trend_date
        """, tuple(params))

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


# Download Report endpoints (reused helpers from attendance_location)

@router.get("/ranking/report")
def ranking_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Performance Ranking Distribution."""

    data = performance_ranking(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )

    stats = (data or {}).get("stats", {})
    chart = (data or {}).get("chart", [])
    employees = (data or {}).get("employees", [])

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Summary",
        f"Average Score: {stats.get('averageScore', 0)}%",
        f"Excellence Rate: {stats.get('excellenceRate', 0)}%",
        f"Needs Improvement: {stats.get('needsImprovement', 0)}",
        f"Top Performers: {stats.get('topPerformers', 0)}",
        "",
        "Ranking Distribution",
    ]

    for it in chart:
        lines.append(f"- {it.get('name')}: {it.get('value')}%")

    lines.extend(["", "Employee Performance Breakdown (first 50)"])
    for r in employees[:50]:
        lines.append(
            f"- {r.get('name')} | {r.get('department')} | {r.get('percentage')}% | {r.get('rating')}"
        )

    buf = _pdf_make(
        title="Performance Ranking Distribution",
        subtitle="PerformEdge — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("performance_ranking_report.pdf", buf)


@router.get("/training/report")
def training_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Training Needs Distribution."""

    data = training_needs(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )

    stats = (data or {}).get("stats", {})
    bars = (data or {}).get("bars", [])
    rows = (data or {}).get("table", [])

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Summary",
        f"Total Employees: {stats.get('totalEmployees', 0)}",
        f"Employees Need Training: {stats.get('employeesNeedTraining', 0)}",
        f"Top Training Category: {stats.get('topTrainingCategory', '-')}",
        f"Average Training Completion: {stats.get('avgTrainingCompletion', 0)}%",
        "",
        "Training Category Distribution",
    ]

    for b in bars:
        lines.append(f"- {b.get('name')}: {b.get('value')}%")

    lines.extend(["", "Employee Breakdown (first 50)"])
    for r in rows[:50]:
        lines.append(
            f"- {r.get('name')} | {r.get('department')} | Tech {r.get('technical', 0)}% | Soft {r.get('softSkills', 0)}% | Leadership {r.get('leadership', 0)}% | Compliance {r.get('compliance', 0)}% | Total {r.get('total', 0)}%"
        )

    buf = _pdf_make(
        title="Training Needs Distribution",
        subtitle="PerformEdge — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("training_needs_report.pdf", buf)


@router.get("/appraisals/report")
def appraisals_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Appraisals Completion Status."""

    data = appraisals_completion(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )

    stats = (data or {}).get("stats", {})
    chart = (data or {}).get("chart", [])
    rows = (data or {}).get("rows", [])

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Summary",
        f"Total Employees: {stats.get('totalEmployees', 0)}",
        f"Appraisals Completed: {stats.get('appraisalsCompleted', 0)}",
        f"Pending Appraisals: {stats.get('pendingAppraisals', 0)}",
        f"Completion Rate: {stats.get('completionRate', 0)}%",
        "",
        "Completion Distribution",
    ]

    for it in chart:
        lines.append(f"- {it.get('name')}: {it.get('value')}%")

    lines.extend(["", "Employee Appraisal Status (first 50)"])
    for r in rows[:50]:
        score = r.get("score")
        score_txt = str(score) if score is not None else "-"
        lines.append(
            f"- {r.get('name')} | {r.get('department')} | {r.get('status')} | Score {score_txt} | {r.get('completionPct')}%"
        )

    buf = _pdf_make(
        title="Appraisals Completion Status",
        subtitle="PerformEdge — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("appraisals_completion_report.pdf", buf)


@router.get("/overview/report")
def overview_report(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for the Performance Overview page."""

    # Build the overview report by reusing the same data sources as the UI.
    ranking = performance_ranking(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )
    training = training_needs(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )
    appraisals = appraisal_completion_status(
        date_range=date_range,
        department=department,
        location=location,
        company_id=company_id,
        authorization=authorization,
    )

    ranking_chart = (ranking or {}).get("chart", [])
    training_bars = (training or {}).get("bars", [])
    appraisals_chart = (appraisals or {}).get("chart", [])

    ranking_stats = (ranking or {}).get("stats", {})
    training_stats = (training or {}).get("stats", {})
    appraisals_stats = (appraisals or {}).get("stats", {})

    filters = {
        "Date Range": date_range or "All",
        "Department": department or "All",
        "Location": location or "All",
    }

    lines: List[str] = [
        "Performance Overview",
        "",
        "Ranking Distribution",
    ]
    for it in ranking_chart:
        lines.append(f"- {it.get('name')}: {it.get('value')}%")

    lines.extend(["", "Training Needs Distribution"])
    for b in training_bars:
        lines.append(f"- {b.get('name')}: {b.get('value')}%")

    lines.extend(["", "Appraisals Completion"])
    for it in appraisals_chart:
        lines.append(f"- {it.get('name')}: {it.get('value')}%")

    lines.extend(
        [
            "",
            "Key Stats",
            f"Average Score: {ranking_stats.get('averageScore', 0)}%",
            f"Excellence Rate: {ranking_stats.get('excellenceRate', 0)}%",
            f"Needs Improvement: {ranking_stats.get('needsImprovement', 0)}",
            f"Top Performers: {ranking_stats.get('topPerformers', 0)}",
            "",
            f"Total Employees: {training_stats.get('totalEmployees', 0)}",
            f"Employees Need Training: {training_stats.get('employeesNeedTraining', 0)}",
            f"Top Training Category: {training_stats.get('topTrainingCategory', '-')}",
            f"Avg Training Completion: {training_stats.get('avgTrainingCompletion', 0)}%",
            "",
            f"Appraisals Completed: {appraisals_stats.get('completed', 0)}",
            f"Pending Appraisals: {appraisals_stats.get('pending', 0)}",
            f"Appraisal Completion Rate: {appraisals_stats.get('completionRate', 0)}%",
        ]
    )

    buf = _pdf_make(
        title="Performance Overview",
        subtitle="PerformEdge — Download Report",
        filters=filters,
        lines=lines,
    )
    return _pdf_response("performance_overview_report.pdf", buf)



# Latecomers PDF report (Department Wise / 7-day trend)
@router.get("/report")
def latecomers_report(
    start: Optional[date] = None,
    end: Optional[date] = None,
    department: str = "",
    location: str = "",
    company_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Download a PDF report for Late Arrival Percentage (Department Wise)."""
    try:
        # default to last 7 days if not provided
        if end is None:
            end = date.today()
        if start is None:
            start = end - timedelta(days=6)

        # reuse existing endpoints/data functions (pass through filters)
        # pass dateRange=None explicitly to avoid FastAPI Query default objects when calling directly
        summary = late_summary(start=start, end=end, dateRange=None, department=department, location=location)
        dept = late_by_department(start=start, end=end, dateRange=None, department=department, location=location)
        trend = seven_day_trend(start=start, end=end, dateRange=None, department=department, location=location)

        filters = {
            "Start Date": str(start),
            "End Date": str(end),
            "Department": department or "All",
            "Location": location or "All",
        }

        lines: List[str] = []
        lines.append("Latecomers Summary")
        lines.append(f"Total Late: {summary.get('total_late', 0)}")
        lines.append(f"Avg Minutes Late: {summary.get('avg_minutes', 0)}")
        lines.append("")
        lines.append("7-Day Trend")
        for t in trend:
            lines.append(f"- {t.get('day')}: {t.get('value')} late arrivals")

        lines.append("")
        lines.append("Department Late %")
        for d in dept:
            lines.append(f"- {d.get('department_name')}: {d.get('rate')}% ({d.get('late_count')} / {d.get('total_staff')})")

        lines.append("")
        lines.append("Detailed Department Breakdown (first 50)")
        for r in dept[:50]:
            lines.append(f"- {r.get('department_name')} | Total {r.get('total_staff')} | Late {r.get('late_count')} | {r.get('rate')}% | Avg {r.get('avg_minutes')} min")

        buf = _pdf_make(
            title="Late Arrival Percentage (Department Wise)",
            subtitle="Attendance — Download Report",
            filters=filters,
            lines=lines,
        )

        return _pdf_response("late_arrival_department_report.pdf", buf)
    except Exception as e:
        # return readable error for debugging in dev
        raise HTTPException(status_code=500, detail=f"Latecomers report error: {str(e)}")
