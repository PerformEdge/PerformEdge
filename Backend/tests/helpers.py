from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Optional


@dataclass
class FakeCursor:
    fetchone_results: List[Any] = field(default_factory=list)
    fetchall_results: List[Any] = field(default_factory=list)
    rowcount: int = 1
    lastrowid: int = 1
    fail_on_execute: Optional[Exception] = None

    def __post_init__(self):
        self.executed = []
        self.closed = False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
        if self.fail_on_execute:
            raise self.fail_on_execute

    def fetchone(self):
        if self.fetchone_results:
            return self.fetchone_results.pop(0)
        return None

    def fetchall(self):
        if self.fetchall_results:
            value = self.fetchall_results.pop(0)
            return value if value is not None else []
        return []

    def close(self):
        self.closed = True


@dataclass
class FakeConnection:
    cursor_obj: FakeCursor
    committed: bool = False
    rolled_back: bool = False
    closed: bool = False

    def cursor(self, dictionary=False):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class DummySMTP:
    sent_messages = []

    def __init__(self, host, port, *args, **kwargs):
        self.host = host
        self.port = port
        self.started_tls = False
        self.logged_in = None
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.closed = True
        return False

    def starttls(self):
        self.started_tls = True

    def login(self, username, password):
        self.logged_in = (username, password)

    def send_message(self, message):
        self.__class__.sent_messages.append(message)

    def quit(self):
        self.closed = True


def make_connection(*, fetchone_results=None, fetchall_results=None, rowcount=1, lastrowid=1, fail_on_execute=None):
    cursor = FakeCursor(
        fetchone_results=list(fetchone_results or []),
        fetchall_results=list(fetchall_results or []),
        rowcount=rowcount,
        lastrowid=lastrowid,
        fail_on_execute=fail_on_execute,
    )
    conn = FakeConnection(cursor_obj=cursor)
    return conn, cursor
