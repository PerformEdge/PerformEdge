from fastapi import APIRouter, HTTPException, Query, Header
from fastapi.responses import StreamingResponse
from database import get_database_connection
import re
from datetime import datetime, timedelta
from typing import Optional, List
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch

router = APIRouter(prefix="/attendance-location", tags=["Attendance Location"])

# --- Get KPI summary ---
@router.get("/kpis")
def get_kpis(
    dateRange: Optional[str] = Query("", alias="dateRange"),
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
        ):
    