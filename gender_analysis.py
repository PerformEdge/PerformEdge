from typing import Optional, List, Dict
from fastapi import APIRouter, Query, Header, HTTPException
from fastapi.responses import StreamingResponse
from database import get_database_connection
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from io import BytesIO
from datetime import datetime
from security import verify_token
from fastapi.responses import StreamingResponse
import io
import re
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

router = APIRouter(prefix="/eim", tags=["Gender Analysis"])

# ============================================================
#  COMPANY RESOLUTION
# ============================================================


