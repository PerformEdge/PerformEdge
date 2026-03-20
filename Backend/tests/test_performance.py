from datetime import date
import io

import performance


def test_resolution_and_date_helpers(monkeypatch):
    monkeypatch.setattr(performance, 'verify_token', lambda token: {'company_id': 'C001'})
    assert performance._company_id_from_token('Bearer token') == 'C001'
    assert performance._resolve_company_id('C009', None) == 'C009'
    assert performance._resolve_company_id(None, 'Bearer token') == 'C001'
    assert performance._parse_date_range('2025-01-01 to 2025-01-31')[0] == date(2025, 1, 1)


def test_resolution_helpers_and_bucket(monkeypatch):
    monkeypatch.setattr(performance, '_fetch_one', lambda sql, params=(): {'department_id': 'D001'} if 'departments' in sql else {'location_id': 'L001'})
    assert performance._resolve_department_id('C001', 'Engineering') == 'D001'
    assert performance._resolve_location_id('C001', 'Head Office') == 'L001'
    assert performance._bucket([{'rating_name': 'Excellent', 'min_score': 85, 'max_score': 100}], 90)['rating_name'] == 'Excellent'


def test_pick_cycle_uses_overlap_and_returns_none_when_missing(monkeypatch):
    monkeypatch.setattr(performance, '_fetch_one', lambda sql, params=(): {'cycle_id': 'C1'} if 'NOT (end_date' in sql else None)
    assert performance._pick_cycle('C001', '2025-01-01 to 2025-01-31')['cycle_id'] == 'C1'


def test_main_endpoints_return_expected_shapes(monkeypatch):
    monkeypatch.setattr(performance, '_resolve_company_id', lambda company_id, authorization: 'C001')
    monkeypatch.setattr(performance, '_resolve_department_id', lambda company_id, department: None)
    monkeypatch.setattr(performance, '_resolve_location_id', lambda company_id, location: None)
    monkeypatch.setattr(performance, '_pick_cycle', lambda company_id, date_range: {'cycle_id': 'C1'})
    monkeypatch.setattr(performance, '_get_rating_scale', lambda company_id: [{'rating_name': 'Excellent', 'min_score': 85, 'max_score': 100, 'color_hex': '#00ff00'}])
    monkeypatch.setattr(performance, '_fetch_all', lambda sql, params=(): [])
    monkeypatch.setattr(
        performance,
        '_fetch_one',
        lambda sql, params=(): {'total': 0}
        if 'COUNT(*) AS total FROM employees' in sql
        else ({'approved': 0, 'total': 0} if "SUM(CASE WHEN tr.status='APPROVED'" in sql else None),
    )
    overview = performance.performance_overview(date_range='', department='', location='', company_id=None, authorization=None)
    ranking = performance.performance_ranking(date_range='', department='', location='', company_id=None, authorization=None)
    training = performance.training_needs(date_range='', department='', location='', company_id=None, authorization=None)
    appraisals = performance.appraisals_completion(date_range='', department='', location='', company_id=None, authorization=None)
    assert 'stats' in overview
    assert set(ranking.keys()) >= {'stats', 'chart', 'employees'}
    assert set(training.keys()) >= {'stats', 'bars', 'table'}
    assert set(appraisals.keys()) >= {'stats', 'chart', 'rows'}


def test_report_endpoints_return_pdf(monkeypatch):
    monkeypatch.setattr(performance, 'performance_ranking', lambda **kwargs: {'stats': {}, 'chart': [], 'employees': []})
    monkeypatch.setattr(performance, 'training_needs', lambda **kwargs: {'stats': {}, 'bars': [], 'table': []})
    monkeypatch.setattr(performance, 'appraisals_completion', lambda **kwargs: {'stats': {}, 'chart': [], 'rows': []})
    monkeypatch.setattr(performance, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    assert performance.ranking_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert performance.training_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert performance.appraisals_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
    assert performance.overview_report(date_range='', department='', location='', company_id=None, authorization=None).media_type == 'application/pdf'
