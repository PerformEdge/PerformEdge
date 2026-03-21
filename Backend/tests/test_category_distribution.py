import io
import pytest
from fastapi import HTTPException
import category_distribution as module


def test_get_company_id_validates_header(monkeypatch):
    monkeypatch.setattr(module, 'verify_token', lambda token: {'company_id': 'C001'})
    assert module._get_company_id('Bearer token') == 'C001'
    with pytest.raises(HTTPException):
        module._get_company_id(None)


def test_report_endpoint_returns_pdf(monkeypatch):
    fake = {'labels': [], 'values': [], 'total_staff': [], 'summary': [], 'employees': []}
    monkeypatch.setattr(module, 'category_distribution', lambda *args, **kwargs: fake)
    if hasattr(module, '_pdf_make'):
        monkeypatch.setattr(module, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    response = module.category_distribution_report(authorization='Bearer token')
    assert response.media_type == 'application/pdf'
