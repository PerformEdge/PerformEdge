from datetime import date
import pytest
from fastapi import HTTPException

import dashboard
from tests.helpers import make_connection


def test_payload_from_auth_handles_missing_and_valid_tokens(monkeypatch):
    assert dashboard._payload_from_auth(None) == {}
    monkeypatch.setattr(dashboard, 'verify_token', lambda token: {'company_id': 'C001'})
    assert dashboard._payload_from_auth('Bearer token')['company_id'] == 'C001'


def test_basic_numeric_helpers_and_safe_fetchone():
    class Cursor:
        def fetchone(self):
            return None
    assert dashboard.safe_fetchone(Cursor()) == {}
    assert dashboard.to_int('7') == 7
    assert dashboard.to_int(None, 3) == 3
    assert dashboard.to_float('4.5') == 4.5
    assert dashboard.to_float(None, 2.5) == 2.5


def test_dashboard_overview_rejects_reversed_dates():
    with pytest.raises(HTTPException):
        dashboard.dashboard_overview(start=date(2025, 1, 10), end=date(2025, 1, 1))


def test_dashboard_overview_returns_expected_sections(monkeypatch):
    conn, _ = make_connection(
        fetchone_results=[
            {'c': 10},
            {'c': 2},
            {'c': 1},
            {'ot': 4.5},
            {'a1': 1, 'a2': 2, 'a3': 3, 'a4': 4},
            {'present': 9, 'absent': 1},
        ],
        fetchall_results=[
            [{'label': 'Male', 'value': 6}],
            [{'label': 'Permanent', 'value': 8}],
            [{'name': 'Alex', 'role': 'Engineer', 'score': 88}],
        ],
    )
    monkeypatch.setattr(dashboard, 'get_database_connection', lambda: conn)
    monkeypatch.setattr(dashboard, '_resolve_company_id', lambda company_id, authorization: 'C001')

    result = dashboard.dashboard_overview(start=date(2025, 1, 1), end=date(2025, 1, 7))
    assert set(result.keys()) == {'cards', 'charts', 'employee_performance', 'calendar'}
    assert result['cards']['total_employee'] == 10
