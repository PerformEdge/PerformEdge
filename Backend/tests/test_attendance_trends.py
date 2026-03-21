import io

import attendance_trends
from tests.helpers import make_connection


def test_absentee_last_5_days_normalizes_rows(monkeypatch):
    conn, _ = make_connection(fetchall_results=[[{'date_of_attendance': '2025-01-01', 'day': 'Monday', 'absent': 2}]])
    monkeypatch.setattr(attendance_trends, 'get_database_connection', lambda: conn)
    rows = attendance_trends.absentee_last_5_days(start='2025-01-01', end='2025-01-05', dateRange=None)
    assert rows[0]['day'] == 'Mon'
    assert rows[0]['absent'] == 2


def test_daily_absentee_by_dept_and_get_departments(monkeypatch):
    conn, _ = make_connection(fetchall_results=[
        [{'dept': 'Engineering', 'day': 'Monday', 'absent': 2}],
        [{'department_name': 'Engineering'}],
    ])
    monkeypatch.setattr(attendance_trends, 'get_database_connection', lambda: conn)
    result = attendance_trends.daily_absentee_by_dept(start='2025-01-01', end='2025-01-05', dateRange=None, department=None, location=None)
    assert result['labels'] == ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    assert result['datasets'][0]['label'] == 'Engineering'
    assert attendance_trends.get_departments() == ['Engineering']


def test_report_endpoint_returns_pdf(monkeypatch):
    monkeypatch.setattr(attendance_trends, 'absentee_last_5_days', lambda *args, **kwargs: [{'date': '2025-01-01', 'day': 'Mon', 'absent': 2}])
    monkeypatch.setattr(attendance_trends, 'avg_absentee_by_dept', lambda *args, **kwargs: [{'dept': 'Engineering', 'rate': 10, 'total_employees': 20}])
    monkeypatch.setattr(attendance_trends, 'daily_absentee_by_dept', lambda *args, **kwargs: {'labels': ['Mon'], 'datasets': [{'label': 'Engineering', 'data': [2]}]})
    monkeypatch.setattr(attendance_trends, 'department_breakdown', lambda *args, **kwargs: [{'dept': 'Engineering', 'staff': 20, 'mon': 2, 'tue': 0, 'wed': 0, 'thu': 0, 'fri': 0, 'avg': 0.4}])
    monkeypatch.setattr(attendance_trends, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    response = attendance_trends.attendance_trends_report(start='2025-01-01', end='2025-01-05', dateRange=None, department=None, location=None)
    assert response.media_type == 'application/pdf'
