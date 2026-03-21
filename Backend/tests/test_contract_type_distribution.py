import io
import pytest
from fastapi import HTTPException
import contract_type_distribution as module


def test_get_company_id_validates_header(monkeypatch):
    monkeypatch.setattr(module, 'verify_token', lambda token: {'company_id': 'C001'})
    assert module._get_company_id('Bearer token') == 'C001'
    with pytest.raises(HTTPException):
        module._get_company_id(None)


def test_report_endpoint_returns_pdf(monkeypatch):
    fake = {
        'kpis': {'total': 10, 'permanent': 7, 'consultants': 2, 'probation': 1},
        'summary': [{'type': 'Permanent', 'percentage': 70}],
        'employees': [{'name': 'Jane Doe', 'department': 'HR', 'contract': 'Permanent'}],
    }
    monkeypatch.setattr(module, 'contract_type_distribution', lambda *args, **kwargs: fake)
    monkeypatch.setattr(module, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    response = module.contract_type_distribution_report(authorization='Bearer token', date_range='', department='', location='')
    assert response.media_type == 'application/pdf'
