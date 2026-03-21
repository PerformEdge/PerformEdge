from datetime import date
import io

import latecomers
from tests.helpers import make_connection


def test_late_summary_handles_empty_rows(monkeypatch):
    conn, _ = make_connection(fetchone_results=[None])
    monkeypatch.setattr(latecomers, 'get_database_connection', lambda: conn)
    result = latecomers.late_summary(start='2025-01-01', end='2025-01-05', dateRange=None, department=None, location=None)
    assert result == {'total_late': 0, 'avg_minutes': 0}


def test_latecomers_report_and_delegate_reports_return_pdf(monkeypatch):
    monkeypatch.setattr(latecomers, 'late_summary', lambda *args, **kwargs: {'total_late': 3, 'avg_minutes': 10})
    monkeypatch.setattr(latecomers, 'late_by_department', lambda *args, **kwargs: [{'department_name': 'Engineering', 'late_count': 2, 'rate': 10, 'avg_minutes': 5}])
    monkeypatch.setattr(latecomers, 'seven_day_trend', lambda *args, **kwargs: [{'day': 'Mon', 'value': 1}])
    monkeypatch.setattr(latecomers, 'performance_ranking', lambda **kwargs: {'stats': {}, 'chart': [], 'employees': []})
    monkeypatch.setattr(latecomers, 'training_needs', lambda **kwargs: {'stats': {}, 'bars': [], 'table': []})
    monkeypatch.setattr(latecomers, 'appraisals_completion', lambda **kwargs: {'stats': {}, 'chart': [], 'rows': []})
    monkeypatch.setattr(latecomers, 'appraisal_completion_status', lambda **kwargs: {'stats': {}, 'chart': [], 'rows': []})
    monkeypatch.setattr(latecomers, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    assert latecomers.latecomers_report(start=date(2025, 1, 1), end=date(2025, 1, 5), department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert latecomers.ranking_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert latecomers.training_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert latecomers.appraisals_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert latecomers.overview_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
