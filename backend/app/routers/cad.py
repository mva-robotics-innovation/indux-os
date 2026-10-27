from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import os
import uuid
import shutil
from pathlib import Path
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from ..database import get_db
from ..models import CADModel
from ..auth import get_current_user

router = APIRouter(prefix="/api/cad", tags=["cad"])

# Render's application directory is not writable on a standard Python service.
# Override CAD_STORE_DIR in the environment when using persistent/object storage.
STORE = os.getenv("CAD_STORE_DIR", "/tmp/indux-os-cad")
os.makedirs(STORE, exist_ok=True)


class SimulationReq(BaseModel):
    model_id: int
    solver: str = "openfoam"  # or calculix, ansys
    params: dict = Field(default_factory=dict)


@router.post("/upload")
def upload_cad(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    original_name = Path(file.filename or "upload").name
    if "." not in original_name:
        raise HTTPException(400, "File must have a supported extension: GLB, glTF, STL, STEP")

    ext = original_name.rsplit(".", 1)[-1].lower()
    if ext not in ["glb", "gltf", "stl", "step", "stp"]:
        raise HTTPException(400, "Supported: GLB, glTF, STL, STEP")

    fname = f"{uuid.uuid4()}_{original_name}"
    path = os.path.join(STORE, fname)
    try:
        with open(path, "wb") as out:
            shutil.copyfileobj(file.file, out)
    finally:
        file.file.close()

    model = CADModel(name=original_name, original_format=ext.upper(), glb_path=path)
    db.add(model)
    db.commit()
    db.refresh(model)
    return {
        "id": model.id,
        "name": model.name,
        "glb_path": model.glb_path,
        "needs_conversion": ext not in ["glb", "gltf"],
    }


@router.get("")
def list_cad(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(CADModel).all()


@router.post("/simulate")
def simulate(req: SimulationReq, db: Session = Depends(get_db), user=Depends(get_current_user)):
    model = db.query(CADModel).filter(CADModel.id == req.model_id).first()
    if not model:
        raise HTTPException(404, "Model not found")

    job_id = f"sim-{uuid.uuid4()}"
    return {
        "job_id": job_id,
        "status": "queued",
        "model": model.name,
        "solver": req.solver,
        "params": req.params,
        "logs_url": f"/api/cad/sim/logs/{job_id}",
        "results_url": f"/api/cad/sim/results/{job_id}",
        "note": "Real solver required: OpenFOAM, CalculiX, or vendor API. Job runs in background worker with auth and audit.",
    }


@router.get("/{model_id}")
def get_cad(model_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    model = db.query(CADModel).filter(CADModel.id == model_id).first()
    if not model:
        raise HTTPException(404, "Not found")
    return model
