README.md
# IDE-AI / Collaborative IDE

Совместимая с Docker collaborative IDE с:
- редактором кода в стиле IDE
- совместным редактированием через Yjs / Hocuspocus
- запуском кода
- AI review
- activity log / leaderboard
- авторизацией и проектами

---

## Что внутри

Проект состоит из сервисов:

- `frontend` — React / Vite интерфейс
- `backend` — FastAPI API
- `collab` — realtime collaboration сервер
- `executor` — запуск кода
- `postgres` — база данных
- `redis` — realtime / pubsub
- `nginx` — единая точка входа на `http://localhost`

---

## Требования

Перед запуском должны быть установлены:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

Для Windows:
- Docker Desktop должен быть **запущен**
- желательно включить WSL2 backend

---

## Клонирование проекта с GitHub

```bash
git clone https://github.com/HawHack/collaborative-ide

Если у тебя проект лежит уже локально — просто перейди в папку, где находится docker-compose.yml.

Настройка .env

В корне проекта должен лежать файл .env.

Пример актуального .env:

# Global
COMPOSE_PROJECT_NAME=collaborative-ide

# PostgreSQL
POSTGRES_DB=collab_ide
POSTGRES_USER=collab_ide
POSTGRES_PASSWORD=collab_ide
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://redis:6379/0

# Backend
BACKEND_PORT=8000
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost
BACKEND_PUBLIC_URL=http://localhost
SQLALCHEMY_DATABASE_URI=postgresql+psycopg://collab_ide:collab_ide@postgres:5432/collab_ide
ASYNC_SQLALCHEMY_DATABASE_URI=postgresql+asyncpg://collab_ide:collab_ide@postgres:5432/collab_ide
JWT_SECRET_KEY=change-me-access-secret
JWT_REFRESH_SECRET_KEY=change-me-refresh-secret
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
SECURE_COOKIES=false
EXECUTOR_URL=http://executor:8010
COLLAB_URL=ws://localhost/ws/collab
COLLAB_INTERNAL_URL=ws://collab:3001

# AI review
AI_PROVIDER=gemini
AI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
AI_API_KEY=PUT_YOUR_GEMINI_KEY_HERE
AI_MODEL=gemini-2.5-flash
AI_SITE_URL=http://localhost
AI_APP_NAME=Collaborative IDE

# Optional fallback to OpenRouter
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/auto

# Executor
EXECUTOR_PORT=8010
EXECUTOR_SHARED_TOKEN=change-me-executor-token
EXECUTOR_MAX_OUTPUT_BYTES=24000
EXECUTOR_TIMEOUT_SECONDS=10
EXECUTOR_MEMORY_LIMIT=256m
EXECUTOR_CPU_LIMIT=1.0
EXECUTOR_PIDS_LIMIT=64
Важно

Никогда не пушь реальный .env с ключами в GitHub.

Лучше добавить .env в .gitignore.

Первый запуск через Docker

Из корня проекта:

docker compose up --build

После успешного запуска открой:

http://localhost
Запуск в фоне
docker compose up -d --build

Потом открыть:

http://localhost
