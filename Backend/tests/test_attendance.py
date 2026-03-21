from datetime import date

import attendance
from tests.helpers import make_connection


def test_pdf_helpers_generate_pdf_response():
    buf = attendance._pdf_make(title='Attendance')
    response = attendance._pdf_response('attendance.pdf', buf)
    assert response.media_type == 'application/pdf'


def test_attendance_latest_date_falls_back_to_today(monkeypatch):
    conn, _ = make_connection(fetchone_results=[{'latest_date': None}])
    monkeypatch.setattr(attendance, 'get_database_connection', lambda: conn)
    result = attendance.attendance_latest_date(default_days=3)
    assert set(result.keys()) == {'start', 'end', 'latest'}


def test_attendance_summary_returns_expected_sections(monkeypatch):
    conn, _ = make_connection(
        fetchone_results=[{'present': 10, 'late': 2, 'on_leave': 1}],
        fetchall_results=[
            [{'department_name': 'Engineering', 'late_count': 2}],
            [{'department_name': 'HR', 'no_pay_count': 1}],
            [{'day': date(2025,1,1), 'absent_count': 1}],
            [{'location_name': 'Head Office', 'present': 9, 'absent': 1}],
        ],
    )
    monkeypatch.setattr(attendance, 'get_database_connection', lambda: conn)
    monkeypatch.setattr(attendance, 'resolve_date_range', lambda **kwargs: (date(2025,1,1), date(2025,1,5)))
    result = attendance.attendance_summary()
    assert set(result.keys()) == {'kpis', 'late', 'no_pay', 'absentee', 'locations'}


def test_attendance_report_returns_pdf(monkeypatch):
    monkeypatch.setattr(attendance, 'attendance_summary', lambda **kwargs: {'kpis': {'present': 10, 'late': 2, 'on_leave': 1, 'overtime': 0}, 'late': [], 'no_pay': [], 'absentee': [], 'locations': []})
    monkeypatch.setattr(attendance, 'resolve_date_range', lambda **kwargs: (date(2025,1,1), date(2025,1,5)))
    response = attendance.attendance_report()
    assert response.media_type == 'application/pdf'
