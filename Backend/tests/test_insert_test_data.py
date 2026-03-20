from datetime import date

import insert_test_data
from tests.helpers import make_connection


def test_get_connection_uses_mysql_connector(monkeypatch):
    called = {}
    monkeypatch.setattr(insert_test_data.mysql.connector, 'connect', lambda **kwargs: called.update(kwargs) or 'CONN')
    assert insert_test_data.get_connection() == 'CONN'
    assert called['database'] == insert_test_data.DB_NAME


def test_insert_test_data_inserts_expected_number_of_rows(monkeypatch, capsys):
    conn, cursor = make_connection(fetchone_results=[(0,)])
    monkeypatch.setattr(insert_test_data, 'get_connection', lambda: conn)
    class FakeDate(date):
        @classmethod
        def today(cls):
            return cls(2025, 1, 7)
    monkeypatch.setattr(insert_test_data, 'date', FakeDate)

    insert_test_data.insert_test_data(num_days=2)
    assert conn.committed is True
    assert len(cursor.executed) == 1 + (2 * len(insert_test_data.EMPLOYEES))
    assert 'Successfully inserted' in capsys.readouterr().out


def test_insert_test_data_rolls_back_on_error(monkeypatch, capsys):
    conn, cursor = make_connection(fetchone_results=[(0,)], fail_on_execute=RuntimeError('db error'))
    monkeypatch.setattr(insert_test_data, 'get_connection', lambda: conn)
    insert_test_data.insert_test_data(num_days=1)
    assert conn.rolled_back is True
    assert 'Error inserting data' in capsys.readouterr().out


def test_check_existing_data_prints_summary(monkeypatch, capsys):
    conn, _ = make_connection(fetchone_results=[{'earliest': '2025-01-01', 'latest': '2025-01-07', 'total_records': 10}])
    monkeypatch.setattr(insert_test_data, 'get_connection', lambda: conn)
    insert_test_data.check_existing_data()
    assert 'Current Database Data' in capsys.readouterr().out
