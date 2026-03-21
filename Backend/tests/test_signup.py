import pytest
from fastapi import HTTPException
import mysql.connector

import signup
from tests.helpers import make_connection


def test_signup_validates_required_fields_and_password_length():
    with pytest.raises(HTTPException):
        signup.signup(signup.SignupRequest(company_id=' ', user_name='user', email='a@example.com', password='123456', signup_as='employee'))
    with pytest.raises(HTTPException):
        signup.signup(signup.SignupRequest(company_id='C001', user_name='user', email='a@example.com', password='1234567', signup_as='employee'))


def test_signup_rejects_unknown_company_or_duplicates(monkeypatch):
    conn, _ = make_connection(fetchone_results=[None])
    monkeypatch.setattr(signup, 'get_database_connection', lambda: conn)
    with pytest.raises(HTTPException):
        signup.signup(signup.SignupRequest(company_id='C001', user_name='user', email='a@example.com', password='123456', signup_as='employee'))

    conn2, _ = make_connection(fetchone_results=[{'company_id': 'C001'}, {'user_id': 10}])
    monkeypatch.setattr(signup, 'get_database_connection', lambda: conn2)
    with pytest.raises(HTTPException):
        signup.signup(signup.SignupRequest(company_id='C001', user_name='user', email='a@example.com', password='123456', signup_as='employee'))


def test_signup_creates_user_and_tolerates_optional_bootstrap_failures(monkeypatch):
    conn, cursor = make_connection(
        fetchone_results=[
            {'company_id': 'C001'},
            None,
            None,
            {'role_id': 'R001'},
        ],
        lastrowid=7,
    )
    monkeypatch.setattr(signup, 'get_database_connection', lambda: conn)
    monkeypatch.setattr(signup.uuid, 'uuid4', lambda: type('U', (), {'hex': 'abcdef1234567890'})())

    result = signup.signup(signup.SignupRequest(company_id='C001', user_name='user', email='a@example.com', password='123456', signup_as='manager'))
    assert result == {'message': 'Signup successful', 'user_id': 7}
    assert conn.committed is True
    assert cursor.closed is True


def test_signup_wraps_mysql_errors(monkeypatch):
    class DummyError(mysql.connector.Error):
        pass

    def broken_connection():
        raise DummyError('db down')

    monkeypatch.setattr(signup, 'get_database_connection', broken_connection)
    with pytest.raises(DummyError):
        # Connection creation happens before local try/except.
        signup.signup(signup.SignupRequest(company_id='C001', user_name='user', email='a@example.com', password='123456', signup_as='employee'))
