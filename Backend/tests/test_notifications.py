import pytest
from fastapi import HTTPException

import notifications


def test_payload_and_user_resolution(monkeypatch):
    monkeypatch.setattr(notifications, 'verify_token', lambda token: {'user_id': 9})
    assert notifications._payload_from_token('Bearer token')['user_id'] == 9
    assert notifications._resolve_user_id(None, 'Bearer token') == 9
    assert notifications._resolve_user_id(7, None) == 7


def test_list_notifications_serializes_datetime(monkeypatch):
    monkeypatch.setattr(notifications, '_fetch_all', lambda sql, params=(): [{'notification_id': 'N1', 'messages': 'Hello', 'created_at': __import__('datetime').datetime(2025, 1, 1), 'is_read': 0}])
    monkeypatch.setattr(notifications, '_resolve_user_id', lambda user_id, authorization: 1)
    result = notifications.list_notifications()
    assert result['items'][0]['created_at'].startswith('2025-01-01')


def test_unread_count_and_mark_actions(monkeypatch):
    monkeypatch.setattr(notifications, '_resolve_user_id', lambda user_id, authorization: 1)
    monkeypatch.setattr(notifications, '_fetch_all', lambda sql, params=(): [{'cnt': 3}])
    assert notifications.unread_count()['count'] == 3

    monkeypatch.setattr(notifications, '_execute', lambda sql, params=(): 2)
    assert notifications.mark_all_read()['updated'] == 2
    assert notifications.mark_read(notifications.MarkReadRequest(ids=['N1']))['updated'] == 2

    with pytest.raises(HTTPException):
        notifications.mark_read(notifications.MarkReadRequest(ids=[]))
