from __future__ import annotations

import time
from typing import Any

from app.agents.llm import LlmResult, complete_json
from app.agents.state import AgentState
from app.config import settings
from app.models.enums import AgentName, StepStatus

_CONSUMER_DOMAINS = ("gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com")


def _lead(state: AgentState) -> dict[str, Any]:
    return state.get("lead") or {}


def _append_step(
    state: AgentState,
    *,
    agent: AgentName,
    status: StepStatus,
    output: dict[str, Any] | None,
    latency_ms: int,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    error: str | None = None,
    input_payload: dict[str, Any] | None = None,
) -> None:
    steps = list(state.get("steps") or [])
    steps.append(
        {
            "agent": agent.value,
            "status": status.value,
            "input_payload": input_payload or {"lead_email": _lead(state).get("email")},
            "output_payload": output,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "latency_ms": latency_ms,
            "error_message": error,
        }
    )
    state["steps"] = steps
    state["prompt_tokens"] = int(state.get("prompt_tokens") or 0) + prompt_tokens
    state["completion_tokens"] = int(state.get("completion_tokens") or 0) + completion_tokens
    if error:
        errors = list(state.get("errors") or [])
        errors.append(error)
        state["errors"] = errors


def _timed_llm(system: str, user: str) -> tuple[LlmResult, int]:
    started = time.perf_counter()
    result = complete_json(system, user)
    latency_ms = int((time.perf_counter() - started) * 1000)
    return result, latency_ms


def supervisor_node(state: AgentState) -> AgentState:
    lead = _lead(state)
    started = time.perf_counter()
    llm, llm_ms = _timed_llm(
        "You are the NexusFlow supervisor. Return JSON with keys plan (string) and next_agents (array of strings).",
        (
            f"Lead: {lead.get('full_name')} <{lead.get('email')}> at {lead.get('company')}. "
            "Choose a standard pipeline: research, qualification, outreach, crm, reporting."
        ),
    )
    plan = {
        "plan": llm.data.get("plan")
        or "Research the lead, score fit, draft outreach, propose a CRM write, then summarize.",
        "next_agents": llm.data.get("next_agents")
        or ["research", "qualification", "outreach", "crm", "reporting"],
        "used_llm": llm.used_model,
    }
    state["plan"] = plan
    _append_step(
        state,
        agent=AgentName.SUPERVISOR,
        status=StepStatus.SUCCEEDED,
        output=plan,
        latency_ms=llm_ms if llm.used_model else int((time.perf_counter() - started) * 1000),
        prompt_tokens=llm.prompt_tokens,
        completion_tokens=llm.completion_tokens,
    )
    return state


def _heuristic_research(lead: dict[str, Any]) -> dict[str, Any]:
    company = (lead.get("company") or "").strip()
    website = (lead.get("website") or "").strip()
    email = (lead.get("email") or "").lower()
    domain = email.split("@")[-1] if "@" in email else ""
    facts = []
    if company:
        facts.append(f"{lead.get('full_name')} is associated with {company}.")
    if lead.get("title"):
        facts.append(f"Listed title: {lead.get('title')}.")
    if website:
        facts.append(f"Company website provided: {website}.")
    elif domain and domain not in _CONSUMER_DOMAINS:
        facts.append(f"Work email domain suggests {domain}.")
    else:
        facts.append("No company website; research is limited to the submitted fields.")
    return {
        "summary": " ".join(facts) or "Insufficient public signals; using submitted form data only.",
        "company": company or None,
        "domain": domain or None,
        "signals": facts,
        "sources": [website] if website else [],
        "used_llm": False,
    }


def research_node(state: AgentState) -> AgentState:
    lead = _lead(state)
    fallback = _heuristic_research(lead)
    llm, llm_ms = _timed_llm(
        "You are a B2B research agent. Return JSON with summary, signals (array), sources (array), company, domain.",
        f"Research this lead using only the provided fields. Do not invent facts.\n{lead}",
    )
    research = fallback
    if llm.data:
        research = {
            "summary": llm.data.get("summary") or fallback["summary"],
            "company": llm.data.get("company") or fallback["company"],
            "domain": llm.data.get("domain") or fallback["domain"],
            "signals": llm.data.get("signals") or fallback["signals"],
            "sources": llm.data.get("sources") or fallback["sources"],
            "used_llm": llm.used_model,
        }
    state["research"] = research
    _append_step(
        state,
        agent=AgentName.RESEARCH,
        status=StepStatus.SUCCEEDED,
        output=research,
        latency_ms=llm_ms,
        prompt_tokens=llm.prompt_tokens,
        completion_tokens=llm.completion_tokens,
        input_payload=lead,
    )
    return state


def _heuristic_qualification(lead: dict[str, Any], research: dict[str, Any]) -> dict[str, Any]:
    score = 40
    reasons: list[str] = []
    email = (lead.get("email") or "").lower()
    domain = email.split("@")[-1] if "@" in email else ""
    notes = (lead.get("notes") or "").lower()

    if lead.get("company"):
        score += 20
        reasons.append("Company name is present.")
    if lead.get("website") or research.get("domain"):
        score += 15
        reasons.append("A website or business domain is available.")
    if lead.get("title"):
        score += 10
        reasons.append("A job title was provided.")
    if lead.get("phone"):
        score += 5
        reasons.append("A phone number was provided.")
    if domain and domain not in _CONSUMER_DOMAINS:
        score += 15
        reasons.append("Email looks like a work domain.")
    else:
        reasons.append("Consumer email domain reduces confidence.")
    if any(word in notes for word in ("student", "intern", "homework", "assignment")):
        score -= 30
        reasons.append("Notes look like a non-buyer (student/intern).")

    score = max(0, min(100, score))
    if score >= 70:
        decision = "pursue"
    elif score >= 40:
        decision = "nurture"
    else:
        decision = "drop"
    return {
        "score": score,
        "decision": decision,
        "reasons": reasons,
        "used_llm": False,
    }


def qualification_node(state: AgentState) -> AgentState:
    lead = _lead(state)
    research = state.get("research") or {}
    fallback = _heuristic_qualification(lead, research)
    llm, llm_ms = _timed_llm(
        "You are a qualification agent. Return JSON with score (0-100 integer), decision (pursue|nurture|drop), reasons (array).",
        f"Lead: {lead}\nResearch: {research}\nBe conservative. Do not invent buying intent.",
    )
    qualification = fallback
    if llm.data:
        raw_score = llm.data.get("score", fallback["score"])
        try:
            score = max(0, min(100, int(raw_score)))
        except (TypeError, ValueError):
            score = fallback["score"]
        decision = str(llm.data.get("decision") or fallback["decision"]).lower()
        if decision not in {"pursue", "nurture", "drop"}:
            decision = fallback["decision"]
        qualification = {
            "score": score,
            "decision": decision,
            "reasons": llm.data.get("reasons") or fallback["reasons"],
            "used_llm": llm.used_model,
        }
    state["qualification"] = qualification
    state["skip_outreach"] = qualification["decision"] == "drop"
    _append_step(
        state,
        agent=AgentName.QUALIFICATION,
        status=StepStatus.SUCCEEDED,
        output=qualification,
        latency_ms=llm_ms,
        prompt_tokens=llm.prompt_tokens,
        completion_tokens=llm.completion_tokens,
    )
    return state


def _heuristic_outreach(lead: dict[str, Any], research: dict[str, Any], qualification: dict[str, Any]) -> dict[str, Any]:
    name = (lead.get("full_name") or "there").split(" ")[0]
    company = lead.get("company") or "your team"
    app = settings.app_name
    subject = f"Quick idea for {company}"
    body = (
        f"Hi {name},\n\n"
        f"I reviewed {company} and thought a lightweight operations workflow might help "
        f"your team research inbound leads and keep humans in the loop before outreach goes out.\n\n"
        f"Would you be open to a 15-minute walkthrough of {app}?\n\n"
        "Thanks,\nNexusFlow"
    )
    return {
        "to": lead.get("email"),
        "subject": subject,
        "body": body,
        "score": qualification.get("score"),
        "used_llm": False,
        "research_summary": research.get("summary"),
    }


def outreach_node(state: AgentState) -> AgentState:
    if state.get("skip_outreach"):
        _append_step(
            state,
            agent=AgentName.OUTREACH,
            status=StepStatus.SKIPPED,
            output={"reason": "qualification_drop"},
            latency_ms=0,
        )
        return state
    lead = _lead(state)
    research = state.get("research") or {}
    qualification = state.get("qualification") or {}
    fallback = _heuristic_outreach(lead, research, qualification)
    llm, llm_ms = _timed_llm(
        "You are an outreach agent. Return JSON with to, subject, body. Keep the email short, specific, and not salesy.",
        f"Lead: {lead}\nResearch: {research}\nQualification: {qualification}",
    )
    outreach = fallback
    if llm.data:
        outreach = {
            "to": llm.data.get("to") or fallback["to"],
            "subject": llm.data.get("subject") or fallback["subject"],
            "body": llm.data.get("body") or fallback["body"],
            "score": qualification.get("score"),
            "used_llm": llm.used_model,
            "research_summary": research.get("summary"),
        }
    state["outreach"] = outreach
    _append_step(
        state,
        agent=AgentName.OUTREACH,
        status=StepStatus.SUCCEEDED,
        output=outreach,
        latency_ms=llm_ms,
        prompt_tokens=llm.prompt_tokens,
        completion_tokens=llm.completion_tokens,
    )
    return state


def _heuristic_crm(lead: dict[str, Any], qualification: dict[str, Any]) -> dict[str, Any]:
    return {
        "object": "contact",
        "fields": {
            "email": lead.get("email"),
            "full_name": lead.get("full_name"),
            "company": lead.get("company"),
            "title": lead.get("title"),
            "phone": lead.get("phone"),
            "website": lead.get("website"),
            "fit_score": qualification.get("score"),
            "fit_decision": qualification.get("decision"),
            "source": lead.get("source"),
        },
        "used_llm": False,
    }


def crm_node(state: AgentState) -> AgentState:
    if state.get("skip_outreach"):
        _append_step(
            state,
            agent=AgentName.CRM,
            status=StepStatus.SKIPPED,
            output={"reason": "qualification_drop"},
            latency_ms=0,
        )
        return state
    lead = _lead(state)
    qualification = state.get("qualification") or {}
    fallback = _heuristic_crm(lead, qualification)
    llm, llm_ms = _timed_llm(
        "You are a CRM agent. Return JSON with object and fields (dict of CRM properties to write). Do not invent emails.",
        f"Lead: {lead}\nQualification: {qualification}",
    )
    proposal = fallback
    if llm.data:
        proposal = {
            "object": llm.data.get("object") or "contact",
            "fields": llm.data.get("fields") or fallback["fields"],
            "used_llm": llm.used_model,
        }
    state["crm_proposal"] = proposal
    _append_step(
        state,
        agent=AgentName.CRM,
        status=StepStatus.SUCCEEDED,
        output=proposal,
        latency_ms=llm_ms,
        prompt_tokens=llm.prompt_tokens,
        completion_tokens=llm.completion_tokens,
    )
    return state


def reporting_node(state: AgentState) -> AgentState:
    lead = _lead(state)
    qualification = state.get("qualification") or {}
    skip = bool(state.get("skip_outreach"))
    report = {
        "headline": (
            f"{lead.get('full_name')} scored {qualification.get('score')} "
            f"({qualification.get('decision')})."
        ),
        "decision": qualification.get("decision"),
        "score": qualification.get("score"),
        "skipped_outreach": skip,
        "next_human_action": (
            "No outreach or CRM write — lead dropped."
            if skip
            else "Review the email draft and CRM proposal in the approval inbox."
        ),
        "errors": list(state.get("errors") or []),
    }
    state["report"] = report
    _append_step(
        state,
        agent=AgentName.REPORTING,
        status=StepStatus.SUCCEEDED,
        output=report,
        latency_ms=0,
    )
    return state
