rom fastapi import APIRouter, Query, HTTPException
from datetime import date, datetime, timedelta
from typing import Optional
import re

from database import get_database_connection
from date_utils import resolve_date_range

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("/summary")
def attendance_summary(
    start: Optional[str] = Query(None),
      end: Optional[str] = Query(None),
        dateRange: Optional[str] = Query(None, alias='dateRange'),
          department: Optional[str] = Query(None),
            location: Optional[str] = Query(None)
            ):