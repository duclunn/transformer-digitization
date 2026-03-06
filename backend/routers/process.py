from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json

from database import get_db
import models
from auth import get_current_user

router = APIRouter(
    prefix="/api/process",
    tags=["Process Management"],
    dependencies=[Depends(get_current_user)]
)

# --- Schemas ---
class NodeSchema(BaseModel):
    id: str
    label: str
    x: float
    y: float

class EdgeSchema(BaseModel):
    source: str
    target: str

class ProcessTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    nodes: List[NodeSchema] = []
    edges: List[EdgeSchema] = []

class ProcessTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    nodes: list
    edges: list
    created_at: datetime
    updated_at: datetime

class ProcessTemplateUpdate(BaseModel):
    nodes: List[NodeSchema]
    edges: List[EdgeSchema]

# --- Endpoints ---
@router.get("/templates", response_model=List[ProcessTemplateResponse])
def get_templates(db: Session = Depends(get_db)):
    templates = db.query(models.ProcessTemplate).all()
    result = []
    for t in templates:
        result.append({
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "nodes": json.loads(t.nodes_json) if t.nodes_json else [],
            "edges": json.loads(t.edges_json) if t.edges_json else [],
            "created_at": t.created_at,
            "updated_at": t.updated_at
        })
    return result

@router.post("/templates")
def create_template(payload: ProcessTemplateCreate, db: Session = Depends(get_db)):
    existing = db.query(models.ProcessTemplate).filter(models.ProcessTemplate.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template name already exists")
    
    new_template = models.ProcessTemplate(
        name=payload.name,
        description=payload.description,
        nodes_json=json.dumps([n.dict() for n in payload.nodes]),
        edges_json=json.dumps([e.dict() for e in payload.edges])
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return {"id": new_template.id, "name": new_template.name}

@router.put("/templates/{template_id}")
def update_template(template_id: int, payload: ProcessTemplateUpdate, db: Session = Depends(get_db)):
    template = db.query(models.ProcessTemplate).filter(models.ProcessTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.nodes_json = json.dumps([n.dict() for n in payload.nodes])
    template.edges_json = json.dumps([e.dict() for e in payload.edges])
    db.commit()
    return {"status": "updated"}

@router.get("/templates/{template_id}")
def get_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(models.ProcessTemplate).filter(models.ProcessTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return {
        "id": template.id,
        "name": template.name,
        "description": template.description,
        "nodes": json.loads(template.nodes_json) if template.nodes_json else [],
        "edges": json.loads(template.edges_json) if template.edges_json else [],
        "created_at": template.created_at,
        "updated_at": template.updated_at,
    }
