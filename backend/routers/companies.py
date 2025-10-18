from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Company
from schemas import Company as CompanySchema, CompanyCreate, CompanyUpdate
from auth import get_current_employer

router = APIRouter()


@router.post("/", response_model=CompanySchema)
async def create_company(
    company: CompanyCreate,
    current_user: User = Depends(get_current_employer),
    db: Session = Depends(get_db)
):
    """Создание компании"""
    # Проверяем, есть ли уже компания у пользователя
    existing_company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if existing_company:
        raise HTTPException(status_code=400, detail="User already has a company")
    
    db_company = Company(**company.dict(), owner_id=current_user.id)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


@router.get("/my", response_model=CompanySchema)
async def read_my_company(
    current_user: User = Depends(get_current_employer),
    db: Session = Depends(get_db)
):
    """Получение компании текущего пользователя"""
    company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/my", response_model=CompanySchema)
async def update_my_company(
    company_update: CompanyUpdate,
    current_user: User = Depends(get_current_employer),
    db: Session = Depends(get_db)
):
    """Обновление компании текущего пользователя"""
    company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = company_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    return company


@router.get("/", response_model=List[CompanySchema])
async def read_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Получение списка компаний"""
    companies = db.query(Company).offset(skip).limit(limit).all()
    return companies


@router.get("/{company_id}", response_model=CompanySchema)
async def read_company(company_id: int, db: Session = Depends(get_db)):
    """Получение компании по ID"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company