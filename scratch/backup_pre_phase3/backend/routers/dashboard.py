from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from services.dashboard import DashboardService
from dependencies.auth import get_current_user
from models.user import User

router = APIRouter()

@router.get("/")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        user_id = current_user.id
        data = DashboardService.get_dashboard_data(db, user_id)
        return data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while loading the dashboard."
        )
