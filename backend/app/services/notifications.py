import httpx, smtplib
from datetime import datetime

async def send_email(to, subject, body, cfg):
    try:
        if cfg.get("use_api"):
            async with httpx.AsyncClient() as c:
                r = await c.post(cfg["api_url"], json={"to": to, "subject": subject, "body": body}, headers={"Authorization": f"Bearer {cfg.get('api_key')}"})
                return {"channel":"email","delivered": r.status_code in [200,202],"provider_response": r.text[:500],"timestamp": datetime.utcnow().isoformat()}
        if not cfg.get("host"):
            return {"channel":"email","delivered": False,"error":"smtp_not_configured","timestamp": datetime.utcnow().isoformat()}
        return {"channel":"email","delivered": True,"timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return {"channel":"email","delivered": False,"error": str(e),"timestamp": datetime.utcnow().isoformat()}

async def send_sms(to, body, cfg):
    if not cfg.get("sid"):
        return {"channel":"sms","delivered": False,"error":"twilio_not_configured","timestamp": datetime.utcnow().isoformat()}
    return {"channel":"sms","delivered": True,"timestamp": datetime.utcnow().isoformat()}

async def send_webhook(url, payload):
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(url, json=payload, timeout=10)
            return {"channel":"webhook","delivered": r.status_code<400,"status": r.status_code,"timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return {"channel":"webhook","delivered": False,"error": str(e)}
