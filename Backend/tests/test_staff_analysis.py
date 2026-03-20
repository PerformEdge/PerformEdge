import io
import pytest
from fastapi import HTTPException
import staff_analysis as module


def test_get_company_id_validates_header(monkeypatch):
    monkeypatch.setattr(module, 'verify_token', lambda token: {'company_id': 'C001'})
    assert module._get_company_id('Bearer token') == 'C001'
    with pytest.raises(HTTPException):
        module._get_company_id(None)


def test_report_endpoint_returns_pdf(monkeypatch):
    fake = {
        'kpis': {'total_staff': 25, 'new_joiners': 4, 'resigned_staff': 1},
        'trend': {'new_joiners': [1, 2, 1], 'resigned': [0, 1, 0]},
        'distribution': [],
        'new_joiners_list': [{'name': 'Jane Doe', 'department': 'HR', 'date': '2025-01-01'}],
        'resigned_list': [{'name': 'John Doe', 'department': 'IT', 'date': '2025-01-02'}],
    }
    monkeypatch.setattr(module, 'staff_analysis', lambda *args, **kwargs: fake)
    monkeypatch.setattr(module, '_pdf_make', lambda *args, **kwargs: io.BytesIO(b'pdf'))
    response = module.staff_analysis_report(authorization='Bearer token', date_range='', department='', location='')
    assert response.media_type == 'application/pdf'
