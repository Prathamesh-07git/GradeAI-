from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.models.models import User, AuditLog
from backend.app.schemas.schemas import UserCreate, UserOut, UserLogin, Token
from backend.app.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_teacher,
)
import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log action
    audit = AuditLog(
        user_id=new_user.id,
        action="REGISTER",
        target_type="user",
        target_id=new_user.id,
        details=f"User {new_user.email} registered with role {new_user.role}"
    )
    db.add(audit)
    db.commit()

    return new_user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Fetch user
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Log login action
    audit = AuditLog(
        user_id=user.id,
        action="LOGIN",
        target_type="user",
        target_id=user.id,
        details=f"User {user.email} logged in"
    )
    db.add(audit)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/students", response_model=List[UserOut])
def list_students(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.role == "student").order_by(User.name).all()
