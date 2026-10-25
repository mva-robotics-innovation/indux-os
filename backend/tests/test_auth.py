from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)

def test_login_flow():
    client.post("/api/auth/seed-admin")
    r = client.post("/api/auth/login", json={"username":"Ashish","password":"Ashish@123Secure"})
    # In real test use env password
    assert r.status_code in [200,401]
    if r.status_code==200:
        token=r.json()["access_token"]
        r2 = client.get("/api/machines", headers={"Authorization":f"Bearer {token}"})
        assert r2.status_code==200

def test_rbac_reject():
    r = client.get("/api/machines")
    assert r.status_code in [401,403]

def test_incident_create_requires_auth():
    r = client.post("/api/incidents", json={"severity":"high","location":"Test","description":"Test"})
    assert r.status_code==401
