import io
import location_wise_staff_distribution as module


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
        'kpis': {'total_staff': 10, 'total_locations': 1, 'max_location': 'HQ', 'min_location': 'HQ'},
        'chart': [{'location': 'HQ', 'count': 10}],
        'employees': [{'name': 'Jane Doe', 'department': 'HR', 'location': 'HQ'}],
    }
    monkeypatch.setattr(module, 'location_wise_staff_distribution', lambda *args, **kwargs: fake)
    monkeypatch.setattr(module, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    response = module.location_wise_staff_report(date_range='', department='', location='', company_id=None, authorization=None)
    assert response.media_type == 'application/pdf'
