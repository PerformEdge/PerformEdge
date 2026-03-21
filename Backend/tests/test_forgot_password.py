from datetime import datetime, timedelta
import pytest
from fastapi import HTTPException

import forgot_password
from tests.helpers import make_connection


def setup_function():
    forgot_password.otp_store.clear()


def test_send_otp_stores_code_and_calls_email_sender(monkeypatch):
    conn, _ = make_connection(fetchone_results=[{'user_id': 1}])
    sent = []
    monkeypatch.setattr(forgot_password, 'get_database_connection', lambda: conn)
    monkeypatch.setattr(forgot_password, 'send_otp_email', lambda email, otp: sent.append((email, otp)))
    monkeypatch.setattr(forgot_password.random, 'randint', lambda a, b: 123456)

    result = forgot_password.send_otp(forgot_password.SendOtpRequest(email='user@example.com'))
    assert result['message'] == 'OTP sent to your email'
    assert sent == [('user@example.com', '123456')]
    assert 'user@example.com' in forgot_password.otp_store


def test_send_otp_rejects_missing_user(monkeypatch):
    conn, _ = make_connection(fetchone_results=[None])
    monkeypatch.setattr(forgot_password, 'get_database_connection', lambda: conn)
    with pytest.raises(HTTPException):
        forgot_password.send_otp(forgot_password.SendOtpRequest(email='user@example.com'))


def test_change_password_handles_missing_expired_and_wrong_otp(monkeypatch):
    body = forgot_password.ChangePasswordRequest(email='user@example.com', otp='000000', new_password='secret')
    with pytest.raises(HTTPException):
        forgot_password.change_password(body)

    forgot_password.otp_store['user@example.com'] = {'otp': '111111', 'expiry': datetime.utcnow() - timedelta(minutes=1)}
    with pytest.raises(HTTPException):
        forgot_password.change_password(body)

    forgot_password.otp_store['user@example.com'] = {'otp': '111111', 'expiry': datetime.utcnow() + timedelta(minutes=5)}
    with pytest.raises(HTTPException):
        forgot_password.change_password(body)


def test_change_password_updates_password_and_clears_store(monkeypatch):
    forgot_password.otp_store['user@example.com'] = {'otp': '111111', 'expiry': datetime.utcnow() + timedelta(minutes=5)}
    conn, cursor = make_connection()
    monkeypatch.setattr(forgot_password, 'get_database_connection', lambda: conn)

    body = forgot_password.ChangePasswordRequest(email='user@example.com', otp='111111', new_password='secret')
    result = forgot_password.change_password(body)
    assert result['message'] == 'Password changed successfully'
    assert conn.committed is True
    assert 'user@example.com' not in forgot_password.otp_store
