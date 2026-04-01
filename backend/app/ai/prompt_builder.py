from __future__ import annotations


def build_review_messages(
    *,
    project_name: str,
    language: str,
    source_code: str,
    collaboration_context: dict,
) -> list[dict[str, str]]:
    system_prompt = """You are a senior collaborative code reviewer.
Return only valid JSON.
Required schema:
{
  "summary": "string",
  "issues": [
    {
      "severity": "low|medium|high",
      "title": "string",
      "description": "string",
      "line_start": 1,
      "line_end": 1
    }
  ],
  "suggestions": [
    {
      "title": "string",
      "description": "string",
      "patch_hint": "string"
    }
  ],
  "merge_suggestion": {
    "should_merge": true,
    "rationale": "string",
    "blockers": ["string"]
  }
}
Focus on correctness, security, clarity, maintainability and collaboration safety.
merge_suggestion must consider whether ongoing collaboration suggests waiting before merge.
Do not include markdown fences."""

    user_prompt = f"""Project: {project_name}
Language: {language}
Collaboration context: {collaboration_context}

Review this code:

{source_code}
"""
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]