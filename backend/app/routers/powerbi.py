from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user
from pydantic import BaseModel
import httpx, os

router = APIRouter(prefix="/api/powerbi", tags=["powerbi"])

class PowerBIConfig(BaseModel):
    tenant_id: str
    client_id: str
    client_secret: str
    workspace_id: str
    report_id: str
    dataset_id: str = ""

@router.post("/embed-token")
async def get_embed_token(cfg: PowerBIConfig, user=Depends(get_current_user)):
    # Real Microsoft Entra ID + Power BI REST API flow
    # 1. Get AAD token
    # 2. Get embed token
    # No secret ever returned to frontend
    if not cfg.client_secret:
        raise HTTPException(400, "Missing client_secret - configure in backend .env, never frontend")
    try:
        async with httpx.AsyncClient() as client:
            # Step 1: AAD token
            # form = {"grant_type":"client_credentials","client_id":cfg.client_id,"client_secret":cfg.client_secret,"scope":"https://analysis.windows.net/powerbi/api/.default"}
            # aad = await client.post(f"https://login.microsoftonline.com/{cfg.tenant_id}/oauth2/v2.0/token", data=form)
            # access_token = aad.json()["access_token"]
            # Step 2: embed token
            # embed = await client.post(f"https://api.powerbi.com/v1.0/myorg/groups/{cfg.workspace_id}/reports/{cfg.report_id}/GenerateToken", json={"accessLevel":"View","allowSaveAs":False}, headers={"Authorization":f"Bearer {access_token}"})
            # For now return config check — real flow uncomment when creds available
            return {
                "status": "configured",
                "workspace_id": cfg.workspace_id,
                "report_id": cfg.report_id,
                "embed_url": f"https://app.powerbi.com/reportEmbed?reportId={cfg.report_id}&groupId={cfg.workspace_id}",
                "token": "GENERATED_IN_BACKEND_ONLY_WHEN_CREDS_VALID",
                "expiry": "1 hour",
                "note": "Uncomment AAD + GenerateToken calls when Entra creds provided. Token never exposed without auth."
            }
    except Exception as e:
        return {"status":"failed","error":str(e),"setup":"Provide tenant_id, client_id, client_secret, workspace_id, report_id. Admin must consent Power BI permissions in Entra ID."}

@router.get("/health")
def health(user=Depends(get_current_user)):
    return {
        "configured": bool(os.getenv("POWERBI_CLIENT_ID")),
        "required_env": ["POWERBI_TENANT_ID","POWERBI_CLIENT_ID","POWERBI_CLIENT_SECRET","POWERBI_WORKSPACE_ID","POWERBI_REPORT_ID"],
        "sdk": "powerbi-client JS SDK on frontend, embed token from backend only"
    }
