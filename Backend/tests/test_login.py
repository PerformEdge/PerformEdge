import pytest
from fastapi import HTTPException

import login
from tests.helpers import make_connection


def test_login_returns_token_and_user_payload(monkeypatch):
    conn, cursor = make_connection(
        fetchone_results=[
            {'user_id': 1, 'company_id': 'C001', 'email': 'user@example.com', 'password': 'secret', 'status': 'ACTIVE', 'user_name': 'tester'},
            {'employee_id': 'E001', 'employee_code': 'EMP-0001', 'full_name': 'Test User', 'department_name': 'Engineering', 'location_name': 'Head Office'},
        ],
        fetchall_results=[[{'role_name': 'MANAGER'}]],
    )
    monkeypatch.setattr(login, 'get_database_connection', lambda: conn)
    monkeypatch.setattr(login, 'create_access_token', lambda payload: 'jwt-token')

    body = login.LoginRequest(email='user@example.com', password='secret', login_as='manager')
    result = login.login(body)

    assert result['access_token'] == 'jwt-token'
    assert result['role'] == 'manager'
    assert result['user']['employee_id'] == 'E001'
    assert conn.committed is True
    assert cursor.closed is True


def test_login_rejects_invalid_password(monkeypatch):
    conn, _ = make_connection(fetchone_results=[{'user_id': 1, 'company_id': 'C001', 'email': 'user@example.com', 'password': 'secret', 'status': 'ACTIVE', 'user_name': 'tester'}])
    monkeypatch.setattr(login, 'get_database_connection', lambda: conn)
    with pytest.raises(HTTPException):
        login.login(login.LoginRequest(email='user@example.com', password='wrong'))


def test_login_rejects_inactive_user(monkeypatch):
    conn, _ = make_connection(fetchone_results=[{'user_id': 1, 'company_id': 'C001', 'email': 'user@example.com', 'password': 'secret', 'status': 'INACTIVE', 'user_name': 'tester'}])
    monkeypatch.setattr(login, 'get_database_connection', lambda: conn)
    with pytest.raises(HTTPException):
        login.login(login.LoginRequest(email='user@example.com', password='secret'))


def test_login_rejects_wrong_selected_login_mode(monkeypatch):
    conn, _ = make_connection(
        fetchone_results=[
            {'user_id': 1, 'company_id': 'C001', 'email': 'user@example.com', 'password': 'secret', 'status': 'ACTIVE', 'user_name': 'tester'},
        ],
        fetchall_results=[[{'role_name': 'EMPLOYEE'}]],
    )
    monkeypatch.setattr(login, 'get_database_connection', lambda: conn)
    with pytest.raises(HTTPException):
        login.login(login.LoginRequest(email='user@example.com', password='secret', login_as='manager'))
