from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import AuditLog
import time, uuid

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        req_id = str(uuid.uuid4())[:8]
        start = time.time()
        response = await call_next(request)
        latency = int((time.time()-start)*1000)
        # Log all /api/* calls
        if request.url.path.startswith("/api"):
            db = SessionLocal()
            try:
                db.add(AuditLog(
                    action=f"{request.method} {request.url.path}",
                    resource=request.url.path,
                    ip=request.client.host if request.client else "",
                    meta={"req_id": req_id, "status": response.status_code, "latency_ms": latency}
                ))
                db.commit()
            except: pass
            finally: db.close()
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Latency-ms"] = str(latency)
        return response
