from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Incident, NotificationConfig
from ..auth import get_current_user
from ..services.notifications import send_email, send_sms, send_webhook
from datetime import datetime
from pydantic import BaseModel
import asyncio

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

class IncidentCreate(BaseModel):
    severity: str; location: str; asset: str = ""; description: str

@router.post("")
async def create_incident(req: IncidentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), user=Depends(get_current_user)):
    inc = Incident(severity=req.severity, location=req.location, asset=req.asset, description=req.description, status="open")
    db.add(inc); db.commit(); db.refresh(inc)
    configs = db.query(NotificationConfig).filter(NotificationConfig.is_active==True).all()
    logs=[]
    for cfg in configs:
        if cfg.channel=="email":
            r = await send_email(cfg.config.get("to",[]), f"[INDUX-OS][{req.severity}] #{inc.id} {req.location}", req.description, cfg.config)
            logs.append(r)
        elif cfg.channel=="sms":
            r = await send_sms(cfg.config.get("to",[]), f"Incident #{inc.id} {req.location}", cfg.config)
            logs.append(r)
        elif cfg.channel=="webhook":
            r = await send_webhook(cfg.config.get("url"), {"incident_id": inc.id, "severity": req.severity, "location": req.location, "description": req.description})
            logs.append(r)
    inc.notification_log = logs
    db.commit()
    background_tasks.add_task(escalation, inc.id)
    return {"id": inc.id, "severity": inc.severity, "location": inc.location, "status": inc.status, "notification_log": logs, "created_at": inc.created_at}

async def escalation(id: int):
    await asyncio.sleep(900)

@router.get("")
def list_incidents(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Incident).order_by(Incident.created_at.desc()).limit(100).all()

@router.post("/{incident_id}/ack")
def ack(incident_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    inc = db.query(Incident).filter(Incident.id==incident_id).first()
    inc.status="ack"; inc.acknowledged_by=user.id; db.commit()
    return {"status":"acknowledged"}

@router.post("/{incident_id}/close")
def close(incident_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    inc = db.query(Incident).filter(Incident.id==incident_id).first()
    inc.status="closed"; inc.closed_at=datetime.utcnow(); db.commit()
    return {"status":"closed"}
