import employee_dashboard
from tests.helpers import make_connection


def test_employee_dashboard_overview_returns_sections(monkeypatch):
    conn, _ = make_connection(
        fetchone_results=[
            {'employee_id': 'E001', 'employee_code': 'EMP-001', 'full_name': 'Tester', 'department_name': 'Engineering', 'location_name': 'Head Office'},
        ],
        fetchall_results=[
            [],
            [],
            [{'review_id': 'R1', 'cycle_id': 'C1', 'cycle_name': 'Q1', 'end_date': __import__('datetime').date(2025,1,31), 'review_date': __import__('datetime').datetime(2025,1,10), 'overall_score': 88, 'review_comments': 'Good'}],
            [{'criteria_name': 'Quality', 'score': 90, 'max_score': 100}],
            [{'status': 'APPROVED', 'cnt': 2}],
            [{'employee_id': 'E002', 'full_name': 'New Hire', 'employee_code': 'EMP-002', 'join_date': __import__('datetime').date(2025,1,1), 'department_name': 'HR'}],
            [{'employee_id': 'E003', 'employee_code': 'EMP-003', 'full_name': 'Birthday', 'birth_date': __import__('datetime').date(1990,1,15), 'department_name': 'HR'}],
        ],
    )
    monkeypatch.setattr(employee_dashboard, '_require_payload', lambda authorization: {'company_id': 'C001', 'role': 'employee'})
    monkeypatch.setattr(employee_dashboard, '_require_employee', lambda payload: None)
    monkeypatch.setattr(employee_dashboard, '_get_employee_id', lambda payload: 'E001')
    monkeypatch.setattr(employee_dashboard, '_rating_for_score', lambda company_id, score: 'Excellent')
    monkeypatch.setattr(employee_dashboard, 'get_database_connection', lambda: conn)
    result = employee_dashboard.employee_dashboard_overview('Bearer token')
    assert set(result.keys()) == {'employee', 'leave', 'performance', 'training', 'new_joiners', 'birthdays'}
