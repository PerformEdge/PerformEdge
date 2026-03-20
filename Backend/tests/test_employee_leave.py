from datetime import date
import pytest
from fastapi import HTTPException

import employee_leave
from tests.helpers import make_connection


def test_my_leave_summary_reuses_overview(monkeypatch):
    monkeypatch.setattr(employee_leave, '_require_payload', lambda authorization: {'role': 'employee'})
    monkeypatch.setattr(employee_leave, '_require_employee', lambda payload: None)
    monkeypatch.setattr(employee_leave, 'employee_dashboard_overview', lambda authorization: {'leave': {'remaining': 8}})
    assert employee_leave.my_leave_summary('Bearer token') == {'remaining': 8}


def test_my_leave_records_formats_rows(monkeypatch):
    conn, _ = make_connection(fetchall_results=[[{'leave_record_id': 'LR1', 'leave_type': 'Annual', 'start_date': date(2025, 1, 1), 'end_date': date(2025, 1, 3), 'leave_status': 'APPROVED', 'reason': 'Trip'}]])
    monkeypatch.setattr(employee_leave, '_require_payload', lambda authorization: {'role': 'employee'})
    monkeypatch.setattr(employee_leave, '_require_employee', lambda payload: None)
    monkeypatch.setattr(employee_leave, '_get_employee_id', lambda payload: 'E001')
    monkeypatch.setattr(employee_leave, 'get_database_connection', lambda: conn)
    assert employee_leave.my_leave_records('Bearer token')['records'][0]['days'] == 3


def test_request_leave_validates_dates_and_inserts(monkeypatch):
    monkeypatch.setattr(employee_leave, '_require_payload', lambda authorization: {'role': 'employee'})
    monkeypatch.setattr(employee_leave, '_require_employee', lambda payload: None)
    monkeypatch.setattr(employee_leave, '_get_employee_id', lambda payload: 'E001')
    conn, _ = make_connection()
    monkeypatch.setattr(employee_leave, 'get_database_connection', lambda: conn)
    monkeypatch.setattr(employee_leave.random, 'randint', lambda a, b: 123)
    result = employee_leave.request_leave(employee_leave.LeaveRequestCreate(leave_type='Annual', start_date=date(2025,1,1), end_date=date(2025,1,3)), 'Bearer token')
    assert result['ok'] is True

    with pytest.raises(HTTPException):
        employee_leave.request_leave(employee_leave.LeaveRequestCreate(leave_type='Annual', start_date=date(2025,1,3), end_date=date(2025,1,1)), 'Bearer token')
