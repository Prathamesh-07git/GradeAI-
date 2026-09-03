from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import User, StudentProfile
from backend.app.schemas.schemas import StudentProfileCreate, StudentProfileOut, UserOut
from backend.app.utils.security import get_current_user

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)

@router.get("", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # UserOut already includes the profile relationship because of SQLAlchemy relationship
    return current_user

@router.put("", response_model=StudentProfileOut)
def update_profile(
    profile_data: StudentProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if not profile:
        profile = StudentProfile(user_id=current_user.id)
        db.add(profile)
    
    # Update fields
    if profile_data.student_id_number is not None:
        profile.student_id_number = profile_data.student_id_number
    if profile_data.major is not None:
        profile.major = profile_data.major
    if profile_data.year is not None:
        profile.year = profile_data.year
    if profile_data.bio is not None:
        profile.bio = profile_data.bio
        
    db.commit()
    db.refresh(profile)
    return profile
