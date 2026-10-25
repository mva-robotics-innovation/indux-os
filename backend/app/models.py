from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, JSON
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="admin")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Machine(Base):
    __tablename__ = "machines"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True)
    asset_id = Column(String(100))
    status = Column(String(20), default="idle")
    telemetry = Column(JSON, default={})
    last_seen = Column(DateTime(timezone=True), server_default=func.now())

class Telemetry(Base):
    __tablename__ = "telemetry"
    id = Column(Integer, primary_key=True)
    machine_id = Column(Integer, ForeignKey("machines.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    temperature = Column(Float)
    vibration = Column(Float)
    rpm = Column(Float)
    current = Column(Float)
    anomaly_score = Column(Float)

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True)
    severity = Column(String(20))
    location = Column(String(200))
    asset = Column(String(200))
    description = Column(Text)
    status = Column(String(20), default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    notification_log = Column(JSON, default=[])
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

class NotificationConfig(Base):
    __tablename__ = "notification_configs"
    id = Column(Integer, primary_key=True)
    channel = Column(String(20)) # email, sms, webhook
    config = Column(JSON)
    is_active = Column(Boolean, default=True)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    filename = Column(String(255))
    storage_path = Column(String(500))
    page_count = Column(Integer, default=0)

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    text = Column(Text)
    page_no = Column(Integer)

class CADModel(Base):
    __tablename__ = "cad_models"
    id = Column(Integer, primary_key=True)
    name = Column(String(200))
    glb_path = Column(String(500))
    original_format = Column(String(20))
