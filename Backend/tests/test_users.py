import pytest
from fastapi import HTTPException

import users
from tests.helpers import make_connection


def test_require_payload_validates_authorization(monkeypatch):
    monkeypatch.setattr(users, 'verify_token', lambda token: {'sub': '1', 'role': 'employee'})
    assert users._require_payload('Bearer token')['user_id'] == 1
    with pytest.raises(HTTPException):
        users._require_payload(None)


def test_me_returns_consolidated_profile(monkeypatch):
    conn, _ = make_connection(
        fetchone_results=[
            {'user_id': 1, 'user_name': 'tester', 'email': 't@example.com', 'company_id': 'C001'},
            {'company_name': 'PerformEdge'},
            {'employee_id': 'E001', 'employee_code': 'EMP-001', 'full_name': 'Tester', 'department_name': 'Engineering', 'location_name': 'Head Office'},
        ],
        fetchall_results=[[{'role_name': 'MANAGER'}]],
    )
    monkeypatch.setattr(users, '_require_payload', lambda authorization: {'user_id': 1})
    monkeypatch.setattr(users, 'get_database_connection', lambda: conn)
    result = users.me('Bearer token')
    assert result['company_name'] == 'PerformEdge'
    assert result['role'] == 'manager'
    assert result['employee_id'] == 'E001'
