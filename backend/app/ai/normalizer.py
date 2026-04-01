from __future__ import annotations

import json
import re

from app.schemas.ai_review import AIReviewResponse, MergeSuggestion, ReviewIssue, ReviewSuggestion


def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in provider response.")
    parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise ValueError("Provider response JSON is not an object.")
    return parsed


def normalize_review_response(
    *,
    project_id: str,
    provider: str,
    model: str,
    raw_response: str,
) -> AIReviewResponse:
    parsed = _extract_json(raw_response)

    issues = []
    for item in parsed.get("issues", []):
        if isinstance(item, dict):
            issues.append(
                ReviewIssue(
                    severity=item.get("severity", "medium"),
                    title=str(item.get("title", "Issue")),
                    description=str(item.get("description", "")),
                    line_start=item.get("line_start"),
                    line_end=item.get("line_end"),
                )
            )

    suggestions = []
    for item in parsed.get("suggestions", []):
        if isinstance(item, dict):
            suggestions.append(
                ReviewSuggestion(
                    title=str(item.get("title", "Suggestion")),
                    description=str(item.get("description", "")),
                    patch_hint=item.get("patch_hint"),
                )
            )

    merge_raw = parsed.get("merge_suggestion", {})
    merge_suggestion = MergeSuggestion(
        should_merge=bool(merge_raw.get("should_merge", False)),
        rationale=str(merge_raw.get("rationale", "Insufficient data to recommend merge.")),
        blockers=[str(item) for item in merge_raw.get("blockers", []) if str(item).strip()],
    )

    return AIReviewResponse(
        project_id=project_id,
        provider=provider,
        model=model,
        status="completed",
        summary=str(parsed.get("summary", "Review completed.")),
        issues=issues,
        suggestions=suggestions,
        merge_suggestion=merge_suggestion,
        raw_response=raw_response,
        fallback_used=False,
    )


def fallback_review(
    *,
    project_id: str,
    provider: str,
    model: str,
    source_code: str,
    language: str,
    collaboration_context: dict,
    raw_response: str,
) -> AIReviewResponse:
    issues: list[ReviewIssue] = []
    suggestions: list[ReviewSuggestion] = []
    blockers: list[str] = []

    lines = source_code.splitlines()

    long_lines = [index + 1 for index, line in enumerate(lines) if len(line) > 120]
    if long_lines:
        issues.append(
            ReviewIssue(
                severity="low",
                title="Long lines reduce readability",
                description="Some lines exceed 120 characters and may be harder for collaborators to review.",
                line_start=long_lines[0],
                line_end=long_lines[0],
            )
        )
        suggestions.append(
            ReviewSuggestion(
                title="Wrap long statements",
                description="Split overly long expressions or strings into smaller parts to improve readability.",
                patch_hint="Break nested expressions into intermediate variables.",
            )
        )

    debug_markers = ["print(", "console.log(", "debugger"]
    if any(marker in source_code for marker in debug_markers):
        issues.append(
            ReviewIssue(
                severity="medium",
                title="Debug statements found",
                description="Debug output can create noisy runtime output and should usually be removed before merge.",
            )
        )
        blockers.append("Remove debug-only statements before merge.")

    if language == "python" and "except Exception" in source_code:
        issues.append(
            ReviewIssue(
                severity="medium",
                title="Broad exception handling",
                description="Catching Exception broadly may hide actionable failures from collaborators.",
            )
        )

    if language == "javascript" and "var " in source_code:
        issues.append(
            ReviewIssue(
                severity="low",
                title="Legacy variable declarations",
                description="Using var can make collaborative edits harder to reason about due to function scoping.",
            )
        )
        suggestions.append(
            ReviewSuggestion(
                title="Prefer const or let",
                description="Use block-scoped declarations to improve clarity and reduce accidental mutation.",
                patch_hint="Replace var with const where values do not change, otherwise use let.",
            )
        )

    active_collaborators = int(collaboration_context.get("activeCollaborators", 1) or 1)
    should_merge = len(blockers) == 0 and active_collaborators <= 3
    rationale = (
        "No critical blockers were detected in fallback mode."
        if should_merge
        else "Fallback review detected blockers or elevated collaboration risk."
    )

    if active_collaborators > 3:
        blockers.append("Many active collaborators are editing; wait for stabilization before merge.")

    summary = "Fallback review completed because the AI provider was unavailable."
    if issues:
        summary += f" Found {len(issues)} review issue(s)."
    else:
        summary += " No obvious static issues were detected."

    return AIReviewResponse(
        project_id=project_id,
        provider=provider,
        model=model,
        status="completed",
        summary=summary,
        issues=issues,
        suggestions=suggestions,
        merge_suggestion=MergeSuggestion(
            should_merge=should_merge,
            rationale=rationale,
            blockers=blockers,
        ),
        raw_response=raw_response,
        fallback_used=True,
    )