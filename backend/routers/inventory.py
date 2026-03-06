from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import pandas as pd
import io

from database import get_db
import models
from auth import get_current_user

router = APIRouter(
    prefix="/api/inventory",
    tags=["Inventory Management"],
    dependencies=[Depends(get_current_user)]
)

# --- Schemas ---
class MaterialBase(BaseModel):
    material_code: str
    name: str
    description: Optional[str] = None
    unit: str
    stock_quantity: float = 0.0

class MaterialCreate(MaterialBase):
    pass

class MaterialResponse(MaterialBase):
    id: int
    class Config:
        orm_mode = True

class EquipmentBase(BaseModel):
    equipment_code: str
    name: str
    stage: str
    status: str = "active"
    capacity_per_hour: Optional[float] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentResponse(EquipmentBase):
    id: int
    class Config:
        orm_mode = True

# --- Endpoints ---
@router.get("/materials", response_model=List[MaterialResponse])
def get_materials(db: Session = Depends(get_db)):
    """Retrieve all raw materials."""
    return db.query(models.Material).all()

@router.post("/materials", response_model=MaterialResponse)
def create_material(payload: MaterialCreate, db: Session = Depends(get_db)):
    """Create a new raw material."""
    existing = db.query(models.Material).filter(models.Material.material_code == payload.material_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Material code already exists")
    
    new_material = models.Material(**payload.dict())
    db.add(new_material)
    db.commit()
    db.refresh(new_material)
    return new_material

@router.get("/equipment", response_model=List[EquipmentResponse])
def get_equipment(db: Session = Depends(get_db)):
    """Retrieve all equipment."""
    return db.query(models.Equipment).all()

@router.post("/equipment", response_model=EquipmentResponse)
def create_equipment(payload: EquipmentCreate, db: Session = Depends(get_db)):
    """Create a new equipment entry."""
    existing = db.query(models.Equipment).filter(models.Equipment.equipment_code == payload.equipment_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Equipment code already exists")
    
    new_equipment = models.Equipment(**payload.dict())
    db.add(new_equipment)
    db.commit()
    db.refresh(new_equipment)
    return new_equipment

# --- BOM Schemas ---
class BomBase(BaseModel):
    transformer_model: str
    stt: int
    material_name: str
    specification: Optional[str] = None
    unit: str
    dinh_muc: float = 0.0
    thuc_linh: float = 0.0
    chenh_lech: float = 0.0
    note: Optional[str] = None

class BomCreate(BomBase):
    pass

class BomResponse(BomBase):
    id: int
    class Config:
        orm_mode = True

# --- BOM Endpoints ---
@router.get("/bom", response_model=List[BomResponse])
def get_all_bom(transformer_model: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve BOM entries, optionally filtered by transformer model."""
    query = db.query(models.BillOfMaterial)
    if transformer_model:
        query = query.filter(models.BillOfMaterial.transformer_model == transformer_model)
    return query.order_by(models.BillOfMaterial.stt).all()

@router.post("/bom", response_model=BomResponse)
def create_bom_entry(payload: BomCreate, db: Session = Depends(get_db)):
    """Create a new BOM entry."""
    new_bom = models.BillOfMaterial(**payload.dict())
    db.add(new_bom)
    db.commit()
    db.refresh(new_bom)
    return new_bom

@router.get("/bom/{transformer_model}", response_model=List[BomResponse])
def get_bom_by_model(transformer_model: str, db: Session = Depends(get_db)):
    """Retrieve BOM for a specific transformer model."""
    return db.query(models.BillOfMaterial).filter(
        models.BillOfMaterial.transformer_model == transformer_model
    ).order_by(models.BillOfMaterial.stt).all()

@router.post("/bom/upload")
async def upload_bom_excel(
    transformer_model: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload an Excel/CSV file to bulk create BOM entries for a transformer model."""
    if not file.filename.endswith(('.xlsx', '.csv', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload Excel or CSV.")
    
    contents = await file.read()
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        # Clean dataframe headers (trim space, lowercase to find mapping)
        cols = {str(c).strip().lower(): str(c) for c in df.columns}
        
        # Expected column mappings (flexible names)
        stt_col = next((c for k, c in cols.items() if 'stt' in k), None)
        name_col = next((c for k, c in cols.items() if 'tên vật tư' in k or 'vật tư' in k or 'name' in k), None)
        spec_col = next((c for k, c in cols.items() if 'quy cách' in k or 'spec' in k), None)
        unit_col = next((c for k, c in cols.items() if 'đvt' in k or 'đơn vị' in k or 'unit' in k), None)
        dinh_muc_col = next((c for k, c in cols.items() if 'định mức' in k or 'dinh muc' in k), None)
        thuc_linh_col = next((c for k, c in cols.items() if 'thực lĩnh' in k or 'thuc linh' in k), None)
        note_col = next((c for k, c in cols.items() if 'ghi chú' in k or 'note' in k), None)
        
        if not name_col or not unit_col:
            raise ValueError("Excel file must contain 'Tên vật tư' and 'ĐVT' columns.")
            
        success_count = 0
        df = df.fillna('')
        
        # Optionally, delete existing BOM for this model before uploading full new ones? Let's just append for now, 
        # but recalculate STT dynamically if missing
        existing_bom_count = db.query(models.BillOfMaterial).filter(models.BillOfMaterial.transformer_model == transformer_model).count()
        import numpy as np

        for index, row in df.iterrows():
            if not row[name_col]: 
                continue # Skip empty rows
                
            stt = int(row[stt_col]) if stt_col and row[stt_col] else existing_bom_count + success_count + 1
            
            # Helper to parse floats safely
            def safe_float(val):
                try: return float(val)
                except: return 0.0

            dinh_muc = safe_float(row[dinh_muc_col]) if dinh_muc_col else 0.0
            thuc_linh = safe_float(row[thuc_linh_col]) if thuc_linh_col else 0.0
            
            new_bom = models.BillOfMaterial(
                transformer_model=transformer_model,
                stt=stt,
                material_name=str(row[name_col]),
                specification=str(row[spec_col]) if spec_col else None,
                unit=str(row[unit_col]),
                dinh_muc=dinh_muc,
                thuc_linh=thuc_linh,
                chenh_lech=dinh_muc - thuc_linh,
                note=str(row[note_col]) if note_col else None
            )
            db.add(new_bom)
            success_count += 1
            
        db.commit()
        return {"message": f"Successfully uploaded {success_count} BOM entries.", "count": success_count}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
