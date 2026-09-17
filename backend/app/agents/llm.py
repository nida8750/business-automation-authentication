from __future__ import annotations

import json
from typing import Any

from app.config import settings
from app.core.logging import get_logger

logger = get_logger("agents.llm")


class LlmResult:
    def __init__(self, data: dict[str, Any], prompt_tokens: int = 0, completion_tokens: int = 0) -> None:
        self.data = data
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.used_model = bool(data) and (prompt_tokens > 0 or completion_tokens > 0)


def complete_json(system: str, user: str) -> LlmResult:
    """Call OpenAI for a JSON object. Returns empty data when the key is missing or the call fails."""
    if not settings.openai_api_key.strip():
        return LlmResult({})

    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout_seconds,
        )
        response = client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        content = response.choices[0].message.content or "{}"
        usage = response.usage
        prompt_tokens = int(getattr(usage, "prompt_tokens", 0) or 0)
        completion_tokens = int(getattr(usage, "completion_tokens", 0) or 0)
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            return LlmResult({}, prompt_tokens, completion_tokens)
        return LlmResult(parsed, prompt_tokens, completion_tokens)
    except Exception:
        logger.exception("llm_json_call_failed")
        return LlmResult({})
