import pytest
from fastapi import HTTPException

import search
from tests.helpers import make_connection


def test_fetch_all_closes_connection(monkeypatch):
    conn, _ = make_connection(fetchall_results=[[{'employee_id': 'E001'}]])
    monkeypatch.setattr(search, 'get_db_connection', lambda: conn)
    assert search._fetch_all('SELECT 1') == [{'employee_id': 'E001'}]
    assert conn.closed is True


def test_company_id_from_token_and_require_auth(monkeypatch):
    monkeypatch.setattr(search, 'verify_token', lambda token: {'company_id': 'C001', 'user_id': 1})
    assert search._company_id_from_token('Bearer token') == 'C001'
    assert search._require_auth('Bearer token')['user_id'] == 1
    with pytest.raises(HTTPException):
        search._require_auth(None)


def test_search_returns_empty_for_blank_query(monkeypatch):
    monkeypatch.setattr(search, '_require_auth', lambda auth: {'company_id': 'C001'})
    monkeypatch.setattr(search, '_company_id_from_token', lambda auth: 'C001')
    assert search.search(query='', authorization='Bearer token') == {'query': '', 'employees': []}


def test_search_returns_employees(monkeypatch):
    monkeypatch.setattr(search, '_require_auth', lambda auth: {'company_id': 'C001'})
    monkeypatch.setattr(search, '_company_id_from_token', lambda auth: 'C001')
    monkeypatch.setattr(search, '_fetch_all', lambda sql, params=(): [{'employee_id': 'E001', 'full_name': 'John Doe'}])
    result = search.search(query='john', authorization='Bearer token')
    assert result['query'] == 'john'
    assert result['employees'][0]['employee_id'] == 'E001'
