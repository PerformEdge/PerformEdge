"""Shared date parsing utilities.

Why this exists:
- The frontend uses multiple date range formats ("YYYY-MM-DD to YYYY-MM-DD",
  "YYYY-MM-DD – YYYY-MM-DD", etc.).
- Some pages pass start/end as ISO strings, while others pass a combined
  `dateRange` string.

To avoid "Failed to fetch" caused by fragile parsing, we accept any string that
contains ISO dates and extract them with a regex.
"""

import re
from datetime import date, datetime, timedelta
from typing import Optional, Tuple, List

from fastapi import HTTPException


_ISO_DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


def parse_date(date_str: str) -> date:
    """Parse a date from any string that contains an ISO date (YYYY-MM-DD)."""

    if not date_str:
        raise HTTPException(status_code=400, detail="Invalid date format: empty date")

    match = _ISO_DATE_RE.search(str(date_str))
    if not match:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format: {date_str}. Use YYYY-MM-DD",
        )

    iso = match.group(0)
    try:
        return datetime.strptime(iso, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}. Use YYYY-MM-DD")


def resolve_date_range(
    date_range: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    default_days: int = 5
) -> Tuple[date, date]:
    """
    Resolve date range from either dateRange string or start/end strings.
    
    Supports ANY dateRange format that contains 2 ISO dates, e.g.
    - "YYYY-MM-DD to YYYY-MM-DD"
    - "YYYY-MM-DD - YYYY-MM-DD"
    - "YYYY-MM-DD – YYYY-MM-DD" (en dash)
    - "YYYY-MM-DD..YYYY-MM-DD"
    
    If nothing provided, defaults to last `default_days` days ending today.
    """
    start_date = None
    end_date = None
    
    # Prefer dateRange if supplied
    if date_range:
        matches = _ISO_DATE_RE.findall(str(date_range))
        if len(matches) < 2:
            raise HTTPException(
                status_code=400,
                detail="Invalid dateRange format. Provide 2 dates like 'YYYY-MM-DD to YYYY-MM-DD'.",
            )

        start_date = parse_date(matches[0])
        end_date = parse_date(matches[1])
    else:
        # Try start/end parameters
        if start:
            try:
                start_date = parse_date(start)
            except HTTPException:
                raise
        
        if end:
            try:
                end_date = parse_date(end)
            except HTTPException:
                raise
    
    # If nothing provided or incomplete, use defaults
    if not start_date or not end_date:
        today = date.today()
        end_date = end_date or today
        start_date = start_date or (today - timedelta(days=default_days - 1))
    
    # Validate date range
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")
    
    return start_date, end_date


def active_during_range_sql(
    *,
    alias: str,
    start_date: date,
    end_date: date,
    join_col: str = "join_date",
    retired_col: str = "retired_date",
) -> Tuple[str, List[str]]:
    """Build SQL clause/params for employees active at any time in [start_date, end_date]."""

    clause = (
        f" AND {alias}.{join_col} <= %s "
        f" AND ({alias}.{retired_col} IS NULL OR {alias}.{retired_col} >= %s) "
    )
    params = [end_date.isoformat(), start_date.isoformat()]
    return clause, params
