from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import os
import shutil
import random
import string

from database import get_db
import models
from auth import get_current_user

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "requirements")
os.makedirs(UPLOAD_DIR, exist_ok=True)

DESIGN_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "designs")
os.makedirs(DESIGN_UPLOAD_DIR, exist_ok=True)

QC_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "qc")
os.makedirs(QC_DIR, exist_ok=True)

router = APIRouter(
    prefix="/api/sales",
    tags=["Sales Management"],
    dependencies=[Depends(get_current_user)]
)

# --- Schemas ---
class CustomerBase(BaseModel):
    customer_code: str
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    orders: Optional[list] = []
    class Config:
        orm_mode = True

class DeleteCustomerRequest(BaseModel):
    customer_code: str

class CustomerUpdate(BaseModel):
    customer_code: Optional[str] = None
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class SalesOrderBase(BaseModel):
    order_id: str
    customer_name: str
    customer_code: Optional[str] = None
    transformer_model: str
    model_name: Optional[str] = None
    quantity: int
    status: str = "pending"
    deadline_date: Optional[datetime] = None
    requirement_file: Optional[str] = None
    design_file: Optional[str] = None
    qc_b1_file: Optional[str] = None
    qc_b2_file: Optional[str] = None
    qc_kcs_file: Optional[str] = None
    qc_nghiem_thu_file: Optional[str] = None
    qc_xuat_xuong_file: Optional[str] = None

class SalesOrderCreate(SalesOrderBase):
    order_date: datetime
    deadline_date: datetime

class SalesOrderUpdate(BaseModel):
    order_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_code: Optional[str] = None
    transformer_model: Optional[str] = None
    model_name: Optional[str] = None
    quantity: Optional[int] = None
    order_date: Optional[datetime] = None
    deadline_date: Optional[datetime] = None
    status: Optional[str] = None

class SalesOrderResponse(SalesOrderBase):
    id: int
    order_date: datetime
    class Config:
        orm_mode = True

# --- Customer Endpoints ---
@router.get("/customers")
def get_customers(db: Session = Depends(get_db)):
    """Retrieve all customers with their associated order IDs."""
    customers = db.query(models.Customer).all()
    result = []
    for c in customers:
        # Find all orders for this customer by name
        orders = db.query(models.SalesOrder).filter(models.SalesOrder.customer_name == c.name).all()
        order_ids = [o.order_id for o in orders]
        result.append({
            "id": c.id,
            "customer_code": c.customer_code,
            "name": c.name,
            "contact_person": c.contact_person,
            "email": c.email,
            "phone": c.phone,
            "address": c.address,
            "created_at": c.created_at,
            "orders": order_ids
        })
    return result

@router.post("/customers", response_model=CustomerResponse)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer."""
    existing = db.query(models.Customer).filter(models.Customer.customer_code == payload.customer_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer code already exists")
    
    new_customer = models.Customer(**payload.dict())
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

@router.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, payload: DeleteCustomerRequest, db: Session = Depends(get_db)):
    """Delete a customer. Requires typing the customer_code for confirmation."""
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.customer_code != payload.customer_code:
        raise HTTPException(status_code=400, detail="Customer code does not match. Deletion cancelled.")
    db.delete(customer)
    db.commit()
    return {"status": "deleted"}

@router.put("/customers/{customer_id}")
def update_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db)):
    """Edit customer information."""
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    old_name = customer.name
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(customer, key, value)
    
    # If name changed, update all orders referencing the old name
    if payload.name and payload.name != old_name:
        orders = db.query(models.SalesOrder).filter(models.SalesOrder.customer_name == old_name).all()
        for order in orders:
            order.customer_name = payload.name
    
    db.commit()
    return {"status": "updated"}

# --- Quality Control Endpoints ---
@router.post("/orders/{order_id}/qc-docs/{doc_type}")
def upload_qc_document(order_id: str, doc_type: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a QC document (b1, b2, kcs, nghiem_thu, xuat_xuong)."""
    valid_types = ["b1", "b2", "kcs", "nghiem_thu", "xuat_xuong"]
    if doc_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid doc_type")
        
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    safe_filename = f"{order_id}_{doc_type}_{file.filename}"
    file_path = os.path.join(QC_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    setattr(order, f"qc_{doc_type}_file", safe_filename)
    db.commit()
    return {"filename": safe_filename, "doc_type": doc_type}

@router.get("/orders/{order_id}/qc-docs/{doc_type}")
def get_qc_document(order_id: str, doc_type: str, db: Session = Depends(get_db)):
    """Download a QC document."""
    valid_types = ["b1", "b2", "kcs", "nghiem_thu", "xuat_xuong"]
    if doc_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid doc_type")
        
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    filename = getattr(order, f"qc_{doc_type}_file")
    if not filename:
        raise HTTPException(status_code=404, detail="File not found")
        
    file_path = os.path.join(QC_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing from disk")
        
    return FileResponse(file_path, filename=filename)

# --- Sales Order Endpoints ---
@router.get("/orders", response_model=List[SalesOrderResponse])
def get_sales_orders(db: Session = Depends(get_db)):
    """Retrieve all sales orders."""
    return db.query(models.SalesOrder).all()

@router.post("/orders", response_model=SalesOrderResponse)
def create_sales_order(payload: SalesOrderCreate, db: Session = Depends(get_db)):
    """Create a new sales order. Auto-adds the customer if not already in the customer list."""
    existing = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == payload.order_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Order ID already exists")
    
    # Auto-add customer to customer list if not exists
    existing_customer = db.query(models.Customer).filter(models.Customer.name == payload.customer_name).first()
    if not existing_customer:
        if payload.customer_code:
            code = payload.customer_code
        else:
            # Generate random distinct customer code
            while True:
                code = "C-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                if not db.query(models.Customer).filter(models.Customer.customer_code == code).first():
                    break
            payload.customer_code = code
        new_customer = models.Customer(
            customer_code=code,
            name=payload.customer_name
        )
        db.add(new_customer)
        db.commit()
    else:
        # If customer already exists, optionally update their code or ensure the payload has the code
        if not payload.customer_code:
            payload.customer_code = existing_customer.customer_code
    
    new_order = models.SalesOrder(**payload.dict())
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order

@router.put("/orders/{order_id}", response_model=SalesOrderResponse)
def update_sales_order(order_id: str, payload: SalesOrderUpdate, db: Session = Depends(get_db)):
    """Edit an existing sales order. Changes are saved instantly."""
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(order, key, value)
    db.commit()
    db.refresh(order)
    return order

@router.post("/orders/{order_id}/upload-requirement")
def upload_requirement(order_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a requirement file for a sales order."""
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    safe_filename = f"{order_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    order.requirement_file = safe_filename
    db.commit()
    return {"filename": safe_filename}

class StatusUpdate(BaseModel):
    status: str

@router.put("/orders/{order_id}/status")
def update_order_status(order_id: str, payload: StatusUpdate, db: Session = Depends(get_db)):
    """Update the status of a sales order (e.g., pending → in_production)."""
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status
    db.commit()
    return {"status": "updated"}

@router.delete("/orders/{order_id}")
def delete_sales_order(order_id: str, db: Session = Depends(get_db)):
    """Delete a sales order and all its cascading dependencies."""
    # Find the order
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 1. Find all related ProductionJobs
    jobs = db.query(models.ProductionJob).filter(models.ProductionJob.sales_order_id == order_id).all()
    job_ids = [j.id for j in jobs]
    job_codes = [j.job_id for j in jobs] # string IDs used in some tables

    # 2. Delete from cascading tables using job IDs
    if job_ids:
        # Delete progress
        db.query(models.ProductionProgress).filter(models.ProductionProgress.job_id.in_(job_ids)).delete(synchronize_session=False)

    if job_codes:
        # Delete material requests, finished goods, worker logs
        db.query(models.MaterialIssueRequest).filter(models.MaterialIssueRequest.job_id.in_(job_codes)).delete(synchronize_session=False)
        db.query(models.FinishedGoodsReceipt).filter(models.FinishedGoodsReceipt.job_id.in_(job_codes)).delete(synchronize_session=False)
        db.query(models.WorkerLog).filter(models.WorkerLog.job_id.in_(job_codes)).delete(synchronize_session=False)

    # 3. Delete the BOM entries if no other orders use this transformer model
    if order.transformer_model:
        other_orders_with_model = db.query(models.SalesOrder).filter(
            models.SalesOrder.transformer_model == order.transformer_model,
            models.SalesOrder.order_id != order_id
        ).count()
        if other_orders_with_model == 0:
            db.query(models.BillOfMaterial).filter(
                models.BillOfMaterial.transformer_model == order.transformer_model
            ).delete(synchronize_session=False)

    # 4. Delete the ProductionJobs
    db.query(models.ProductionJob).filter(models.ProductionJob.sales_order_id == order_id).delete(synchronize_session=False)

    # 5. Clean up files on disk
    # Requirement file
    if order.requirement_file:
        req_path = os.path.join(UPLOAD_DIR, order.requirement_file)
        if os.path.exists(req_path):
            try:
                os.remove(req_path)
            except Exception as e:
                print(f"Error removing requirement file: {e}")

    # Design files (directory)
    order_design_dir = os.path.join(DESIGN_UPLOAD_DIR, order_id)
    if os.path.exists(order_design_dir):
        try:
            shutil.rmtree(order_design_dir)
        except Exception as e:
            print(f"Error removing design directory: {e}")

    # 6. Delete the SalesOrder
    db.delete(order)
    db.commit()
    
    return {"status": "deleted", "order_id": order_id}

@router.post("/orders/{order_id}/upload-design")
def upload_design(order_id: str, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    """Upload multiple design files for a sales order. Appends to existing files."""
    import json
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Load existing files list
    existing_files = []
    if order.design_file:
        try:
            existing_files = json.loads(order.design_file)
        except (json.JSONDecodeError, TypeError):
            # Legacy single file — wrap it
            if order.design_file:
                existing_files = [order.design_file]
    
    # Create order-specific subfolder
    order_dir = os.path.join(DESIGN_UPLOAD_DIR, order_id)
    os.makedirs(order_dir, exist_ok=True)
    
    uploaded = []
    for f in files:
        safe_name = f.filename.replace("/", "_").replace("\\", "_")
        file_path = os.path.join(order_dir, safe_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)
        if safe_name not in existing_files:
            existing_files.append(safe_name)
        uploaded.append(safe_name)
    
    order.design_file = json.dumps(existing_files)
    db.commit()
    return {"uploaded": uploaded, "total_files": len(existing_files)}

@router.get("/orders/{order_id}/design-files")
def list_design_files(order_id: str, db: Session = Depends(get_db)):
    """List all design files for an order."""
    import json
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order.design_file:
        return {"files": []}
    try:
        files = json.loads(order.design_file)
    except (json.JSONDecodeError, TypeError):
        files = [order.design_file] if order.design_file else []
    return {"files": files}

@router.get("/orders/{order_id}/download-design/{filename}")
def download_design(order_id: str, filename: str, db: Session = Depends(get_db)):
    """Download a specific design file for a sales order."""
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    file_path = os.path.join(DESIGN_UPLOAD_DIR, order_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Design file not found on disk")
    
    return FileResponse(file_path, filename=filename)

@router.delete("/orders/{order_id}/design-file/{filename}")
def delete_design_file(order_id: str, filename: str, db: Session = Depends(get_db)):
    """Delete a specific design file from an order."""
    import json
    order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Remove from disk
    file_path = os.path.join(DESIGN_UPLOAD_DIR, order_id, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from JSON list
    files = []
    if order.design_file:
        try:
            files = json.loads(order.design_file)
        except (json.JSONDecodeError, TypeError):
            files = [order.design_file] if order.design_file else []
    files = [f for f in files if f != filename]
    order.design_file = json.dumps(files) if files else None
    db.commit()
    return {"status": "deleted", "remaining_files": len(files)}
