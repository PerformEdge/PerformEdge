from datetime import date

import employee_people
from tests.helpers import make_connection


def test_new_joiners_and_birthdays_transform_rows(monkeypatch):
    conn, _ = make_connection(
        fetchall_results=[
            [{'employee_id': 'E1', 'employee_code': 'EMP-1', 'full_name': 'New Hire', 'join_date': date(2025,1,1), 'department_name': 'HR'}],
            [{'employee_id': 'E2', 'employee_code': 'EMP-2', 'full_name': 'Birthday', 'birth_date': date(1990,1,15), 'department_name': 'HR'}],
        ]
    )
    monkeypatch.setattr(employee_people, '_require_payload', lambda authorization: {'role': 'employee', 'company_id': 'C001'})
    monkeypatch.setattr(employee_people, '_require_employee', lambda payload: None)
    monkeypatch.setattr(employee_people, 'get_database_connection', lambda: conn)

    joiners = employee_people.new_joiners('Bearer token')
    assert joiners['new_joiners'][0]['join_date'] == '2025-01-01'
    birthdays = employee_people.upcoming_birthdays('Bearer token', days=365)
    assert birthdays['birthdays'][0]['full_name'] == 'Birthday'
