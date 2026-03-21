import io
import age_analysis as module


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
    monkeypatch.setattr(module, 'age_analysis', lambda *args, **kwargs: {'distribution': [], 'table': []})
    monkeypatch.setattr(module, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    response = module.age_analysis_report()
    assert response.media_type == 'application/pdf'
