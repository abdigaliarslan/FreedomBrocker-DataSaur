# F.I.R.E. — Freedom Intelligent Routing Engine

**Команда Lodge** | F.I.R.E. Challenge 2026

Платформа интеллектуальной маршрутизации обращений клиентов Freedom Broker с гибридным AI-обогащением и географической привязкой.

---

## Содержание

- [Архитектура](#архитектура)
- [Стек технологий](#стек-технологий)
- [Структура проекта](#структура-проекта)
- [Жизненный цикл тикета](#жизненный-цикл-тикета)
- [Гибридное обогащение (Hybrid Enrichment)](#гибридное-обогащение)
- [Алгоритмы маршрутизации (4-step pipeline)](#алгоритмы-маршрутизации)
- [Правила приоритизации](#правила-приоритизации)
- [Фронтенд — страницы и функционал](#фронтенд)
- [API endpoints](#api-endpoints)
- [База данных](#база-данных)
- [Запуск](#запуск)

---

## Архитектура

```
                         ┌──────────────────────────────────────┐
                         │           React Frontend             │
                         │  Dashboard │ Tickets │ Map │ Import  │
                         │  Managers  │ Offices │ Star Assistant│
                         └──────────────┬───────────────────────┘
                                        │ REST API + SSE
                                        ▼
                         ┌──────────────────────────────────────┐
                         │           Go Backend (net/http)       │
                         │                                      │
                         │  ┌─────────┐  ┌───────────────────┐  │
                         │  │ Import  │  │ Hybrid Enrichment │  │
                         │  │ Service │  │  (Deterministic +  │  │
                         │  │ (CSV)   │  │   OpenAI GPT-4.1) │  │
                         │  └────┬────┘  └────────┬──────────┘  │
                         │       │                │             │
                         │       ▼                ▼             │
                         │  ┌──────────────────────────────┐    │
                         │  │   4-Step Routing Pipeline     │    │
                         │  │                              │    │
                         │  │  1. Geo Filter (Haversine)   │    │
                         │  │  2. Skill Filter             │    │
                         │  │  3. Load Balancer            │    │
                         │  │  4. Round Robin              │    │
                         │  └──────────────┬───────────────┘    │
                         │                 │                    │
                         └─────────────────┼────────────────────┘
                                           │
                         ┌─────────────────▼────────────────────┐
                         │         PostgreSQL 16                │
                         │  tickets │ ticket_ai │ managers      │
                         │  ticket_assignment │ audit_log       │
                         │  business_units │ rr_pointer         │
                         └──────────────────────────────────────┘
```

### Внешние интеграции

```
n8n (webhook) ──► POST /api/v1/callbacks/enrichment ──► Routing Pipeline
OpenAI API   ◄── GPT-4.1-mini (text) + Vision API (изображения)
Nominatim    ◄── Fallback-геокодирование (OSM)
```

---

## Стек технологий

| Слой | Технология |
|------|-----------|
| Backend | **Go** (net/http), чистая архитектура (handler → service → repository) |
| Database | **PostgreSQL 16** (Alpine) |
| Frontend | **React 19** + **TypeScript 5.9** |
| Сборка | **Vite 7** |
| Стилизация | **Tailwind CSS v4** |
| Графики | **Recharts v3** |
| Карта | **Leaflet** (react-leaflet) |
| Иконки | **lucide-react** |
| HTTP-клиент | **Axios** |
| Таблицы | **@tanstack/react-table v8** |
| AI | **OpenAI GPT-4.1-mini** + **Vision API** |
| Автоматизация | **n8n** (опциональный webhook-пайплайн) |
| Деплой | **Docker Compose** |

---

## Структура проекта

```
FreedomBrocker-DataSaur/
├── backend/
│   ├── cmd/server/main.go              # Точка входа, DI
│   ├── internal/
│   │   ├── config/                     # Конфигурация приложения
│   │   ├── db/                         # Подключение к БД, миграции
│   │   ├── domain/                     # Доменные модели (Go structs)
│   │   ├── handler/                    # HTTP-обработчики
│   │   │   ├── ticket_handler.go       # CRUD тикетов + обогащение
│   │   │   ├── import_handler.go       # Импорт CSV
│   │   │   ├── callback_handler.go     # Webhook от n8n
│   │   │   ├── dashboard_handler.go    # Статистика
│   │   │   ├── manager_handler.go      # Менеджеры
│   │   │   └── star_handler.go         # AI-ассистент
│   │   ├── middleware/                 # CORS
│   │   ├── repository/                 # Data Access Layer (SQL)
│   │   ├── routing/                    # Алгоритмы маршрутизации
│   │   │   ├── geo_filter.go           # Гео-фильтр (Haversine)
│   │   │   ├── skill_filter.go         # Фильтр по навыкам
│   │   │   ├── load_balancer.go        # Балансировка нагрузки
│   │   │   └── round_robin.go          # Round Robin назначение
│   │   └── service/                    # Бизнес-логика
│   │       ├── ai_svc.go               # Гибридное обогащение
│   │       ├── routing_svc.go          # Оркестрация маршрутизации
│   │       ├── ticket_svc.go           # Логика тикетов
│   │       ├── import_svc.go           # Парсинг и импорт CSV
│   │       ├── dashboard_svc.go        # Агрегация метрик
│   │       └── manager_svc.go          # Логика менеджеров
│   └── migrations/                     # SQL-миграции (001–016)
│
├── frontend/
│   ├── src/
│   │   ├── api/                        # Axios-модули (по домену)
│   │   │   ├── client.ts               # Базовый Axios-инстанс
│   │   │   ├── tickets.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── managers.ts
│   │   │   ├── offices.ts
│   │   │   ├── import.ts
│   │   │   └── star.ts
│   │   ├── components/layout/          # AppLayout, Sidebar
│   │   ├── pages/                      # Страницы (по маршруту)
│   │   │   ├── Dashboard.tsx           # KPI + графики
│   │   │   ├── Tickets.tsx             # Таблица тикетов
│   │   │   ├── Managers.tsx            # Сетка менеджеров
│   │   │   ├── Offices.tsx             # Карточки офисов
│   │   │   ├── Import.tsx              # Загрузка CSV
│   │   │   ├── MapPage.tsx             # Карта тикетов
│   │   │   └── StarAssistant.tsx       # AI-помощник
│   │   ├── types/                      # TypeScript-интерфейсы
│   │   ├── lib/utils.ts                # cn() хелпер
│   │   ├── index.css                   # Дизайн-токены (HSL)
│   │   ├── App.tsx                     # Маршруты
│   │   └── main.tsx                    # Точка входа
│   └── vite.config.ts
│
├── docker-compose.yml
└── Makefile
```

---

## Жизненный цикл тикета

```
 CSV Import          Hybrid Enrichment              4-Step Routing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                     ┌─────────────────┐
  ┌──────┐           │ Детерминистика  │           ┌───────────┐
  │ CSV  │──► new ──►│ (язык, тип,     │──► enriched ──►│ Geo Filter│
  │ file │           │  тональность,   │           │ (Haversine)│
  └──────┘           │  приоритет, гео)│           └─────┬─────┘
                     └────────┬────────┘                 │
                              │                    ┌─────▼──────┐
                     ┌────────▼────────┐           │Skill Filter│
                     │   OpenAI API    │           │(VIP, язык, │
                     │ (GPT-4.1-mini + │           │ спец-т)    │
                     │  Vision API)    │           └─────┬──────┘
                     └────────┬────────┘                 │
                              │                    ┌─────▼──────┐
                     ┌────────▼────────┐           │   Load     │
                     │  Merge Results  │           │ Balancer   │
                     │ (AI + детерм.)  │           │ (top 2)    │
                     └─────────────────┘           └─────┬──────┘
                                                         │
                                                   ┌─────▼──────┐
                                                   │Round Robin │
                                                   │(транзакция)│
                                                   └─────┬──────┘
                                                         │
                                                         ▼
                                                      routed
                                                         │
                                              open → progress → resolved → closed

  Спам ──► автоматически отсеивается, не назначается менеджеру
```

**Статусы**: `new` → `enriching` → `enriched` → `routed` → `open` → `progress` → `resolved` → `closed`

---

## Гибридное обогащение

Система использует **двухфазный подход** — детерминистический анализ + AI — с автоматическим fallback.

### Фаза 1: Детерминистический анализ (мгновенный, без API)

| Анализ | Метод |
|--------|-------|
| **Язык** | Подсчёт символов: казахские буквы (қ, ң, ө, ү, і) → KZ; латиница > 60% → ENG; иначе → RU |
| **Тип** | Keyword-matching с весами по 6 категориям (Жалоба, Претензия, Консультация, Неработоспособность, Смена данных, Спам) |
| **Тональность** | Подсчёт негативных vs позитивных ключевых слов |
| **Приоритет** | Формула: base(5) + segment_boost(VIP=8, Priority=7) + type_boost + sentiment_boost, clamp [1,10] |
| **Геокодирование** | База 150+ городов Казахстана → координаты; fallback через Nominatim API (OSM) |

### Фаза 2: AI-анализ (OpenAI GPT-4.1-mini)

- Глубокий анализ текста: тип, тональность, summary, рекомендованные действия
- **Vision API**: если приложены изображения — AI анализирует скриншоты/документы
- Системный промпт на русском языке с чёткими правилами классификации

### Фаза 3: Merge (слияние результатов)

| Поле | Правило |
|------|---------|
| Язык | Детерминистика всегда (казахские символы надёжнее) |
| Тип | AI побеждает при confidence > 0.5, иначе детерминистика |
| Спам | Детерминистика перезаписывает при confidence >= 0.65 |
| Тональность | AI побеждает при confidence > 0.5 |
| Приоритет | max(детерминистический_floor, AI_значение) |
| Summary, Actions | Всегда AI (качественно лучше) |

**Отказоустойчивость**: если OpenAI недоступен — детерминистика работает всегда, маршрутизация не блокируется.

---

## Алгоритмы маршрутизации

### Шаг 1: Geo Filter — географическая привязка

Определяет ближайший офис банка к клиенту.

**Формула Гаверсинуса** (great-circle distance):
```
dLat = (lat2 - lat1) * pi/180
dLon = (lon2 - lon1) * pi/180
a    = sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLon/2)
dist = 2 * R * atan2(sqrt(a), sqrt(1-a))       // R = 6371 km
```

**Fallback-стратегия**:
1. Координаты известны → Haversine → ближайший офис
2. Координаты неизвестны, но есть город → сопоставление по названию города
3. Ничего не известно → `ticketID[0] % количество_офисов` (равномерное распределение)

### Шаг 2: Skill Filter — фильтрация по навыкам

Определяет пул подходящих менеджеров в выбранном офисе.

| Условие | Фильтр | Группа |
|---------|--------|--------|
| Клиент VIP/Priority | Только `is_vip_skill = true` | `vip` |
| Тип "Смена данных" | Только `is_chief_spec = true` | `chief_spec` |
| Язык KZ или ENG | Только менеджеры с этим языком | `lang_KZ` / `lang_ENG` |
| Иначе | Все менеджеры офиса | `general` |

**Fallback**: если в офисе нет подходящих менеджеров → расширяем до всех активных менеджеров.

### Шаг 3: Load Balancer — балансировка нагрузки

```
Отсортировать кандидатов по current_load ↑ (по возрастанию)
Выбрать 2 наименее загруженных → финалисты
```

### Шаг 4: Round Robin — финальное назначение

Транзакционное назначение с pessimistic lock:

```
BEGIN TX
  LOCK rr_pointer(office_id, skill_group) FOR UPDATE
  next_idx = (last_manager_idx + 1) % len(финалисты)
  Назначить финалист[next_idx]
  Создать ticket_assignment (is_current = true)
  Инкрементировать manager.current_load
  Обновить ticket.status = 'routed'
COMMIT TX
```

### Аудит

Каждый шаг записывается в `audit_log` с полями: `step`, `input_data`, `output_data`, `candidates`, `decision`. Полная прозрачность решений.

---

## Правила приоритизации

| Сценарий | Приоритет |
|----------|-----------|
| VIP-сегмент | >= 8 |
| Priority-сегмент | >= 7 |
| Претензия | >= 8 |
| Жалоба | >= 7 |
| Неработоспособность | >= 6 |
| Смена данных | >= 4 |
| Негативная тональность | +1 (если < 7) |
| Спам | = 1 (не назначается менеджеру) |
| Базовый | 5 |

---

## Фронтенд

### Страницы

| Страница | Описание |
|----------|----------|
| **Dashboard** | KPI-карточки (всего тикетов, маршрутизировано, менеджеров, неизв. гео), PieChart тональности, BarChart категорий, LineChart timeline, нагрузка менеджеров, лента последних тикетов (SSE) |
| **Tickets** | Таблица с пагинацией и фильтрами (статус, тональность, сегмент, тип, язык, поиск), детальная карточка с AI-анализом, аудитом маршрутизации, расстоянием до офиса |
| **Managers** | Сетка менеджеров: офис, утилизация (progress bar), VIP/Chief бейджи, языки, статус активности |
| **Offices** | Карточки офисов: адрес, координаты, количество менеджеров |
| **Import** | Загрузка CSV с авто-определением типа (тикеты / менеджеры / офисы), прогресс, результат |
| **Map** | Leaflet-карта с геопинами тикетов (цвет по тональности/типу) и маркерами офисов |
| **Star Assistant** | AI-помощник: запрос на естественном языке → SQL → таблица/график |

### Realtime

WebSocket/SSE для живого обновления дашборда при изменении статуса тикетов.

---

## API Endpoints

### Тикеты
```
GET    /api/v1/tickets                   # Список (фильтры, пагинация)
GET    /api/v1/tickets/{id}              # Детали + AI + аудит
PATCH  /api/v1/tickets/{id}/status       # Обновить статус
POST   /api/v1/tickets/{id}/enrich       # Обогатить один тикет
POST   /api/v1/tickets/enrich-all        # Обогатить все (batch)
GET    /api/v1/tickets/map               # Точки для карты
```

### Импорт
```
POST   /api/v1/import                    # Авто-определение типа CSV
POST   /api/v1/import/tickets
POST   /api/v1/import/managers
POST   /api/v1/import/business-units
```

### Дашборд
```
GET    /api/v1/dashboard/stats           # KPI
GET    /api/v1/dashboard/sentiment       # Тональность
GET    /api/v1/dashboard/categories      # Категории
GET    /api/v1/dashboard/manager-load    # Нагрузка менеджеров
GET    /api/v1/dashboard/timeline        # Timeline
```

### Менеджеры и офисы
```
GET    /api/v1/managers                  # Список менеджеров
GET    /api/v1/managers/{id}             # Детали менеджера
GET    /api/v1/offices                   # Список офисов
```

### Интеграции
```
POST   /api/v1/callbacks/enrichment      # Webhook от n8n
POST   /api/v1/star/query               # AI-ассистент
```

---

## База данных

### ER-диаграмма

```
business_units          managers                 tickets
┌──────────────┐       ┌──────────────────┐     ┌──────────────────┐
│ id (PK)      │◄──┐   │ id (PK)          │     │ id (PK)          │
│ name         │   │   │ full_name        │     │ external_id      │
│ city         │   └───│ business_unit_id  │     │ subject          │
│ address      │       │ is_vip_skill     │     │ body             │
│ lat, lon     │       │ is_chief_spec    │     │ client_name      │
└──────────────┘       │ languages []     │     │ client_segment   │
                       │ max_load (50)    │     │ source_channel   │
                       │ current_load     │     │ status           │
                       │ is_active        │     │ raw_address      │
                       └────────┬─────────┘     │ attachments      │
                                │               └────────┬─────────┘
                                │                        │
                       ┌────────▼────────────────────────▼──────┐
                       │          ticket_assignment             │
                       │ id │ ticket_id │ manager_id            │
                       │ business_unit_id │ routing_bucket      │
                       │ routing_reason   │ is_current          │
                       └────────────────────────────────────────┘
                                                 │
                       ┌─────────────────────────▼──────┐
                       │           ticket_ai            │
                       │ id │ ticket_id                  │
                       │ type │ sentiment │ priority     │
                       │ lang │ summary                  │
                       │ recommended_actions (JSONB)     │
                       │ lat, lon │ geo_status           │
                       │ confidence_type/sentiment/prio  │
                       │ processing_ms │ enriched_at     │
                       └────────────────────────────────┘

  audit_log                          rr_pointer
  ┌──────────────────────┐           ┌─────────────────────────┐
  │ ticket_id            │           │ business_unit_id (PK)   │
  │ step (geo/skill/lb/rr)│          │ skill_group (PK)        │
  │ input_data (JSONB)   │           │ last_manager_idx        │
  │ output_data (JSONB)  │           └─────────────────────────┘
  │ decision             │
  │ candidates (JSONB)   │
  └──────────────────────┘
```

---

## Запуск

### Требования
- Docker + Docker Compose
- Node.js 20+ (для frontend dev)
- Go 1.23+ (для backend dev)

### Production (Docker)

```bash
docker-compose up -d
```

Сервисы:
- **Backend**: `http://localhost:8080`
- **PostgreSQL**: `localhost:5434`

### Development

```bash
# Backend
cd backend && go run cmd/server/main.go

# Frontend
cd frontend && npm install && npm run dev
```

Frontend dev-сервер проксирует `/api` на `http://localhost:8080`.

### Переменные окружения

| Переменная | Описание |
|-----------|----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | Ключ OpenAI API |
| `OPENAI_MODEL` | Модель (gpt-4.1-mini) |
| `CORS_ORIGINS` | Разрешённые origins |
| `IMAGES_DIR` | Путь к директории изображений |

---

## Ключевые особенности

- **Отказоустойчивость**: AI падает → детерминистика работает, маршрутизация не блокируется
- **Транзакционная целостность**: Round Robin с pessimistic lock, атомарное назначение
- **Полный аудит**: каждое решение маршрутизации логируется (5 шагов)
- **Vision API**: анализ приложенных изображений (скриншоты ошибок, документы)
- **Авто-импорт CSV**: система сама определяет тип файла (тикеты/менеджеры/офисы)
- **Realtime**: SSE/WebSocket для живого дашборда
- **Гибридный подход**: скорость детерминистики + глубина AI
