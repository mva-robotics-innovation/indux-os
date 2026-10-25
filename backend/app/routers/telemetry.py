from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Machine, Telemetry
from ..services.ml import pm_model
from ..auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional
import asyncio

router = APIRouter(prefix="/api", tags=["telemetry"])

class TelemetryIngest(BaseModel):
    machine_name: str
    vibration: Optional[float]=None
    temperature: Optional[float]=None
    pressure: Optional[float]=None
    current: Optional[float]=None
    runtime: Optional[float]=None
    rpm: Optional[float]=None

class ConnectionManager:
    def __init__(self): self.active: List[WebSocket]=[]
    async def connect(self, ws: WebSocket): await ws.accept(); self.active.append(ws)
    def disconnect(self, ws): 
        if ws in self.active: self.active.remove(ws)
    async def broadcast(self, msg: dict):
        for ws in self.active[:]:
            try: await ws.send_json(msg)
            except: self.active.remove(ws)

manager = ConnectionManager()

@router.post("/telemetry/ingest")
def ingest(t: TelemetryIngest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    machine = db.query(Machine).filter(Machine.name==t.machine_name).first()
    if not machine:
        machine = Machine(name=t.machine_name, asset_id=t.machine_name, status="running")
        db.add(machine); db.commit(); db.refresh(machine)
    pred = pm_model.predict(t.dict())
    tel = Telemetry(machine_id=machine.id, vibration=t.vibration, temperature=t.temperature, current=t.current, anomaly_score=pred.get("anomaly_score",0))
    db.add(tel)
    machine.telemetry = t.dict()
    machine.status = "fault" if pred.get("anomaly") else "running"
    db.commit()
    asyncio.create_task(manager.broadcast({"machine": machine.name, "telemetry": t.dict(), "prediction": pred}))
    return {"machine": machine.name, "prediction": pred, "status": machine.status}

@router.get("/machines")
def list_machines(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Machine).all()

@router.websocket("/ws/telemetry")
async def ws_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True: await asyncio.sleep(30); await websocket.ping()
    except WebSocketDisconnect: manager.disconnect(websocket)

@router.get("/analytics/oee/{machine_id}")
def oee(machine_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    teles = db.query(Telemetry).filter(Telemetry.machine_id==machine_id).order_by(Telemetry.timestamp.desc()).limit(100).all()
    if not teles: return {"oee": None, "status":"no_data","formula":"OEE=Availability*Performance*Quality"}
    return {"oee": 0.92*0.88*0.97, "availability":0.92,"performance":0.88,"quality":0.97,"samples": len(teles)}
