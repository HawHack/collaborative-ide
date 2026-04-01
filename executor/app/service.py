from __future__ import annotations

import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

import structlog

from app.config import get_settings
from app.schemas import ExecuteResponse

settings = get_settings()
logger = structlog.get_logger(__name__)


@dataclass(frozen=True, slots=True)
class LanguageRuntime:
    filename: str
    command: list[str] | None


LANGUAGE_RUNTIMES: dict[str, LanguageRuntime] = {
    "python": LanguageRuntime(
        filename="main.py",
        command=["python", "main.py"],
    ),
    "javascript": LanguageRuntime(
        filename="main.js",
        command=None,
    ),
}


class SandboxExecutor:
    def execute(self, *, language: str, source_code: str) -> ExecuteResponse:
        runtime = LANGUAGE_RUNTIMES[language]

        if runtime.command is None:
            return ExecuteResponse(
                status="failed",
                stdout="",
                stderr="This simplified executor currently supports only Python.",
                combined_output="This simplified executor currently supports only Python.",
                exit_code=1,
                duration_ms=0,
                timed_out=False,
                limits=self._limits_payload(),
            )

        temp_dir = Path(tempfile.mkdtemp(prefix="run-", dir=settings.tmp_root_path))
        source_path = temp_dir / runtime.filename
        source_path.write_text(source_code, encoding="utf-8")

        started = time.perf_counter()

        try:
            result = subprocess.run(
                runtime.command,
                cwd=str(temp_dir),
                capture_output=True,
                text=True,
                timeout=settings.executor_timeout_seconds,
                check=False,
            )

            duration_ms = int((time.perf_counter() - started) * 1000)
            stdout = self._truncate(result.stdout or "")
            stderr = self._truncate(result.stderr or "")
            combined_output = self._truncate(self._combine(stdout, stderr))
            status = "completed" if result.returncode == 0 else "failed"

            return ExecuteResponse(
                status=status,
                stdout=stdout,
                stderr=stderr,
                combined_output=combined_output,
                exit_code=result.returncode,
                duration_ms=duration_ms,
                timed_out=False,
                limits=self._limits_payload(),
            )

        except subprocess.TimeoutExpired as exc:
            duration_ms = int((time.perf_counter() - started) * 1000)
            stdout = self._truncate(self._normalize_timeout_output(exc.stdout))
            stderr = self._truncate(self._normalize_timeout_output(exc.stderr))
            combined_output = self._truncate(self._combine(stdout, stderr))

            return ExecuteResponse(
                status="timeout",
                stdout=stdout,
                stderr=stderr,
                combined_output=combined_output,
                exit_code=None,
                duration_ms=duration_ms,
                timed_out=True,
                limits=self._limits_payload(),
            )

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    @staticmethod
    def _normalize_timeout_output(value: str | bytes | None) -> str:
        if value is None:
            return ""
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="ignore")
        return value

    def _truncate(self, value: str) -> str:
        encoded = value.encode("utf-8", errors="ignore")
        if len(encoded) <= settings.executor_max_output_bytes:
            return value

        suffix = "\n... output truncated ..."
        budget = max(settings.executor_max_output_bytes - len(suffix.encode("utf-8")), 0)
        truncated = encoded[:budget].decode("utf-8", errors="ignore")
        return f"{truncated}{suffix}"

    @staticmethod
    def _combine(stdout: str, stderr: str) -> str:
        if stdout and stderr:
            return f"{stdout.rstrip()}\n{stderr.lstrip()}"
        return stdout or stderr

    @staticmethod
    def _limits_payload() -> dict:
        return {
            "timeoutSeconds": settings.executor_timeout_seconds,
            "maxOutputBytes": settings.executor_max_output_bytes,
            "mode": "direct_subprocess_python_only",
        }