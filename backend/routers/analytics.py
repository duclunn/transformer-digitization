from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
import models
from auth import get_current_user

router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics Dashboard"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)):
    """Retrieve high-level KPIs for the dashboard."""
    
    total_customers = db.query(models.Customer).count()
    active_jobs = db.query(models.ProductionJob).filter(models.ProductionJob.status.in_(["not_started", "in_progress"])).count()
    completed_jobs = db.query(models.ProductionJob).filter(models.ProductionJob.status == "completed").count()
    
    # Equipment status breakdown
    equipment_stats = db.query(
        models.Equipment.status, 
        func.count(models.Equipment.id)
    ).group_by(models.Equipment.status).all()
    
    eq_dict = {status: count for status, count in equipment_stats}

    return {
        "total_customers": total_customers,
        "active_jobs": active_jobs,
        "completed_jobs": completed_jobs,
        "equipment": eq_dict
    }

@router.get("/throughput")
def get_historical_throughput(db: Session = Depends(get_db)):
    """Mock endpoint for charting completed jobs over the last few months.
    In a real system, you'd group by `completion_date`.
    """
    # Returning mock data for the charting library demonstration based on typical MES views
    return [
        {"month": "Jan", "completed": 12, "target": 15},
        {"month": "Feb", "completed": 19, "target": 15},
        {"month": "Mar", "completed": 22, "target": 20},
        {"month": "Apr", "completed": 15, "target": 20},
        {"month": "May", "completed": 28, "target": 25},
        {"month": "Jun", "completed": 24, "target": 25},
    ]
