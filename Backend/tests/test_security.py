import security
from tests.helpers import DummySMTP


def test_get_secret_prefers_jwt_secret(monkeypatch):
    monkeypatch.setenv('JWT_SECRET', 'jwt-secret')
    monkeypatch.setenv('SECRET_KEY', 'legacy-secret')
    assert security._get_secret() == 'jwt-secret'


def test_create_access_token_and_verify_token_round_trip(monkeypatch):
    monkeypatch.setattr(security, 'SECRET_KEY', 'unit-test-secret')
    token = security.create_access_token({'sub': '7', 'role': 'employee'})
    payload = security.verify_token(token)
    assert payload['sub'] == '7'
    assert payload['role'] == 'employee'
    assert 'exp' in payload


def test_verify_token_returns_empty_dict_for_invalid_token(monkeypatch):
    monkeypatch.setattr(security, 'SECRET_KEY', 'unit-test-secret')
    assert security.verify_token('broken-token') == {}


def test_send_otp_email_uses_smtp(monkeypatch):
    DummySMTP.sent_messages.clear()
    monkeypatch.setattr(security.smtplib, 'SMTP_SSL', DummySMTP)
    security.send_otp_email('user@example.com', '123456')
    assert DummySMTP.sent_messages
    assert DummySMTP.sent_messages[0]['To'] == 'user@example.com'
