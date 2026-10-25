from fastapi import APIRouter, Depends
from ..auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional
import time

router = APIRouter(prefix="/api/industrial", tags=["industrial"])

class OPCUAConfig(BaseModel):
    endpoint: str
    node_ids: List[str]
    security_policy: str="Basic256Sha256"
    sampling_interval: int=1000

class MQTTConfig(BaseModel):
    broker: str
    port: int=8883
    topics: List[str]
    username: Optional[str]=None
    password: Optional[str]=None
    tls: bool=True

@router.post("/opcua/test")
def test_opcua(cfg: OPCUAConfig, user=Depends(get_current_user)):
    try:
        # Real: from asyncua import Client; client = Client(url=cfg.endpoint); await client.connect()
        return {
            "status": "not_configured" if "opc.tcp" not in cfg.endpoint else "configured",
            "endpoint": cfg.endpoint,
            "nodes": cfg.node_ids,
            "last_read": None,
            "quality": "Uncertain - configure real OPC UA server",
            "activation": "pip install asyncua; provide endpoint opc.tcp://<ip>:4840 and nodeIds ns=2;s=Machine.Temperature"
        }
    except Exception as e:
        return {"status":"failed","error":str(e)}

@router.post("/mqtt/test")
def test_mqtt(cfg: MQTTConfig, user=Depends(get_current_user)):
    try:
        # Real: import paho.mqtt.client as mqtt; client.connect(cfg.broker, cfg.port)
        return {
            "status": "configured" if cfg.broker else "not_configured",
            "broker": cfg.broker,
            "topics": cfg.topics,
            "last_message": None,
            "stale_policy": "5 minutes",
            "activation": "pip install paho-mqtt; provide broker mqtts://broker:8883, topics factory/line1/#"
        }
    except Exception as e:
        return {"status":"failed","error":str(e)}

@router.get("/health")
def health(user=Depends(get_current_user)):
    return {
        "opcua": {"status":"check /opcua/test","library":"asyncua"},
        "mqtt": {"status":"check /mqtt/test","library":"paho-mqtt"},
        "normalized_schema": ["site_id","line_id","equipment_id","metric_id","value","unit","source_ts","ingest_ts","quality","connector"]
    }
