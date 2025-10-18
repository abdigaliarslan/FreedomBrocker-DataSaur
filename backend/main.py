from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from database import engine, Base
from routers import auth, jobs, users, companies, resumes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создание таблиц при запуске
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="HackNU Job Portal API",
    description="API для платформы поиска работы HackNU",
    version="1.0.0",
    lifespan=lifespan
)

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth.router, prefix="/auth", tags=["authentication"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(companies.router, prefix="/companies", tags=["companies"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(resumes.router, prefix="/resumes", tags=["resumes"])


@app.get("/")
async def root():
    return {"message": "HackNU Job Portal API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}