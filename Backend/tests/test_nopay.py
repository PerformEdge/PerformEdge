import io
from datetime import date

import nopay
from tests.helpers import make_connection


def test_no_pay_summary_and_detail_endpoints(monkeypatch):
    conn, _ = make_connection(
        fetchone_results=[{'total_days': 2, 'employees': 1}, {'total_employees': 10}],
        fetchall_results=[
            [{'department_name': 'Engineering', 'no_pay_days': 2, 'no_pay_percentage': 20}],
            [{'department_name': 'Engineering', 'days': 2}],
            [{'department_name': 'Engineering', 'employee_name': 'John Doe', 'no_pay_days': 2, 'no_pay_hours': 16, 'occurrences': 1}],
        ],
    )
    monkeypatch.setattr(nopay, 'get_database_connection', lambda: conn)
    monkeypatch.setattr(nopay, 'resolve_date_range', lambda **kwargs: (date(2025,1,1), date(2025,1,7)))
    assert nopay.no_pay_summary()['no_pay_percentage'] == 2.9
    assert nopay.no_pay_by_department()
    assert nopay.no_pay_distribution()
    assert nopay.no_pay_details()


def test_no_pay_report_returns_pdf(monkeypatch):
    monkeypatch.setattr(nopay, 'no_pay_summary', lambda **kwargs: {'total_days': 2, 'employees': 1, 'no_pay_percentage': 5.0, 'monthly_trend': 'up'})
    monkeypatch.setattr(nopay, 'no_pay_by_department', lambda **kwargs: [])
    monkeypatch.setattr(nopay, 'no_pay_distribution', lambda **kwargs: [])
    monkeypatch.setattr(nopay, 'no_pay_details', lambda **kwargs: [])
    monkeypatch.setattr(nopay, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    assert nopay.no_pay_report().media_type == 'application/pdf'
