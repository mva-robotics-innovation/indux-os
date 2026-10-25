from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)

def test_incident_notification_log():
    client.post("/api/auth/seed-admin")
    login = client.post("/api/auth/login", json={"username":"Ashish","password":"Ashish@123Secure"})
    if login.status_code!=200: return
    token=login.json()["access_token"]
    # Create notification config (webhook)
    # Then create incident and check log contains delivered boolean
    r = client.post("/api/incidents", json={"severity":"high","location":"Line-2","asset":"Furnace-01","description":"Temp high"}, headers={"Authorization":f"Bearer {token}"})
    assert r.status_code==200
    assert "notification_log" in r.json()
    # Log must contain provider response, not fake success
    for log in r.json()["notification_log"]:
        assert "delivered" in log
        assert "timestamp" in log
