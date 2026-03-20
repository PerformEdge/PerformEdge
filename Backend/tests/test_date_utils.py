from datetime import date
import pytest
from fastapi import HTTPException

import date_utils


def test_parse_date_accepts_embedded_iso_date():
    assert date_utils.parse_date('from 2025-01-02 until later') == date(2025, 1, 2)


def test_parse_date_rejects_empty_or_invalid_values():
    with pytest.raises(HTTPException):
        date_utils.parse_date('')
    with pytest.raises(HTTPException):
        date_utils.parse_date('not-a-date')


def test_resolve_date_range_prefers_date_range_string():
    start, end = date_utils.resolve_date_range(date_range='2025-01-01 to 2025-01-05')
    assert start == date(2025, 1, 1)
    assert end == date(2025, 1, 5)


def test_resolve_date_range_defaults_when_partial_values_are_missing(monkeypatch):
    class FakeDate(date):
        @classmethod
        def today(cls):
            return cls(2025, 1, 10)

    monkeypatch.setattr(date_utils, 'date', FakeDate)
    start, end = date_utils.resolve_date_range(default_days=3)
    assert start == date(2025, 1, 8)
    assert end == date(2025, 1, 10)


def test_resolve_date_range_rejects_reversed_range():
    with pytest.raises(HTTPException):
        date_utils.resolve_date_range(start='2025-01-10', end='2025-01-01')


def test_active_during_range_sql_builds_expected_clause():
    clause, params = date_utils.active_during_range_sql(
        alias='e',
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
    )
    assert 'e.join_date <=' in clause
    assert params == ['2025-01-31', '2025-01-01']
