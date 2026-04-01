from __future__ import annotations

import json
import os

import httpx

from app.core.config import get_settings
from app.core.exceptions import BadRequestError

settings = get_settings()


class AIProviderClient:
    def __init__(self) -> None:
        self.provider_name = settings.ai_provider
        self.model_name = settings.ai_model
        self.base_url = settings.ai_api_base_url.rstrip("/")
        self.api_key = settings.ai_api_key

        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "openrouter/auto").strip() or "openrouter/auto"
        self.openrouter_site_url = os.getenv("AI_SITE_URL", "http://localhost").strip() or "http://localhost"
        self.openrouter_app_name = os.getenv("AI_APP_NAME", "Collaborative IDE").strip() or "Collaborative IDE"

    async def review(self, messages: list[dict[str, str]]) -> str:
        if self.provider_name == "gemini":
            if not self.api_key:
                raise BadRequestError("Gemini API key is missing.")
            return await self._review_gemini_with_fallback(messages)

        if self.provider_name == "openrouter":
            if not (self.api_key or self.openrouter_api_key):
                raise BadRequestError("OpenRouter API key is missing.")
            return await self._review_openrouter(messages)

        if self.provider_name == "openai_compatible":
            if not self.api_key:
                raise BadRequestError("AI provider key is missing.")
            return await self._review_openai_compatible(messages)

        raise BadRequestError(f"Unsupported AI provider: {self.provider_name}")

    async def _review_gemini_with_fallback(self, messages: list[dict[str, str]]) -> str:
        try:
            return await self._review_gemini(messages)
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            if status_code in {429, 500, 502, 503, 504} and self.openrouter_api_key:
                return await self._review_openrouter(messages)
            raise
        except (httpx.TimeoutException, httpx.NetworkError):
            if self.openrouter_api_key:
                return await self._review_openrouter(messages)
            raise

    async def _review_openai_compatible(self, messages: list[dict[str, str]]) -> str:
        if not self.base_url:
            raise BadRequestError("AI_API_BASE_URL is missing for openai_compatible provider.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return self._extract_openai_text(data)

    async def _review_openrouter(self, messages: list[dict[str, str]]) -> str:
        api_key = self.openrouter_api_key or self.api_key
        if not api_key:
            raise BadRequestError("OpenRouter API key is missing.")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.openrouter_site_url,
            "X-Title": self.openrouter_app_name,
        }
        payload = {
            "model": self.openrouter_model,
            "messages": messages,
            "temperature": 0.2,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return self._extract_openai_text(data)

    async def _review_gemini(self, messages: list[dict[str, str]]) -> str:
        system_parts: list[str] = []
        user_parts: list[str] = []

        for message in messages:
            role = message.get("role", "")
            content = str(message.get("content", ""))
            if role == "system":
                system_parts.append(content)
            else:
                user_parts.append(content)

        system_instruction = "\n\n".join(system_parts).strip()
        user_prompt = "\n\n".join(user_parts).strip()

        payload: dict = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        model = self.model_name or "gemini-2.5-flash"
        base_url = self.base_url or "https://generativelanguage.googleapis.com/v1beta"

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url}/models/{model}:generateContent",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return self._extract_gemini_text(data)

    def _extract_openai_text(self, data: dict) -> str:
        choices = data.get("choices", [])
        if not choices:
            raise BadRequestError("AI provider returned no choices.")

        message = choices[0].get("message", {})
        content = message.get("content")

        if isinstance(content, list):
            content = "".join(
                item.get("text", "")
                for item in content
                if isinstance(item, dict) and item.get("type") in {"output_text", "text"}
            )

        if not isinstance(content, str) or not content.strip():
            raise BadRequestError("AI provider returned empty content.")

        return content

    def _extract_gemini_text(self, data: dict) -> str:
        candidates = data.get("candidates", [])
        if not candidates:
            prompt_feedback = data.get("promptFeedback")
            raise BadRequestError(
                f"Gemini returned no candidates. promptFeedback={json.dumps(prompt_feedback, ensure_ascii=False)}"
            )

        parts = candidates[0].get("content", {}).get("parts", [])
        texts = [part.get("text", "") for part in parts if isinstance(part, dict)]
        content = "".join(texts).strip()

        if not content:
            raise BadRequestError("Gemini returned empty content.")

        return content