from typing import Any, TypedDict


class AgentState(TypedDict, total=False):
    lead: dict[str, Any]
    plan: dict[str, Any]
    research: dict[str, Any]
    qualification: dict[str, Any]
    outreach: dict[str, Any]
    crm_proposal: dict[str, Any]
    report: dict[str, Any]
    skip_outreach: bool
    prompt_tokens: int
    completion_tokens: int
    steps: list[dict[str, Any]]
    errors: list[str]
