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
git clone https://github.com/HawHack/IDE-AI.git
cd IDE-AI/collaborative-ide
