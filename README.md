# MyLink.kz - Казахстанская платформа поиска работы

Полнофункциональная копия сайта mylink.kz - казахстанского аналога HeadHunter для поиска вакансий и работы с HR.

## Технологический стек

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Аутентификация**: JWT токены
- **Стилизация**: CSS Modules + адаптивная верстка

## Функциональность

### Для соискателей:
- Поиск и фильтрация вакансий
- Создание и редактирование резюме
- Отклик на вакансии
- Личный кабинет

### Для работодателей:
- Публикация вакансий
- Управление вакансиями
- Просмотр откликов
- Корпоративный профиль

## Установка и запуск

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

## Структура проекта

```
mylink-kz/
├── backend/          # FastAPI бэкенд
├── frontend/         # React фронтенд
└── README.md
```

## API Документация

После запуска бэкенда документация доступна по адресу: http://localhost:8000/docs# HackNU
