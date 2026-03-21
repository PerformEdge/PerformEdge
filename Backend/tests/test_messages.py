import pytest

import messages


def test_payload_helpers(monkeypatch):
    monkeypatch.setattr(messages, 'verify_token', lambda token: {'user_id': 5})
    assert messages._payload_from_token('Bearer token')['user_id'] == 5
    assert messages._resolve_user_id(None, 'Bearer token') == 5
    assert messages._resolve_user_id(3, None) == 3


def test_inbox_and_sent_serialize_datetimes(monkeypatch):
    row = {'message_id': 'M1', 'created_at': __import__('datetime').datetime(2025, 1, 1), 'subject': 'Hi'}
    monkeypatch.setattr(messages, '_resolve_user_id', lambda user_id, authorization: 1)
    monkeypatch.setattr(messages, '_fetch_all', lambda sql, params=(): [row.copy()])
    assert messages.inbox()['items'][0]['created_at'].startswith('2025-01-01')
    assert messages.sent()['items'][0]['created_at'].startswith('2025-01-01')


def test_unread_count_send_and_mark_read(monkeypatch):
    monkeypatch.setattr(messages, '_resolve_user_id', lambda user_id, authorization: 1)
    monkeypatch.setattr(messages, '_fetch_one', lambda sql, params=(): {'cnt': 4} if 'COUNT' in sql else {'user_id': 2})
    monkeypatch.setattr(messages, '_execute', lambda sql, params=(): 1)
    monkeypatch.setattr(messages.uuid, 'uuid4', lambda: type('U', (), {'hex': 'abcdef123456'})())

    assert messages.unread_count()['count'] == 4
    result = messages.send_message(messages.SendMessageRequest(to_email='to@example.com', subject='Hi', body='Body'))
    assert result['message_id'].startswith('M')
    assert messages.mark_read(messages.MarkReadRequest(message_id='M1'))['updated'] == 1
