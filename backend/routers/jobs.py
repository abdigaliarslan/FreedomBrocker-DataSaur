from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
import math

from database import get_db
from models import User, Company, Job
from schemas import Job as JobSchema, JobCreate, JobUpdate, JobSearch, JobListResponse
from auth import get_current_employer, get_current_active_user

router = APIRouter()


@router.post("/", response_model=JobSchema)
async def create_job(
    job: JobCreate,
    current_user: User = Depends(get_current_employer),
    db: Session = Depends(get_db)
):
    """Создание вакансии"""
    # Получаем компанию пользователя
    company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=400, detail="You need to create a company first")
    
    db_job = Job(**job.dict(), company_id=company.id)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job


@router.get("/search", response_model=JobListResponse)
async def search_jobs(
    query: Optional[str] = Query(None, description="Поисковый запрос"),
    location: Optional[str] = Query(None, description="Местоположение"),
    employment_type: Optional[str] = Query(None, description="Тип занятости"),
    experience_level: Optional[str] = Query(None, description="Уровень опыта"),
    salary_min: Optional[int] = Query(None, description="Минимальная зарплата"),
    salary_max: Optional[int] = Query(None, description="Максимальная зарплата"),
    remote_work: Optional[bool] = Query(None, description="Удаленная работа"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(20, ge=1, le=100, description="Количество на странице"),
    db: Session = Depends(get_db)
):
    """Поиск вакансий с фильтрацией"""
    query_filter = db.query(Job).filter(Job.is_active == True)
    
    # Текстовый поиск
    if query:
        query_filter = query_filter.filter(
            or_(
                Job.title.ilike(f"%{query}%"),
                Job.description.ilike(f"%{query}%"),
                Job.requirements.ilike(f"%{query}%")
            )
        )
    
    # Фильтры
    if location:
        query_filter = query_filter.filter(Job.location.ilike(f"%{location}%"))
    
    if employment_type:
        query_filter = query_filter.filter(Job.employment_type == employment_type)
    
    if experience_level:
        query_filter = query_filter.filter(Job.experience_level == experience_level)
    
    if salary_min:
        query_filter = query_filter.filter(Job.salary_min >= salary_min)
    
    if salary_max:
        query_filter = query_filter.filter(Job.salary_max <= salary_max)
    
    if remote_work is not None:
        query_filter = query_filter.filter(Job.remote_work == remote_work)
    
    # Подсчет общего количества
    total = query_filter.count()
    
    # Пагинация
    offset = (page - 1) * limit
    jobs = query_filter.offset(offset).limit(limit).all()
    
    total_pages = math.ceil(total / limit)
    
    return JobListResponse(
        jobs=jobs,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get("/my", response_model=List[JobSchema])
async def read_my_jobs(
    current_user: User = Depends(get_current_employer),
    db: Session = Depends(get_db)
):
    """Получение вакансий текущего работодателя"""
    company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if not company:
        return []
    
    jobs = db.query(Job).filter(Job.company_id == company.id).all()
    return jobs


@router.get("/{job_id}", response_model=JobSchema)
async def read_job(job_id: int, db: Session = Depends(get_db)):
    """Получение вакансии по ID"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Увеличиваем счетчик просмотров
    job.views_count += 1
    db.commit()
    
    return job


@router.put("/{job_id}", response_model=JobSchema)
async def update_job(
    job_id: int,
    job_update: JobUpdate,
    current_user: User = Depends(get_current_employer),
    db: Session = Depends(get_db)
):
    """Обновление вакансии"""
    company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Company not found")
    
    job = db.query(Job).filter(
        and_(Job.id == job_id, Job.company_id == company.id)
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = job_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)
    
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_employer),
    db: Session = Depends(get_db)
):
    """Удаление вакансии"""
    company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Company not found")
    
    job = db.query(Job).filter(
        and_(Job.id == job_id, Job.company_id == company.id)
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}