from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import models
from database import get_db
from auth import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, get_password_hash
from datetime import timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    email: Optional[str] = None
    role: str
    department: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None

@router.post("/token")
def login_for_access_token(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    
    # Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        samesite="lax", # Change to "none" and secure=True in production if cross-origin
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "username": user.username}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")
    return {"message": "Logged out successfully"}

@router.get("/users")
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    
    users = db.query(models.User).all()
    # Remove hashed passwords from response
    return [{"id": u.id, "username": u.username, "name": u.name, "email": u.email, "role": u.role, "department": u.department} for u in users]

@router.post("/users")
def create_user(user_data: UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
        
    existing = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
        
    hashed_password = get_password_hash(user_data.password)
    new_user = models.User(
        username=user_data.username,
        hashed_password=hashed_password,
        name=user_data.name,
        email=user_data.email,
        role=user_data.role,
        department=user_data.department
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "id": new_user.id}

@router.put("/users/{user_id}")
def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_data.username is not None:
        # Check if username exists elsewhere
        other = db.query(models.User).filter(models.User.username == user_data.username, models.User.id != user_id).first()
        if other:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = user_data.username
    
    if user_data.password is not None:
        user.hashed_password = get_password_hash(user_data.password)
    
    if user_data.name is not None:
        user.name = user_data.name
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.role is not None:
        user.role = user_data.role
    if user_data.department is not None:
        user.department = user_data.department
        
    db.commit()
    return {"message": "User updated successfully"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/me")
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "role": current_user.role, "department": current_user.department}

# --- Role Permissions Management ---

class PermissionUpdate(BaseModel):
    allowed_modules: list[str]

@router.get("/permissions")
def list_permissions(db: Session = Depends(get_db)):
    """Get all role permissions. Publicly accessible for client-side routing, or can be restricted."""
    import json
    perms = db.query(models.RolePermission).all()
    result = []
    for p in perms:
        try:
            modules = json.loads(p.allowed_modules)
        except:
            modules = []
        result.append({"role": p.role, "allowed_modules": modules})
    return result

@router.put("/permissions/{role_name}")
def update_permission(role_name: str, payload: PermissionUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Update allowed modules for a specific role. Admin only."""
    import json
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
        
    perm = db.query(models.RolePermission).filter(models.RolePermission.role == role_name).first()
    if not perm:
        # Create it if it doesn't exist yet
        perm = models.RolePermission(role=role_name, allowed_modules="[]")
        db.add(perm)
        
    perm.allowed_modules = json.dumps(payload.allowed_modules)
    db.commit()
    return {"message": "Permissions updated successfully"}
