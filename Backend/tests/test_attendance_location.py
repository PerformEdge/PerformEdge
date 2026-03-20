import io
import pytest
from fastapi import HTTPException

import attendance_location


def test_get_kpis_rejects_bad_date_format():
    with pytest.raises(HTTPException):
        attendance_location.get_kpis(start='bad', end='2025-01-01')


def test_trend_and_summary_reports_return_pdf(monkeypatch):
    monkeypatch.setattr(attendance_location, 'get_location_attendance', lambda *args, **kwargs: [{'attendance_date': '2025-01-01', 'present': 10, 'absent': 1, 'location': 'Head Office'}])
    monkeypatch.setattr(attendance_location, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    monkeypatch.setattr(attendance_location, 'location_summary_stats', lambda *args, **kwargs: {'totalLocations': 1, 'totalEmployees': 10, 'totalPresent': 9, 'totalAbsent': 1})
    monkeypatch.setattr(attendance_location, 'location_summary', lambda *args, **kwargs: [{'name': 'Head Office', 'present': 9, 'absent': 1}])
    assert attendance_location.location_summary_report(date_range='2025-01-01 to 2025-01-05', location='').media_type == 'application/pdf'
    assert attendance_location.location_branchwise_report(date_range='2025-01-01 to 2025-01-05', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert attendance_location.location_trend_report(date_range='2025-01-01 to 2025-01-05', location='', company_id=None, authorization=None).media_type == 'application/pdf'


def test_performance_delegate_reports_return_pdf(monkeypatch):
    monkeypatch.setattr(attendance_location, 'performance_ranking', lambda **kwargs: {'stats': {}, 'chart': [], 'employees': []})
    monkeypatch.setattr(attendance_location, 'training_needs', lambda **kwargs: {'stats': {}, 'bars': [], 'table': []})
    monkeypatch.setattr(attendance_location, 'appraisals_completion', lambda **kwargs: {'stats': {}, 'chart': [], 'rows': []})
    monkeypatch.setattr(attendance_location, 'appraisal_completion_status', lambda **kwargs: {'stats': {}, 'chart': [], 'rows': []})
    monkeypatch.setattr(attendance_location, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    assert attendance_location.ranking_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert attendance_location.training_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert attendance_location.appraisals_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert attendance_location.overview_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
