from langgraph.graph import END, START, StateGraph

from app.agents.nodes import (
    crm_node,
    outreach_node,
    qualification_node,
    reporting_node,
    research_node,
    supervisor_node,
)
from app.agents.state import AgentState


def build_agent_graph():
    graph = StateGraph(AgentState)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("research", research_node)
    graph.add_node("qualification", qualification_node)
    graph.add_node("outreach", outreach_node)
    graph.add_node("crm", crm_node)
    graph.add_node("reporting", reporting_node)
    graph.add_edge(START, "supervisor")
    graph.add_edge("supervisor", "research")
    graph.add_edge("research", "qualification")
    graph.add_edge("qualification", "outreach")
    graph.add_edge("outreach", "crm")
    graph.add_edge("crm", "reporting")
    graph.add_edge("reporting", END)
    return graph.compile()


agent_graph = build_agent_graph()
