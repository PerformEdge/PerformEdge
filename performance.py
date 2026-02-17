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
