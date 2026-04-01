# Collaborative IDE Platform

Production-minded collaborative IDE platform with FastAPI, PostgreSQL, Redis, React, Monaco, Yjs/Hocuspocus, Dockerized sandbox execution, activity logging, leaderboard scoring and AI review.

## One-command startup

    docker compose up --build

Open `http://localhost`.

## Optional environment overrides

The project runs without a `.env` file because `docker-compose.yml` includes sane defaults.
If you want to override secrets or provider settings, copy `.env.example` to `.env` and edit values.

## Architecture

- `frontend`: Vite + React SPA
- `backend`: FastAPI API, auth, project CRUD, run/review orchestration, leaderboard, activity websocket
- `collab`: Hocuspocus WebSocket server for CRDT sync, awareness and cursor presence
- `executor`: isolated code execution service using ephemeral Docker containers
- `postgres`: durable relational persistence
- `redis`: pub/sub fan-out and cross-instance realtime coordination
- `nginx`: single public entrypoint

## Security and execution

- short-lived access JWT
- rotating refresh token in HttpOnly cookie
- protected project and websocket access
- executor runs code in isolated containers with no network, timeout, memory/CPU limits, pids limit, read-only rootfs and cleanup
- backend never executes user code directly

## Supported languages

- Python
- JavaScript

## High-level product flow

1. Register or log in.
2. Create a project in the dashboard.
3. Open the project room and collaborate in real time.
4. Run the current snapshot safely.
5. Request AI review and inspect structured findings.
6. Use activity log and leaderboard to track collaboration.

## Notes

- AI review works with an OpenAI-compatible API, but the system still works without any AI key by switching to deterministic fallback review.
- For local HTTP, keep `SECURE_COOKIES=false`. For HTTPS deployments, set it to `true`.