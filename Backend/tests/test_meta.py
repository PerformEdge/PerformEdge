import meta
from tests.helpers import make_connection


def test_company_resolution_helpers(monkeypatch):
    monkeypatch.setattr(meta, 'verify_token', lambda token: {'company_id': 'C001'})
    assert meta._company_id_from_token('Bearer token') == 'C001'
    assert meta._resolve_company_id('C009', None) == 'C009'
    assert meta._resolve_company_id(None, 'Bearer token') == 'C001'


def test_list_departments_and_locations(monkeypatch):
    monkeypatch.setattr(meta, '_resolve_company_id', lambda company_id, authorization: 'C001')
    monkeypatch.setattr(meta, '_fetch_all', lambda sql, params=(): [{'id': 'D1', 'name': 'Engineering'}])
    assert meta.list_departments()['items'][0]['name'] == 'Engineering'
    assert meta.list_locations()['items'][0]['name'] == 'Engineering'
