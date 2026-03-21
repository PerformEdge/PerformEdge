import io
import pytest
from fastapi import HTTPException
import service_year_analysis as module


def test_get_company_id_validates_header(monkeypatch):
    monkeypatch.setattr(module, 'verify_token', lambda token: {'company_id': 'C001'})
    assert module._get_company_id('Bearer token') == 'C001'
    with pytest.raises(HTTPException):
        module._get_company_id(None)


def test_report_endpoint_returns_pdf(monkeypatch):
    fake = {
        'chart': {'labels': ['0-1'], 'values': [5]},
        'loyalty_index': 40,
        'top_long_serving': [{'name': 'Jane Doe', 'years': 8}],
        'staff': [{'name': 'Jane Doe', 'department': 'HR', 'years': '8 yrs'}],
    }
    monkeypatch.setattr(module, '_get_company_id', lambda authorization: 'C001')
    monkeypatch.setattr(module, '_get_service_year_data', lambda *args, **kwargs: fake)
    monkeypatch.setattr(module, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    response = module.service_year_analysis_report(authorization='Bearer token', date_range='', department='', location='')
    assert response.media_type == 'application/pdf'
