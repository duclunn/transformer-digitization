from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
import models
from auth import get_current_user

router = APIRouter(
    prefix="/api/production",
    tags=["Production Dashboard"],
    dependencies=[Depends(get_current_user)]
)

# Pydantic schema for response
class ProgressSchema(BaseModel):
    id: int
    job_id: int
    cat_ton_at: Optional[datetime] = None
    ghep_ton_at: Optional[datetime] = None
    quet_epoxy_at: Optional[datetime] = None
    lap_sat_kep_at: Optional[datetime] = None
    lam_chi_tiet_cach_dien_at: Optional[datetime] = None
    cuon_day_at: Optional[datetime] = None
    lap_rap_at: Optional[datetime] = None
    lam_dau_ra_at: Optional[datetime] = None
    say_ruot_may_at: Optional[datetime] = None
    lap_rap_may_at: Optional[datetime] = None
    hut_chan_khong_tra_dau_at: Optional[datetime] = None
    kiem_tra_kin_dau_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class ProductionJobSchema(BaseModel):
    id: int
    job_id: str
    sales_order_id: Optional[str] = None
    transformer_model: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    progress: Optional[ProgressSchema] = None

    class Config:
        orm_mode = True

class UpdateProgressRequest(BaseModel):
    step_key: str
    completed: bool

class UpdateDatesRequest(BaseModel):
    start_date: datetime
    end_date: datetime

class CreateJobRequest(BaseModel):
    job_id: str
    sales_order_id: Optional[str] = None
    transformer_model: str
    status: str = "not_started"

@router.get("/jobs", response_model=List[ProductionJobSchema])
def get_production_jobs(db: Session = Depends(get_db)):
    """Retrieve all production jobs and their current tracking progress."""
    jobs = db.query(models.ProductionJob).order_by(models.ProductionJob.id.desc()).all()
    # Initialize progress rows for jobs that don't have one yet
    for job in jobs:
        if not job.progress:
            new_prog = models.ProductionProgress(job_id=job.id)
            db.add(new_prog)
            db.commit()
            db.refresh(job)
    return jobs

@router.post("/jobs", response_model=ProductionJobSchema)
def create_production_job(payload: CreateJobRequest, db: Session = Depends(get_db)):
    """Create a production job (usually from Planning based on a Sales Order)."""
    existing = db.query(models.ProductionJob).filter(models.ProductionJob.job_id == payload.job_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Job ID already exists")
    
    start_date = datetime.utcnow()
    end_date = None
    if payload.sales_order_id:
        so = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == payload.sales_order_id).first()
        if so and so.deadline_date:
            end_date = so.deadline_date
            
    new_job = models.ProductionJob(
        job_id=payload.job_id,
        sales_order_id=payload.sales_order_id,
        transformer_model=payload.transformer_model,
        status=payload.status,
        start_date=start_date,
        end_date=end_date
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@router.put("/jobs/{job_code}/dates")
def update_job_dates(job_code: str, payload: UpdateDatesRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Update start/end dates for a production job when modified in Gantt chart."""
    job = db.query(models.ProductionJob).filter(models.ProductionJob.job_id == job_code).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.start_date = payload.start_date
    job.end_date = payload.end_date
    db.commit()
    return {"status": "success"}

@router.put("/jobs/{job_id}/progress", response_model=ProgressSchema)
def update_job_progress(job_id: int, payload: UpdateProgressRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Update a specific step in the production flowchart."""
    job = db.query(models.ProductionJob).filter(models.ProductionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    progress = db.query(models.ProductionProgress).filter(models.ProductionProgress.job_id == job_id).first()
    if not progress:
        progress = models.ProductionProgress(job_id=job_id)
        db.add(progress)
        db.commit()
        db.refresh(progress)

    # Valid step keys mapped from flowchart
    valid_keys = [
        "cat_ton_at", "ghep_ton_at", "quet_epoxy_at", "lap_sat_kep_at",
        "lam_chi_tiet_cach_dien_at", "cuon_day_at", "lap_rap_at", "lam_dau_ra_at",
        "say_ruot_may_at", "lap_rap_may_at", "hut_chan_khong_tra_dau_at", "kiem_tra_kin_dau_at"
    ]

    if payload.step_key not in valid_keys:
        raise HTTPException(status_code=400, detail="Invalid step key provided.")

    if payload.completed:
        # Mark as completed
        setattr(progress, payload.step_key, datetime.utcnow())
    else:
        # Revert to pending
        setattr(progress, payload.step_key, None)

    # Check overall status
    job.status = "in_progress"
    # If the last step is done, mark job completed
    if progress.kiem_tra_kin_dau_at:
        job.status = "completed"
        job.completion_date = datetime.utcnow()
        
        # Synchronize with Sales Order
        if job.sales_order_id:
            sales_order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == job.sales_order_id).first()
            if sales_order and sales_order.status != "completed":
                sales_order.status = "completed"
    else:
        job.completion_date = None
        
        # Revert Sales Order status if it was completed
        if job.sales_order_id:
            sales_order = db.query(models.SalesOrder).filter(models.SalesOrder.order_id == job.sales_order_id).first()
            if sales_order and sales_order.status == "completed":
                sales_order.status = "in_production"

    db.commit()
    db.refresh(progress)
    return progress
