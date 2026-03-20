import importlib

import database
import date_utils
from tests.helpers import make_connection


def test_test_query_script_prints_resolved_dates_and_result(monkeypatch, capsys):
    conn, _ = make_connection(fetchone_results=[{'present': 8, 'late': 1, 'on_leave': 0}])
    monkeypatch.setattr(database, 'get_database_connection', lambda: conn)
    monkeypatch.setattr(date_utils, 'resolve_date_range', lambda: ('2025-01-01', '2025-01-05'))

    import test_query
    importlib.reload(test_query)
    output = capsys.readouterr().out
    assert 'Resolved dates:' in output
    assert 'Query result:' in output
