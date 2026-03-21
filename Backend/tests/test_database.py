import database


def test_get_database_connection_uses_environment(monkeypatch):
    called = {}

    def fake_connect(**kwargs):
        called.update(kwargs)
        return 'CONNECTION'

    monkeypatch.setattr(database.mysql.connector, 'connect', fake_connect)
    monkeypatch.setenv('DB_HOST', 'db.example')
    monkeypatch.setenv('DB_USER', 'tester')
    monkeypatch.setenv('DB_PASSWORD', 'secret')
    monkeypatch.setenv('DB_NAME', 'performedge')

    assert database.get_database_connection() == 'CONNECTION'
    assert called == {
        'host': 'db.example',
        'user': 'tester',
        'password': 'secret',
        'database': 'performedge',
    }


def test_get_db_connection_alias(monkeypatch):
    monkeypatch.setattr(database, 'get_database_connection', lambda: 'ALIAS')
    assert database.get_db_connection() == 'ALIAS'
