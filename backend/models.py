from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(100))
    role = Column(String(50)) # e.g., 'admin', 'sales', 'production', 'planning', 'technical'
    department = Column(String(50))

class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(50), unique=True, index=True)
    allowed_modules = Column(Text, default='[]') # JSON array of allowed module titles

class ExcelUploadLog(Base):
    __tablename__ = "excel_upload_logs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255))
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    department = Column(String(50))
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50)) # 'success', 'failed', 'partial'
    error_message = Column(Text, nullable=True)

    uploader = relationship("User")

# Placeholder schemas for departments based on typical operations
class SalesOrder(Base):
    __tablename__ = "sales_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(100), unique=True, index=True)
    customer_name = Column(String(255))
    transformer_model = Column(String(100))
    quantity = Column(Integer)
    status = Column(String(50)) # 'pending', 'in_production', 'delivered'
    order_date = Column(DateTime)
    deadline_date = Column(DateTime, nullable=True) # Added deadline date
    requirement_file = Column(String(500), nullable=True) # Uploaded requirement file path
    design_file = Column(String(500), nullable=True) # Uploaded design PDF file path
    upload_log_id = Column(Integer, ForeignKey("excel_upload_logs.id"))

class ProductionJob(Base):
    __tablename__ = "production_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(100), unique=True, index=True)
    sales_order_id = Column(String(100), ForeignKey("sales_orders.order_id"), nullable=True)
    transformer_model = Column(String(100))
    status = Column(String(50)) # 'not_started', 'winding', 'assembly', 'testing', 'completed'
    start_date = Column(DateTime, nullable=True) # Added start date for Gantt
    end_date = Column(DateTime, nullable=True) # Added end date for Gantt
    completion_date = Column(DateTime, nullable=True)
    upload_log_id = Column(Integer, ForeignKey("excel_upload_logs.id"))

    # Relationship to progress tracking
    progress = relationship("ProductionProgress", back_populates="job", uselist=False, cascade="all, delete-orphan")

class ProductionProgress(Base):
    __tablename__ = "production_progress"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("production_jobs.id"), unique=True)
    
    # Sequential and parallel steps (timestamps of completion)
    cat_ton_at = Column(DateTime, nullable=True)
    ghep_ton_at = Column(DateTime, nullable=True)
    quet_epoxy_at = Column(DateTime, nullable=True)
    lap_sat_kep_at = Column(DateTime, nullable=True)
    
    lam_chi_tiet_cach_dien_at = Column(DateTime, nullable=True)
    cuon_day_at = Column(DateTime, nullable=True)
    
    lap_rap_at = Column(DateTime, nullable=True)
    lam_dau_ra_at = Column(DateTime, nullable=True)
    say_ruot_may_at = Column(DateTime, nullable=True)
    lap_rap_may_at = Column(DateTime, nullable=True)
    hut_chan_khong_tra_dau_at = Column(DateTime, nullable=True)
    kiem_tra_kin_dau_at = Column(DateTime, nullable=True)

    job = relationship("ProductionJob", back_populates="progress")

# --- MESCore Expanded Models --- #

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String(50), unique=True, index=True)
    name = Column(String(255))
    contact_person = Column(String(100))
    email = Column(String(100))
    phone = Column(String(50))
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    material_code = Column(String(100), unique=True, index=True)
    name = Column(String(255))
    description = Column(Text, nullable=True)
    unit = Column(String(50)) # e.g., kg, unit, liter
    stock_quantity = Column(Float, default=0.0)

class BillOfMaterial(Base):
    __tablename__ = "bill_of_materials"
    
    id = Column(Integer, primary_key=True, index=True)
    transformer_model = Column(String(100), index=True)  # Links to product
    stt = Column(Integer)                                 # STT
    material_name = Column(String(255))                    # Tên vật tư
    specification = Column(String(255), nullable=True)     # Quy cách
    unit = Column(String(50))                              # Đơn vị tính
    dinh_muc = Column(Float, default=0.0)                  # Định mức (variable per order)
    thuc_linh = Column(Float, default=0.0)                 # Thực lĩnh
    chenh_lech = Column(Float, default=0.0)                # Chênh lệch
    note = Column(Text, nullable=True)                     # Ghi chú

class ProcessTemplate(Base):
    __tablename__ = "process_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    description = Column(Text, nullable=True)
    nodes_json = Column(Text, default='[]')    # JSON array of {id, label, x, y}
    edges_json = Column(Text, default='[]')    # JSON array of {source, target}
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_code = Column(String(100), unique=True, index=True)
    name = Column(String(255))
    stage = Column(String(100)) # Default stage it belongs to
    status = Column(String(50), default="active") # active, maintenance, broken
    capacity_per_hour = Column(Float, nullable=True)

class MaterialIssueRequest(Base):
    __tablename__ = "material_issue_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(100), ForeignKey("production_jobs.job_id"))
    requested_by_id = Column(Integer, ForeignKey("users.id"))
    request_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="pending") # pending, approved, issued, rejected
    
    requester = relationship("User")
    job = relationship("ProductionJob", foreign_keys=[job_id])

class FinishedGoodsReceipt(Base):
    __tablename__ = "finished_goods_receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(100), ForeignKey("production_jobs.job_id"))
    received_by_id = Column(Integer, ForeignKey("users.id"))
    receipt_date = Column(DateTime, default=datetime.datetime.utcnow)
    quantity = Column(Integer)
    status = Column(String(50), default="received")
    
    receiver = relationship("User")
    job = relationship("ProductionJob", foreign_keys=[job_id])

class WorkerLog(Base):
    __tablename__ = "worker_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_id = Column(String(100), ForeignKey("production_jobs.job_id"))
    stage = Column(String(100))
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)
    hours_worked = Column(Float, nullable=True)
    
    worker = relationship("User")
    job = relationship("ProductionJob", foreign_keys=[job_id])
