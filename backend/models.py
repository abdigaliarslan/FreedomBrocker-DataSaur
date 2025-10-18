from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String)
    user_type = Column(String, nullable=False)  # "job_seeker" или "employer"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи
    resumes = relationship("Resume", back_populates="user")
    company = relationship("Company", back_populates="owner", uselist=False)
    applications = relationship("JobApplication", back_populates="user")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    website = Column(String)
    industry = Column(String)
    size = Column(String)  # "1-10", "11-50", "51-200", "200+"
    location = Column(String)
    logo_url = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи
    owner = relationship("User", back_populates="company")
    jobs = relationship("Job", back_populates="company")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text)
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    currency = Column(String, default="KZT")
    employment_type = Column(String)  # "full_time", "part_time", "contract", "internship"
    experience_level = Column(String)  # "entry", "junior", "middle", "senior", "lead"
    location = Column(String)
    remote_work = Column(Boolean, default=False)
    company_id = Column(Integer, ForeignKey("companies.id"))
    is_active = Column(Boolean, default=True)
    views_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи
    company = relationship("Company", back_populates="jobs")
    applications = relationship("JobApplication", back_populates="job")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    summary = Column(Text)
    experience = Column(Text)
    education = Column(Text)
    skills = Column(Text)
    salary_expectation = Column(Integer)
    currency = Column(String, default="KZT")
    location = Column(String)
    remote_work = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи
    user = relationship("User", back_populates="resumes")


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    job_id = Column(Integer, ForeignKey("jobs.id"))
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    cover_letter = Column(Text)
    status = Column(String, default="pending")  # "pending", "reviewed", "accepted", "rejected"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи
    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    resume = relationship("Resume")