from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    user_type: str  # "job_seeker" или "employer"


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Company schemas
class CompanyBase(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    location: Optional[str] = None
    logo_url: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(CompanyBase):
    name: Optional[str] = None


class Company(CompanyBase):
    id: int
    owner_id: int
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Job schemas
class JobBase(BaseModel):
    title: str
    description: str
    requirements: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: str = "KZT"
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    location: Optional[str] = None
    remote_work: bool = False


class JobCreate(JobBase):
    pass


class JobUpdate(JobBase):
    title: Optional[str] = None
    description: Optional[str] = None


class Job(JobBase):
    id: int
    company_id: int
    is_active: bool
    views_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    company: Optional[Company] = None

    class Config:
        from_attributes = True


# Resume schemas
class ResumeBase(BaseModel):
    title: str
    summary: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    skills: Optional[str] = None
    salary_expectation: Optional[int] = None
    currency: str = "KZT"
    location: Optional[str] = None
    remote_work: bool = False
    is_public: bool = True


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(ResumeBase):
    title: Optional[str] = None


class Resume(ResumeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Job Application schemas
class JobApplicationBase(BaseModel):
    cover_letter: Optional[str] = None


class JobApplicationCreate(JobApplicationBase):
    job_id: int
    resume_id: int


class JobApplication(JobApplicationBase):
    id: int
    user_id: int
    job_id: int
    resume_id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    job: Optional[Job] = None
    resume: Optional[Resume] = None

    class Config:
        from_attributes = True


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Search schemas
class JobSearch(BaseModel):
    query: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    remote_work: Optional[bool] = None
    page: int = 1
    limit: int = 20


class JobListResponse(BaseModel):
    jobs: List[Job]
    total: int
    page: int
    limit: int
    total_pages: int