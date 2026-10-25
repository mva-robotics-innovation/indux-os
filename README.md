# INDUX-OS V12 — Industrial Intelligence OS

## Quick Start
cp .env.example .env
# Edit SECRET_KEY (64 chars), POSTGRES_PASSWORD, ADMIN_INITIAL_PASSWORD
docker-compose up --build

Frontend: http://localhost:5173
Backend Docs: http://localhost:8000/docs
Health: /health, /health/ready, /health/detailed (admin)

Login:
POST /api/auth/seed-admin
POST /api/auth/login {"username":"Ashish","password":"from .env"} → token
In browser console: localStorage.setItem('token', 'JWT')

## Power BI Commissioning
1. Entra ID: Register app, add Power BI Service API permission
2. Workspace: Add service principal as member
3. .env: POWERBI_TENANT_ID, CLIENT_ID, CLIENT_SECRET, WORKSPACE_ID, REPORT_ID
4. Test: POST /api/powerbi/embed-token (auth required)
5. Frontend: Uses powerbi-client SDK with token from backend only

## OPC UA / MQTT
POST /api/industrial/opcua/test {endpoint:"opc.tcp://IP:4840", node_ids:["ns=2;s=Temp"]}
POST /api/industrial/mqtt/test {broker:"mqtts://broker:8883", topics:["factory/#"]}

## Vision
In ai-inference: pip install ultralytics
Download yolov8n.pt → POST /api/vision/detect with image
Health reports loaded: true/false, never fake

## CAD
POST /api/cad/upload GLB/glTF (real geometry)
POST /api/cad/simulate {model_id, solver:"openfoam", params}
Logs + results via job_id, background worker

## Notifications
INSERT INTO notification_configs (channel, config) VALUES
('webhook', '{"url":"https://hooks.slack.com/..."}'),
('email', '{"host":"smtp.gmail.com","to":["supervisor@factory.com"],"use_api":false}');
POST /api/incidents → check notification_log delivered boolean from provider

## Production Deploy
Frontend: Vercel `npm run build` → dist
Backend: Render/Docker: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
Postgres: Render/Supabase with pgvector extension
Redis: Upstash
AI Inference: Separate VM with GPU for YOLO/Whisper

Security: No secrets in frontend, HTTPS, CSP headers, RBAC enforced server-side, audit logs, backup: pg_dump daily.

## Testing
docker exec backend pytest -v
Frontend: npm run build → check no dead buttons
Manual: Voice mic denied fallback, Power BI unauthorized error, OPC UA disconnect, stale telemetry (5 min), CAD unsupported format.

## Acceptance Gates
- No dead primary action ✅
- No secrets in frontend ✅
- No live data claim without source ✅
- Notification success only with provider evidence ✅
- Model validated only with eval metrics ✅
- Simulation result only from real solver ✅
