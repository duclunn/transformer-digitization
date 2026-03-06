from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine, SessionLocal
from routers import auth, production, sales, inventory, analytics, process
from auth import get_password_hash, verify_password

models.Base.metadata.create_all(bind=engine)

# Migrate: add missing columns to existing databases
import sqlite3
_db_path = engine.url.database
if _db_path:
    # We rely on create_all for new tables, but we can do an explicit check if needed.
    # The models.Base.metadata.create_all(bind=engine) will create role_permissions.
    _conn = sqlite3.connect(_db_path)
    _cursor = _conn.cursor()
    # Check and add columns to sales_orders
    _cursor.execute("PRAGMA table_info(sales_orders)")
    _cols = [row[1] for row in _cursor.fetchall()]
    if "design_file" not in _cols:
        _cursor.execute("ALTER TABLE sales_orders ADD COLUMN design_file TEXT")
        print("Migration: added design_file column to sales_orders")
    if "customer_code" not in _cols:
        _cursor.execute("ALTER TABLE sales_orders ADD COLUMN customer_code VARCHAR(50)")
        print("Migration: added customer_code to sales_orders")
    if "model_name" not in _cols:
        _cursor.execute("ALTER TABLE sales_orders ADD COLUMN model_name VARCHAR(255)")
        print("Migration: added model_name to sales_orders")

    # Check and add columns to users
    _cursor.execute("PRAGMA table_info(users)")
    _user_cols = [row[1] for row in _cursor.fetchall()]
    if "last_active_at" not in _user_cols:
        _cursor.execute("ALTER TABLE users ADD COLUMN last_active_at DATETIME")
        print("Migration: added last_active_at to users")

    # Check and add columns to materials
    # materials might not exist yet if the server never started, but PRAGMA won't fail
    _cursor.execute("PRAGMA table_info(materials)")
    _mat_cols = [row[1] for row in _cursor.fetchall()]
    if _mat_cols:
        if "old_code" not in _mat_cols:
            _cursor.execute("ALTER TABLE materials ADD COLUMN old_code VARCHAR(100)")
            print("Migration: added old_code to materials")
        if "material_type" not in _mat_cols:
            _cursor.execute("ALTER TABLE materials ADD COLUMN material_type VARCHAR(100)")
            print("Migration: added material_type to materials")

    _conn.commit()
    _conn.close()

app = FastAPI(title="Transformer Production Digitization API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*", # Bounces back exact Origin to satisfy browser credential requirements
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(production.router)
app.include_router(sales.router)
app.include_router(inventory.router)
app.include_router(analytics.router)
app.include_router(process.router)

@app.on_event("startup")
def create_default_admin():
    db = SessionLocal()
    try:
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            print("Creating default admin user...")
            hashed_pw = get_password_hash("213")
            new_admin = models.User(
                id=0,
                username="admin",
                name="On Minh Duc",
                email="ducom@havec.vn", 
                hashed_password=hashed_pw, 
                role="admin", 
                department="Management"
            )
            db.add(new_admin)
            db.commit()
        else:
            # Update existing admin if properties don't match
            needs_update = False
            if admin_user.name != "On Minh Duc" or admin_user.email != "ducom@havec.vn":
                admin_user.name = "On Minh Duc"
                admin_user.email = "ducom@havec.vn"
                needs_update = True
            
            # Note: We don't easily update password here without checking if it's "213" unhashed. 
            # If we want to force the password to "213", we can just do it or update it if it fails.
            # To be safe and ensure the password is 213 as requested:
            if not verify_password("213", admin_user.hashed_password):
                admin_user.hashed_password = get_password_hash("213")
                needs_update = True
            
            if needs_update:
                print("Updating existing admin user...")
                db.commit()

        # Seed a test production job if none exist
        job = db.query(models.ProductionJob).first()
        if not job:
            new_job = models.ProductionJob(
                job_id="JOB-2026-001",
                transformer_model="Transformer 500kVA",
                status="not_started"
            )
            db.add(new_job)
            db.commit()

        # Seed test accounts for roles
        test_accounts = [
            {"username": "sales1", "name": "Nhân viên Sales", "email": "sales1@havec.vn", "role": "sales", "department": "Sales"},
            {"username": "prod1",  "name": "Nhân viên SX",    "email": "prod1@havec.vn",  "role": "production", "department": "Production"},
            {"username": "plan1",  "name": "Nhân viên KH",    "email": "plan1@havec.vn",  "role": "planning", "department": "Planning"},
            {"username": "tech1",  "name": "Nhân viên KC",    "email": "tech1@havec.vn",  "role": "technical", "department": "Technical"},
        ]
        for acct in test_accounts:
            existing = db.query(models.User).filter(models.User.username == acct["username"]).first()
            if not existing:
                print(f"Creating test user: {acct['username']}")
                new_user = models.User(
                    username=acct["username"],
                    name=acct["name"],
                    email=acct["email"],
                    hashed_password=get_password_hash("213"),
                    role=acct["role"],
                    department=acct["department"]
                )
                db.add(new_user)
            db.commit()

        # Seed Default Role Permissions
        import json
        default_permissions = {
            "admin": ["Dashboard & Thống kê", "QL Thông tin sản xuất", "Quản lý bán hàng", "Quản lý sản xuất", "Sản xuất (MES)", "Truy xuất nguồn gốc", "Quản trị hệ thống"],
            "sales": ["Dashboard & Thống kê", "Quản lý bán hàng", "Truy xuất nguồn gốc"],
            "production": ["Sản xuất (MES)", "Truy xuất nguồn gốc"],
            "technical": ["Dashboard & Thống kê", "QL Thông tin sản xuất", "Quản lý sản xuất", "Truy xuất nguồn gốc"],
            "planning": ["Dashboard & Thống kê", "Quản lý sản xuất", "Truy xuất nguồn gốc"]
        }
        
        for role_name, modules in default_permissions.items():
            perm = db.query(models.RolePermission).filter(models.RolePermission.role == role_name).first()
            if not perm:
                print(f"Seeding default permissions for role: {role_name}")
                new_perm = models.RolePermission(
                    role=role_name,
                    allowed_modules=json.dumps(modules)
                )
                db.add(new_perm)
        db.commit()


    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to the Transformer Production Digitization API"}
