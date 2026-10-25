from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import re

BLOCKED_PATTERNS = [re.compile(r"(\bDROP\s+TABLE\b)", re.I), re.compile(r"(\bUNION\s+SELECT\b)", re.I)]

class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Rate limit simple in-memory (use Redis in prod)
        # XSS header
        response = await call_next(request)
        response.headers["X-Content-Type-Options"]="nosniff"
        response.headers["X-Frame-Options"]="DENY"
        response.headers["X-XSS-Protection"]="1; mode=block"
        response.headers["Strict-Transport-Security"]="max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"]="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;"
        return response
