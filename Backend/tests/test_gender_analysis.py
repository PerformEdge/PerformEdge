import gender_analysis


def test_company_helpers(monkeypatch):
    monkeypatch.setattr(gender_analysis, 'verify_token', lambda token: {'company_id': 'C001'})
    assert gender_analysis._company_id_from_token('Bearer token') == 'C001'
    assert gender_analysis._resolve_company_id('C009', None) == 'C009'
    assert gender_analysis._resolve_company_id(None, 'Bearer token') == 'C001'


def test_gender_report_returns_pdf(monkeypatch):
    monkeypatch.setattr(gender_analysis, '_resolve_company_id', lambda company_id, authorization: 'C001')
    monkeypatch.setattr(gender_analysis, '_get_gender_analysis_data', lambda **kwargs: {
        'summary': {'male': 60, 'female': 40},
        'total': 10,
        'employees': [{'full_name': 'John Doe', 'department_name': 'Engineering', 'gender': 'Male'}],
    })
    response = gender_analysis.download_gender_report()
    assert response.media_type == 'application/pdf'
