import upcoming_birthdays


def test_get_company_id_requires_valid_token(monkeypatch):
    monkeypatch.setattr(upcoming_birthdays, 'verify_token', lambda token: {'company_id': 'C001'})
    assert upcoming_birthdays._get_company_id('Bearer token') == 'C001'


def test_download_upcoming_birthdays_report_returns_file_response(monkeypatch):
    monkeypatch.setattr(upcoming_birthdays, 'get_upcoming_birthdays', lambda **kwargs: {
        'table': [{'name': 'John Doe', 'department': 'Engineering', 'birthday': '1990-01-10', 'days_left': 2, 'tag': 'Soon'}]
    })
    response = upcoming_birthdays.download_upcoming_birthdays_report(authorization='Bearer token')
    assert response.media_type == 'application/pdf'
