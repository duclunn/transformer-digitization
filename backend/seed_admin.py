import os
import sys

# Add the current directory (backend) to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from auth import get_password_hash

db = SessionLocal()
try:
    existing_admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not existing_admin:
        hashed_password = get_password_hash("admin123")
        admin_user = models.User(
            username="admin",
            hashed_password=hashed_password,
            name="System Administrator",
            email="admin@havec.io.vn",
            role="admin",
            department="IT"
        )
        db.add(admin_user)
        db.commit()
        print("Admin user seeded successfully!")
    else:
        print("Admin user already exists.")
except Exception as e:
    print(f"Error seeding admin user: {e}")
finally:
    db.close()
