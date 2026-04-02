#!/bin/sh
set -eu

python - <<'PY'
import os
import socket
import sys
import time
from urllib.parse import urlparse

dsn = os.environ.get("SQLALCHEMY_DATABASE_URI", "")
if not dsn:
    sys.exit("SQLALCHEMY_DATABASE_URI is not set")

parsed = urlparse(dsn.replace("+psycopg", ""))
host = parsed.hostname or "postgres"
port = parsed.port or 5432

deadline = time.time() + 60
while time.time() < deadline:
    try:
        with socket.create_connection((host, port), timeout=2):
            break
    except OSError:
        time.sleep(2)
else:
    sys.exit(f"Database is not reachable at {host}:{port}")
PY

alembic upgrade head

exec "$@"
