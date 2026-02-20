from __future__ import annotations

import re
from datetime import date, datetime
import io
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse

# Report generation (PDF)
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
except Exception:  
    letter = None
    canvas = None

from database import get_db_connection
from security import verify_token


router = APIRouter(prefix="/performance", tags=["Performance"])

# PDF helpers (Download Report)

def _pdf_make(
    *,
    title: str,
    subtitle: str = "",
    filters: Optional[Dict[str, str]] = None,
    lines: Optional[List[str]] = None,
) -> io.BytesIO:
    """Create a simple PDF (in-memory) and return a BytesIO buffer."""

    if canvas is None or letter is None:
        raise HTTPException(
            status_code=500,
            detail="PDF generation requires the 'reportlab' package. Install backend dependencies (pip install -r requirements.txt).",
        )

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    x = 48
    y = height - 56

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x, y, title)
    y -= 22

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

    # Content lines
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
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": "no-store",
    }
    return StreamingResponse(buf, media_type="application/pdf", headers=headers)

# DB helpers

def _fetch_all(sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _fetch_one(sql: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
    rows = _fetch_all(sql, params)
    return rows[0] if rows else None

# Auth / filters

def _company_id_from_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        payload = verify_token(parts[1])
        return payload.get("company_id")
    return None


def _resolve_company_id(
    company_id_query: Optional[str], authorization: Optional[str]
) -> str:
    if company_id_query:
        return company_id_query

    cid = _company_id_from_token(authorization)
    if cid:
        return cid

    return "C001"


def _resolve_department_id(company_id: str, department: str) -> Optional[str]:
    if not department:
        return None

    row = _fetch_one(
        """
        SELECT department_id
        FROM departments
        WHERE company_id=%s
          AND (department_id=%s OR department_name=%s)
        LIMIT 1
        """,
        (company_id, department, department),
    )
    return row["department_id"] if row else None


def _resolve_location_id(company_id: str, location: str) -> Optional[str]:
    """Resolve a location string (id or name) into a location_id."""

    if not location:
        return None

    row = _fetch_one(
        """
        SELECT location_id
        FROM locations
        WHERE company_id=%s
          AND (location_id=%s OR location_name=%s)
        LIMIT 1
        """,
        (company_id, location, location),
    )
    return row["location_id"] if row else None

# Cycle / rating helpers

def _parse_date_range(date_range: str) -> Optional[Tuple[date, date]]:
    """Accepts strings like:
      - "2025-01-01..2025-12-31"
      - "2025-01-01 to 2025-12-31"
      - "2025-01-01,2025-12-31"
    """
    if not date_range:
        return None
    matches = re.findall(r"\d{4}-\d{2}-\d{2}", date_range)
    if len(matches) >= 2:
        try:
            return (
                datetime.strptime(matches[0], "%Y-%m-%d").date(),
                datetime.strptime(matches[1], "%Y-%m-%d").date(),
            )
        except Exception:
            return None
    return None


def _pick_cycle(company_id: str, date_range: str) -> Optional[Dict[str, Any]]:
    dr = _parse_date_range(date_range)
    today = datetime.utcnow().date()

    # 1) If date range provided, find a cycle overlapping that range.
    if dr:
        start, end = dr
        row = _fetch_one(
            """
            SELECT cycle_id, name, start_date, end_date
            FROM performance_cycle
            WHERE company_id=%s
              AND NOT (end_date < %s OR start_date > %s)
            ORDER BY end_date DESC
            LIMIT 1
            """,
            (company_id, start, end),
        )
        if row:
            return row

    # 2) Current cycle (today between dates)
    row = _fetch_one(
        """
        SELECT cycle_id, name, start_date, end_date
        FROM performance_cycle
        WHERE company_id=%s
          AND start_date <= %s AND end_date >= %s
        ORDER BY end_date DESC
        LIMIT 1
        """,
        (company_id, today, today),
    )
    if row:
        return row

    # 3) Latest cycle by end_date
    return _fetch_one(
        """
        SELECT cycle_id, name, start_date, end_date
        FROM performance_cycle
        WHERE company_id=%s
        ORDER BY end_date DESC
        LIMIT 1
        """,
        (company_id,),
    )


def _get_rating_scale(company_id: str) -> List[Dict[str, Any]]:
    scale = _fetch_all(
        """
        SELECT rating_name, min_score, max_score, color_hex
        FROM performance_rating_scale
        WHERE company_id=%s
        ORDER BY min_score DESC
        """,
        (company_id,),
    )
    if scale:
        return scale

    # If not seeded, provide a sensible default so UI still works.
    return [
        {"rating_name": "Excellent", "min_score": 90, "max_score": 100, "color_hex": "#3C9A5F"},
        {"rating_name": "Very Good", "min_score": 80, "max_score": 89, "color_hex": "#E0A84B"},
        {"rating_name": "Satisfactory", "min_score": 70, "max_score": 79, "color_hex": "#4A7BD8"},
        {"rating_name": "Needs Improvement", "min_score": 60, "max_score": 69, "color_hex": "#7C5CF5"},
        {"rating_name": "Unsatisfactory", "min_score": 0, "max_score": 59, "color_hex": "#EF4444"},
    ]


def _bucket(scale: List[Dict[str, Any]], score: int) -> Dict[str, Any]:
    for r in scale:
        if int(r["min_score"]) <= int(score) <= int(r["max_score"]):
            return r
    return {"rating_name": "Unrated", "color_hex": "#999999"}


# Overview (used by /dashboard/performance)

@router.get("/overview")
def performance_overview(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    cid = _resolve_company_id(company_id, authorization)
    dep_id = _resolve_department_id(cid, department)
    loc_id = _resolve_location_id(cid, location)
    cycle = _pick_cycle(cid, date_range)

    # Ranking distribution

    scale = _get_rating_scale(cid)
    cycle_id = cycle["cycle_id"] if cycle else None

    ranking_chart: List[Dict[str, Any]] = []
    ranking_legend: List[Dict[str, Any]] = []

    if cycle_id:
        sql = """
        SELECT pr.overall_score
        FROM performance_reviews pr
        JOIN employees e ON e.employee_id = pr.employee_id
        WHERE e.company_id=%s
          AND pr.cycle_id=%s
          AND e.employement_status='ACTIVE'
        """
        params: List[Any] = [cid, cycle_id]
        if dep_id:
            sql += " AND e.department_id=%s"
            params.append(dep_id)
        if loc_id:
            sql += " AND e.location_id=%s"
            params.append(loc_id)
        rows = _fetch_all(sql, tuple(params))

        total = len(rows)
        counts: Dict[str, int] = {r["rating_name"]: 0 for r in scale}
        for r in rows:
            b = _bucket(scale, int(r["overall_score"]))
            if b["rating_name"] in counts:
                counts[b["rating_name"]] += 1

        for r in scale:
            pct = round((counts[r["rating_name"]] / total) * 100) if total else 0
            ranking_chart.append({"name": r["rating_name"], "value": pct, "color": r.get("color_hex") or "#999999"})
            ranking_legend.append({"name": r["rating_name"], "value": pct})

    # Training needs
    
    train_sql = """
      SELECT tc.category_name, tc.color_hex, COUNT(*) AS cnt
      FROM training_requests tr
      JOIN training_categories tc ON tc.category_id = tr.category_id
      JOIN employees e ON e.employee_id = tr.employee_id
      WHERE tr.company_id=%s
        AND e.employement_status='ACTIVE'
    """
    train_params: List[Any] = [cid]
    dr = _parse_date_range(date_range)
    if dr:
        start, end = dr
        train_sql += " AND DATE(tr.requested_at) BETWEEN %s AND %s"
        train_params.extend([start, end])
    if dep_id:
        train_sql += " AND e.department_id=%s"
        train_params.append(dep_id)
    if loc_id:
        train_sql += " AND e.location_id=%s"
        train_params.append(loc_id)
    train_sql += " GROUP BY tc.category_name, tc.color_hex ORDER BY cnt DESC"
    trows = _fetch_all(train_sql, tuple(train_params))
    total_req = sum(int(r["cnt"]) for r in trows) if trows else 0
    training_bars = [
        {
            "name": r["category_name"],
            "value": round((int(r["cnt"]) / total_req) * 100) if total_req else 0,
            "color": r.get("color_hex") or "#999999",
        }
        for r in trows
    ]

    # Appraisals completion

    app_sql = """
      SELECT pa.status
      FROM performance_appraisals pa
      JOIN employees e ON e.employee_id = pa.employee_id
      WHERE pa.company_id=%s
        AND e.employement_status='ACTIVE'
    """
    app_params: List[Any] = [cid]
    if cycle_id:
        app_sql += " AND pa.cycle_id=%s"
        app_params.append(cycle_id)
    if dep_id:
        app_sql += " AND e.department_id=%s"
        app_params.append(dep_id)
    if loc_id:
        app_sql += " AND e.location_id=%s"
        app_params.append(loc_id)
    arows = _fetch_all(app_sql, tuple(app_params))
    total_a = len(arows)
    completed = sum(1 for r in arows if (r.get("status") or "").upper() == "COMPLETED")
    pending = total_a - completed
    completed_pct = round((completed / total_a) * 100) if total_a else 0
    pending_pct = round((pending / total_a) * 100) if total_a else 0

    due_text = ""
    if cycle and cycle.get("end_date"):
        due_text = f"Due date: {cycle['end_date']}"

    # Overview stat cards (used by the overview page + PDF report).

    scores = [int(r.get("overall_score") or 0) for r in rows]
    avg_score = round(sum(scores) / len(scores)) if scores else 0

    excellent_names = {"excellent", "outstanding"}
    excellent_bucket = None
    for r in scale:
        if (r.get("rating_name") or "").lower() in excellent_names:
            excellent_bucket = r.get("rating_name")
            break
    if not excellent_bucket and scale:
        excellent_bucket = scale[0].get("rating_name")  

    bucketed = [_bucket(scale, s).get("rating_name") for s in scores]
    excellence_rate = round((bucketed.count(excellent_bucket) / len(bucketed)) * 100) if bucketed else 0

    needs_improvement = sum(
        1
        for s in scores
        if (_bucket(scale, s).get("rating_name") or "").lower()
        in {"needs improvement", "need improvement", "unrated"}
    )
    top_performers = sum(1 for s in scores if s >= 90)

    overview_stats = {
        "averageScore": avg_score,
        "excellenceRate": excellence_rate,
        "needsImprovement": needs_improvement,
        "topPerformers": top_performers,
    }

    return {
        "stats": overview_stats,
        "ranking_chart": ranking_chart,
        "training_bars": training_bars,
        "appraisals_chart": [
            {"name": "Completed", "value": completed_pct, "color": "#3C9A5F"},
            {"name": "Pending", "value": pending_pct, "color": "#E0A84B"},
        ],

        "ranking": {
            "title": "Performance Ranking Distribution",
            "subtitle": "Grouped by appraisal results",
            "chart": ranking_chart,
            "legend": ranking_legend,
        },
        "training": {
            "title": "Training Needs Distribution",
            "subtitle": "Percentage of employees recommended/requested training",
            "bars": training_bars,
            "tip": "Tip: use this to plan monthly training sessions focused on the largest needs.",
        },
        "appraisals": {
            "title": "Appraisal Completion Status",
            "subtitle": "Track completion of performance appraisals",
            "chart": [
                {"name": "Completed", "value": completed_pct, "color": "#3C9A5F"},
                {"name": "Pending", "value": pending_pct, "color": "#E0A84B"},
            ],
            "meta": {
                "completedLabel": f"Completed — {completed_pct}% ({completed})",
                "pendingLabel": f"Pending — {pending_pct}% ({pending})",
                "actionText": "Action: send reminders to pending employees and managers.",
                "dueText": due_text or "Due date: -",
            },
        },
        "_debug": {  
            "company_id": cid,
            "cycle_id": cycle_id,
            "department_id": dep_id,
            "location_id": loc_id,
            "location": location,
        },
    }

    # 1) Ranking Distribution (page)

    @router.get("/ranking")
    def performance_ranking(
        date_range: str = Query("", alias="dateRange"),
        department: str = Query("", alias="department"),
        location: str = Query("", alias="location"),
        company_id: Optional[str] = Query(None, alias="company_id"),
        authorization: Optional[str] = Header(None),
    ):
        cid = _resolve_company_id(company_id, authorization)
        dep_id = _resolve_department_id(cid, department)
        loc_id = _resolve_location_id(cid, location)
        cycle = _pick_cycle(cid, date_range)
        if not cycle:
            return {
                "stats": {"averageScore": 0, "excellenceRate": 0, "needsImprovement": 0, "topPerformers": 0},
                "chart": [],
                "employees": [],
            }

        scale = _get_rating_scale(cid)

        sql = """
        SELECT e.full_name, d.department_name, pr.overall_score
        FROM performance_reviews pr
        JOIN employees e ON e.employee_id = pr.employee_id
        LEFT JOIN departments d ON d.department_id = e.department_id
        WHERE e.company_id=%s
            AND pr.cycle_id=%s
            AND e.employement_status='ACTIVE'
        """
        params: List[Any] = [cid, cycle["cycle_id"]]
        if dep_id:
            sql += " AND e.department_id=%s"
            params.append(dep_id)
        if loc_id:
            sql += " AND e.location_id=%s"
            params.append(loc_id)

        rows = _fetch_all(sql, tuple(params))
        if not rows:
            return {
                "stats": {"averageScore": 0, "excellenceRate": 0, "needsImprovement": 0, "topPerformers": 0},
                "chart": [],
                "employees": [],
            }

        scores = [int(r["overall_score"]) for r in rows]
        avg_score = round(sum(scores) / len(scores)) if scores else 0

        excellent_names = {"excellent", "outstanding"}
        excellent_bucket = None
        for r in scale:
            if (r["rating_name"] or "").lower() in excellent_names:
                excellent_bucket = r["rating_name"]
                break
        if not excellent_bucket and scale:
            excellent_bucket = scale[0]["rating_name"] 

        bucketed = [_bucket(scale, s)["rating_name"] for s in scores]
        excellence_rate = round((bucketed.count(excellent_bucket) / len(bucketed)) * 100) if bucketed else 0

        needs_improvement = sum(
            1
            for s in scores
            if _bucket(scale, s)["rating_name"].lower() in {"needs improvement", "need improvement", "unrated"}
        )
        top_performers = sum(1 for s in scores if s >= 90)

        # Distribution in %
        counts: Dict[str, int] = {r["rating_name"]: 0 for r in scale}
        for s in scores:
            name = _bucket(scale, s)["rating_name"]
            if name in counts:
                counts[name] += 1

        distribution: List[Dict[str, Any]] = []
        total = len(scores)
        for r in scale:
            pct = round((counts[r["rating_name"]] / total) * 100) if total else 0
            distribution.append({"name": r["rating_name"], "value": pct, "color": r.get("color_hex") or "#999999"})

        employees = []
        for r in rows:
            rating = _bucket(scale, int(r["overall_score"]))["rating_name"]
            employees.append(
                {
                    "name": r["full_name"],
                    "department": r.get("department_name") or "-",
                    "percentage": int(r["overall_score"]),
                    "rating": rating,
                }
            )
        employees.sort(key=lambda x: x["percentage"], reverse=True)

        return {
            "stats": {
                "averageScore": avg_score,
                "excellenceRate": excellence_rate,
                "needsImprovement": needs_improvement,
                "topPerformers": top_performers,
            },
            "chart": distribution,
            "employees": employees,
            "_debug": { 
                "company_id": cid,
                "cycle_id": cycle["cycle_id"],
                "department_id": dep_id,
                "location_id": loc_id,
                "location": location,
            },
        }

# 2) Training Needs (page)

@router.get("/training")
def training_needs(
    date_range: str = Query("", alias="dateRange"),
    department: str = Query("", alias="department"),
    location: str = Query("", alias="location"),
    company_id: Optional[str] = Query(None, alias="company_id"),
    authorization: Optional[str] = Header(None),
):
    cid = _resolve_company_id(company_id, authorization)
    dep_id = _resolve_department_id(cid, department)
    loc_id = _resolve_location_id(cid, location)
    dr = _parse_date_range(date_range)

    # total employees
    emp_sql = "SELECT COUNT(*) AS total FROM employees WHERE company_id=%s AND employement_status='ACTIVE'"
    emp_params: List[Any] = [cid]
    if dep_id:
        emp_sql += " AND department_id=%s"
        emp_params.append(dep_id)
    if loc_id:
        emp_sql += " AND location_id=%s"
        emp_params.append(loc_id)
    total_emp = int(_fetch_one(emp_sql, tuple(emp_params))["total"])

    # category counts
    req_sql = """
      SELECT tc.category_name, tc.color_hex, COUNT(*) AS cnt
      FROM training_requests tr
      JOIN training_categories tc ON tc.category_id = tr.category_id
      JOIN employees e ON e.employee_id = tr.employee_id
      WHERE tr.company_id=%s
        AND e.employement_status='ACTIVE'
    """
    req_params: List[Any] = [cid]
    if dr:
        start, end = dr
        req_sql += " AND DATE(tr.requested_at) BETWEEN %s AND %s"
        req_params.extend([start, end])
    if dep_id:
        req_sql += " AND e.department_id=%s"
        req_params.append(dep_id)
    if loc_id:
        req_sql += " AND e.location_id=%s"
        req_params.append(loc_id)
    req_sql += " GROUP BY tc.category_name, tc.color_hex ORDER BY cnt DESC"
    rows = _fetch_all(req_sql, tuple(req_params))

    total_req = sum(int(r["cnt"]) for r in rows) if rows else 0
    bars = [
        {
            "name": r["category_name"],
            "value": round((int(r["cnt"]) / total_req) * 100) if total_req else 0,
            "color": r.get("color_hex") or "#999999",
        }
        for r in rows
    ]

    employees_need_training = 0
    if total_req:
        distinct_sql = """
          SELECT COUNT(DISTINCT tr.employee_id) AS cnt
          FROM training_requests tr
          JOIN employees e ON e.employee_id = tr.employee_id
          WHERE tr.company_id=%s
            AND e.employement_status='ACTIVE'
        """
        dparams: List[Any] = [cid]
        if dr:
            start, end = dr
            distinct_sql += " AND DATE(tr.requested_at) BETWEEN %s AND %s"
            dparams.extend([start, end])
        if dep_id:
            distinct_sql += " AND e.department_id=%s"
            dparams.append(dep_id)
        if loc_id:
            distinct_sql += " AND e.location_id=%s"
            dparams.append(loc_id)
        employees_need_training = int(_fetch_one(distinct_sql, tuple(dparams))["cnt"])

    top_category = rows[0]["category_name"] if rows else None

    approved_sql = """
      SELECT
        SUM(CASE WHEN tr.status='APPROVED' THEN 1 ELSE 0 END) AS approved,
        COUNT(*) AS total
      FROM training_requests tr
      JOIN employees e ON e.employee_id = tr.employee_id
      WHERE tr.company_id=%s
        AND e.employement_status='ACTIVE'
    """
    aparams: List[Any] = [cid]
    if dr:
        start, end = dr
        approved_sql += " AND DATE(tr.requested_at) BETWEEN %s AND %s"
        aparams.extend([start, end])
    if dep_id:
        approved_sql += " AND e.department_id=%s"
        aparams.append(dep_id)
    if loc_id:
        approved_sql += " AND e.location_id=%s"
        aparams.append(loc_id)
    ap = _fetch_one(approved_sql, tuple(aparams))
    avg_completion = 0
    if ap and ap["total"]:
        avg_completion = round((int(ap["approved"]) / int(ap["total"])) * 100)

    table_sql = """
      SELECT
        e.employee_id,
        e.full_name AS name,
        d.department_name AS department,
        tc.category_name AS category,
        COUNT(*) AS cnt
      FROM training_requests tr
      JOIN employees e ON e.employee_id = tr.employee_id
      LEFT JOIN departments d ON d.department_id = e.department_id
      JOIN training_categories tc ON tc.category_id = tr.category_id
      WHERE tr.company_id=%s
        AND e.employement_status='ACTIVE'
    """
    tparams: List[Any] = [cid]
    if dr:
        start, end = dr
        table_sql += " AND DATE(tr.requested_at) BETWEEN %s AND %s"
        tparams.extend([start, end])
    if dep_id:
        table_sql += " AND e.department_id=%s"
        tparams.append(dep_id)
    if loc_id:
        table_sql += " AND e.location_id=%s"
        tparams.append(loc_id)
    table_sql += " GROUP BY e.employee_id, tc.category_id ORDER BY e.full_name ASC"
    trows = _fetch_all(table_sql, tuple(tparams))

    def norm_cat(name: str) -> str:
        n = (name or "").strip().lower()
        if n in {"technical", "tech"}:
            return "technical"
        if n in {"soft skills", "softskills", "soft"}:
            return "softSkills"
        if n in {"leadership"}:
            return "leadership"
        if n in {"compliance"}:
            return "compliance"
        return "other"

    emp_map: Dict[str, Dict[str, Any]] = {}
    for r in trows:
        eid = r["employee_id"]
        if eid not in emp_map:
            emp_map[eid] = {
                "name": r["name"],
                "department": r.get("department") or "-",
                "technical": 0,
                "softSkills": 0,
                "leadership": 0,
                "compliance": 0,
            }
        key = norm_cat(r["category"])
        if key in emp_map[eid]:
            emp_map[eid][key] += int(r["cnt"])

    table: List[Dict[str, Any]] = []
    for emp in emp_map.values():
        total = emp["technical"] + emp["softSkills"] + emp["leadership"] + emp["compliance"]
        if total <= 0:
            continue
        # Convert category request counts into integer percentages that sum to 100.
        cats = ["technical", "softSkills", "leadership", "compliance"]
        raw = [(emp[c] / total) * 100 for c in cats]
        floors = [int(x) for x in raw]
        remainders = [raw[i] - floors[i] for i in range(len(cats))]

        remaining = 100 - sum(floors)
        if remaining > 0:
            for i in sorted(range(len(cats)), key=lambda i: remainders[i], reverse=True)[:remaining]:
                floors[i] += 1

        table.append(
            {
                "name": emp["name"],
                "department": emp["department"],
                "technical": floors[0],
                "softSkills": floors[1],
                "leadership": floors[2],
                "compliance": floors[3],
                "total": 100,
            }
        )

    return {
        "stats": {
            "totalEmployees": total_emp,
            "employeesNeedTraining": employees_need_training,
            "topTrainingCategory": top_category,
            "avgTrainingCompletion": avg_completion,
        },
        "bars": bars,
        "table": table,
        "_debug": {
            "company_id": cid,
            "department_id": dep_id,
            "location_id": loc_id,
            "location": location,
            "dateRange": date_range,
        },
    }
