import pytest
from fastapi import HTTPException

import employee_common
from tests.helpers import make_connection


def test_require_payload_validates_and_normalizes_user_id(monkeypatch):
    monkeypatch.setattr(employee_common, 'verify_token', lambda token: {'sub': '12', 'role': 'employee'})
    payload = employee_common._require_payload('Bearer token')
    assert payload['user_id'] == 12


def test_require_payload_rejects_missing_or_invalid_tokens(monkeypatch):
    with pytest.raises(HTTPException):
        employee_common._require_payload(None)

    monkeypatch.setattr(employee_common, 'verify_token', lambda token: {})
    with pytest.raises(HTTPException):
        employee_common._require_payload('Bearer bad')


def test_require_employee_blocks_non_employee_role():
    with pytest.raises(HTTPException):
        employee_common._require_employee({'role': 'manager'})


def test_get_employee_id_prefers_payload_value():
    assert employee_common._get_employee_id({'employee_id': 'E001'}) == 'E001'


def test_get_employee_id_looks_up_database_and_raises_when_missing(monkeypatch):
    conn, _ = make_connection(fetchone_results=[{'employee_id': 'E099'}])
    monkeypatch.setattr(employee_common, 'get_database_connection', lambda: conn)
    assert employee_common._get_employee_id({'user_id': 1}) == 'E099'

    conn2, _ = make_connection(fetchone_results=[None])
    monkeypatch.setattr(employee_common, 'get_database_connection', lambda: conn2)
    with pytest.raises(HTTPException):
        employee_common._get_employee_id({'user_id': 1})


def test_rating_for_score_matches_range_and_handles_none(monkeypatch):
    conn, _ = make_connection(fetchall_results=[[
        {'rating_name': 'Excellent', 'min_score': 85, 'max_score': 100},
        {'rating_name': 'Good', 'min_score': 70, 'max_score': 84},
    ]])
    monkeypatch.setattr(employee_common, 'get_database_connection', lambda: conn)
    assert employee_common._rating_for_score('C001', 88) == 'Excellent'
    assert employee_common._rating_for_score('C001', None) is None
