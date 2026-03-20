from datetime import date, datetime

import employee_performance
from tests.helpers import make_connection


def test_my_performance_summary_returns_latest_history_and_criteria(monkeypatch):
    conn, _ = make_connection(
        fetchall_results=[
            [{'review_id': 'R1', 'cycle_id': 'C1', 'cycle_name': 'Q1', 'end_date': date(2025,1,31), 'review_date': datetime(2025,1,10), 'overall_score': 88, 'review_comments': 'Great'}],
            [{'criteria_name': 'Quality', 'score': 90, 'max_score': 100}],
        ]
    )
    monkeypatch.setattr(employee_performance, '_require_payload', lambda authorization: {'role': 'employee', 'company_id': 'C001'})
    monkeypatch.setattr(employee_performance, '_require_employee', lambda payload: None)
    monkeypatch.setattr(employee_performance, '_get_employee_id', lambda payload: 'E001')
    monkeypatch.setattr(employee_performance, '_rating_for_score', lambda company_id, score: 'Excellent')
    monkeypatch.setattr(employee_performance, 'get_database_connection', lambda: conn)
    result = employee_performance.my_performance_summary('Bearer token')
    assert result['latest']['rating'] == 'Excellent'
    assert result['criteria'][0]['criteria'] == 'Quality'


def test_my_performance_report_returns_pdf(monkeypatch):
    monkeypatch.setattr(employee_performance, '_require_payload', lambda authorization: {'role': 'employee'})
    monkeypatch.setattr(employee_performance, '_require_employee', lambda payload: None)
    monkeypatch.setattr(employee_performance, 'my_performance_summary', lambda authorization: {'latest': {}, 'history': [], 'criteria': []})
    response = employee_performance.my_performance_report('Bearer token')
    assert response.media_type == 'application/pdf'
    assert 'my_performance_report.pdf' in response.headers['Content-Disposition']
