from datetime import datetime
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import Response

from database import get_database_connection
from employee_common import _get_employee_id, _rating_for_score, _require_employee, _require_payload

router = APIRouter(prefix="/employee", tags=["Employee Performance"])


@router.get("/performance/summary")
def my_performance_summary(authorization: Optional[str] = Header(default=None)):
    payload = _require_payload(authorization)
    _require_employee(payload)

    company_id = payload.get("company_id") or "C001"
    employee_id = _get_employee_id(payload)

    conn = get_database_connection()
    cur = conn.cursor(dictionary=True)

    cur.execute(
        """
        SELECT
            pr.review_id,
            pr.cycle_id,
            pc.name AS cycle_name,
            pc.end_date,
            pr.created_at AS review_date,
            pr.overall_score,
            pr.comments AS review_comments
        FROM performance_reviews pr
        JOIN performance_cycle pc ON pc.cycle_id = pr.cycle_id
        WHERE pr.employee_id=%s
        ORDER BY pc.end_date DESC, pr.created_at DESC
        LIMIT 12
        """,
        (employee_id,),
    )
    perf_rows = cur.fetchall() or []

    latest = perf_rows[0] if perf_rows else None

    latest_score = float(latest["overall_score"]) if latest and latest.get("overall_score") is not None else None
    latest_rating = _rating_for_score(company_id, latest_score)

    history = []
    for r in perf_rows:
        s = float(r["overall_score"]) if r.get("overall_score") is not None else None
        history.append(
            {
                "review_id": r.get("review_id"),
                "cycle_id": r.get("cycle_id"),
                "cycle_name": r.get("cycle_name"),
                "end_date": r.get("end_date").isoformat() if r.get("end_date") else None,
                "review_date": r.get("review_date").isoformat() if r.get("review_date") else None,
                "score": s,
                "rating": _rating_for_score(company_id, s),
                "comments": r.get("review_comments"),
            }
        )

    criteria = []
    if latest and latest.get("review_id"):
        cur.execute(
            """
            SELECT c.criteria_name, s.score, c.weight AS max_score
            FROM performance_scores s
            JOIN performance_criteria c ON c.criteria_id = s.criteria_id
            WHERE s.review_id=%s
            ORDER BY c.criteria_name
            """,
            (latest["review_id"],),
        )
        criteria = [
            {
                "criteria": row.get("criteria_name"),
                "score": float(row.get("score") or 0),
                "max_score": float(row.get("max_score") or 0),
            }
            for row in (cur.fetchall() or [])
        ]

    conn.close()

    return {
        "latest": {
            "score": latest_score,
            "rating": latest_rating,
            "cycle_name": latest.get("cycle_name") if latest else None,
            "review_date": latest.get("review_date").isoformat() if latest and latest.get("review_date") else None,
            "comments": latest.get("review_comments") if latest else None,
        },
        "history": history,
        "criteria": criteria,
    }


@router.get("/performance/report")
def my_performance_report(authorization: Optional[str] = Header(default=None)):
    """Download a simple PDF performance report for the logged-in employee."""

    payload = _require_payload(authorization)
    _require_employee(payload)

    summary = my_performance_summary(authorization)

    # Lazy import (keeps backend usable even if reportlab isn't installed yet)
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from reportlab.pdfgen import canvas
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="PDF dependency missing. Please run: pip install -r requirements.txt",
        )

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    y = height - 0.8 * inch

    c.setFont("Helvetica-Bold", 18)
    c.drawString(0.9 * inch, y, "My Performance Report")

    y -= 0.35 * inch
    c.setFont("Helvetica", 11)
    c.drawString(0.9 * inch, y, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")

    y -= 0.5 * inch
    latest = summary.get("latest", {})
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.9 * inch, y, "Latest Review")

    y -= 0.25 * inch
    c.setFont("Helvetica", 11)
    c.drawString(0.9 * inch, y, f"Cycle: {latest.get('cycle_name') or '-'}")
    y -= 0.2 * inch
    c.drawString(0.9 * inch, y, f"Score: {latest.get('score') if latest.get('score') is not None else '-'}")
    y -= 0.2 * inch
    c.drawString(0.9 * inch, y, f"Rating: {latest.get('rating') or '-'}")

    # Trend table
    y -= 0.45 * inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.9 * inch, y, "Performance Trend")

    y -= 0.25 * inch
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.9 * inch, y, "Cycle")
    c.drawString(3.6 * inch, y, "Score")
    c.drawString(4.4 * inch, y, "Rating")
_get_employee_id
    c.setFont("Helvetica", 10)
    for row in (summary.get("history") or [])[:8]:
        y -= 0.2 * inch
        if y < 1.0 * inch:
            c.showPage()
            y = height - 0.8 * inch
        c.drawString(0.9 * inch, y, str(row.get("cycle_name") or "-"))
        c.drawString(3.6 * inch, y, str(row.get("score") if row.get("score") is not None else "-"))
        c.drawString(4.4 * inch, y, str(row.get("rating") or "-"))

    c.showPage()
    c.save()

    pdf = buffer.getvalue()
    buffer.close()

    headers = {"Content-Disposition": 'attachment; filename="my_performance_report.pdf"'}

    return Response(content=pdf, media_type="application/pdf", headers=headers)
