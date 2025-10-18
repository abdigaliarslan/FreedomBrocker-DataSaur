from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List

from database import get_db
from models import User, Resume, Job, JobApplication
from schemas import (
    Resume as ResumeSchema, 
    ResumeCreate, 
    ResumeUpdate,
    JobApplication as JobApplicationSchema,
    JobApplicationCreate
)
from auth import get_current_job_seeker, get_current_active_user

router = APIRouter()


@router.post("/", response_model=ResumeSchema)
async def create_resume(
    resume: ResumeCreate,
    current_user: User = Depends(get_current_job_seeker),
    db: Session = Depends(get_db)
):
    """Создание резюме"""
    db_resume = Resume(**resume.dict(), user_id=current_user.id)
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.get("/my", response_model=List[ResumeSchema])
async def read_my_resumes(
    current_user: User = Depends(get_current_job_seeker),
    db: Session = Depends(get_db)
):
    """Получение резюме текущего пользователя"""
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()
    return resumes


@router.get("/{resume_id}", response_model=ResumeSchema)
async def read_resume(resume_id: int, db: Session = Depends(get_db)):
    """Получение резюме по ID"""
    resume = db.query(Resume).filter(
        and_(Resume.id == resume_id, Resume.is_public == True)
    ).first()
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.put("/{resume_id}", response_model=ResumeSchema)
async def update_resume(
    resume_id: int,
    resume_update: ResumeUpdate,
    current_user: User = Depends(get_current_job_seeker),
    db: Session = Depends(get_db)
):
    """Обновление резюме"""
    resume = db.query(Resume).filter(
        and_(Resume.id == resume_id, Resume.user_id == current_user.id)
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    update_data = resume_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resume, field, value)
    
    db.commit()
    db.refresh(resume)
    return resume


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_job_seeker),
    db: Session = Depends(get_db)
):
    """Удаление резюме"""
    resume = db.query(Resume).filter(
        and_(Resume.id == resume_id, Resume.user_id == current_user.id)
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    db.delete(resume)
    db.commit()
    return {"message": "Resume deleted successfully"}


@router.post("/applications", response_model=JobApplicationSchema)
async def apply_for_job(
    application: JobApplicationCreate,
    current_user: User = Depends(get_current_job_seeker),
    db: Session = Depends(get_db)
):
    """Отклик на вакансию"""
    # Проверяем существование вакансии
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Проверяем существование резюме и принадлежность пользователю
    resume = db.query(Resume).filter(
        and_(Resume.id == application.resume_id, Resume.user_id == current_user.id)
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Проверяем, не подавал ли уже пользователь заявку на эту вакансию
    existing_application = db.query(JobApplication).filter(
        and_(
            JobApplication.user_id == current_user.id,
            JobApplication.job_id == application.job_id
        )
    ).first()
    if existing_application:
        raise HTTPException(status_code=400, detail="You have already applied for this job")
    
    db_application = JobApplication(
        **application.dict(),
        user_id=current_user.id
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application


@router.get("/applications/my", response_model=List[JobApplicationSchema])
async def read_my_applications(
    current_user: User = Depends(get_current_job_seeker),
    db: Session = Depends(get_db)
):
    """Получение откликов текущего пользователя"""
    applications = db.query(JobApplication).filter(
        JobApplication.user_id == current_user.id
    ).all()
    return applications