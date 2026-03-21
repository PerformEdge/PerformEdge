from fastapi.testclient import TestClient

import main


def test_root_endpoint_returns_health_message():
    client = TestClient(main.app)
    response = client.get('/')
    assert response.status_code == 200
    assert response.json() == {'message': 'PerformEdge backend is running'}


def test_app_registers_core_routes():
    paths = {route.path for route in main.app.routes}
    assert '/auth/login' in paths
    assert '/dashboard/overview' in paths
    assert '/performance/overview' in paths
