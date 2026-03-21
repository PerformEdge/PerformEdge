import io
import EIM as module


def test_company_resolution_helpers(monkeypatch):
    monkeypatch.setattr(module, 'verify_token', lambda token: {'company_id': 'C001'})
    assert module._company_id_from_token('Bearer token') == 'C001'
    assert module._resolve_company_id('C009', None) == 'C009'
    assert module._resolve_company_id(None, 'Bearer token') == 'C001'


def test_pdf_helpers_create_streaming_response():
    buf = module._pdf_make(title='Report')
    response = module._pdf_response('report.pdf', buf)
    assert response.media_type == 'application/pdf'
    assert 'report.pdf' in response.headers['Content-Disposition']


def test_report_endpoint_returns_pdf(monkeypatch):
    fake = {
        'kpis': {'total': 10, 'joiners': 2, 'resigned': 1},
        'employees': [{'full_name': 'Jane Doe', 'department': 'HR', 'location': 'HQ'}],
        'charts': {
            'contract_type': [{'label': 'Permanent', 'percentage': 100}],
            'category': [{'label': 'Full-time', 'value': 10}],
            'location': [{'label': 'HQ', 'value': 10}],
            'gender': [{'label': 'Female', 'value': 6}],
            'age': [{'label': '25-34', 'value': 8}],
        },
    }
    monkeypatch.setattr(module, 'eim_dashboard', lambda *args, **kwargs: fake)
    monkeypatch.setattr(module, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    response = module.dashboard_report(date_range='', department='', location='', company_id=None, authorization=None)
    assert response.media_type == 'application/pdf'
