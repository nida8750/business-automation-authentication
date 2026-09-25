"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Workflow } from "lucide-react";

import { Badge, Button, Card, Field } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { AgentRun, Page } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  deleteCustomAgent,
  deleteCustomWorkflow,
  listCustomAgents,
  listCustomWorkflows,
  saveCustomAgent,
  saveCustomWorkflow,
  type CustomAgent,
  type CustomWorkflow,
} from "@/lib/custom-desk";

const NODES = ["supervisor", "research", "qualification", "outreach", "crm", "reporting"];

export default function WorkflowsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [flows, setFlows] = useState<CustomWorkflow[]>([]);
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [agentTools, setAgentTools] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [flowName, setFlowName] = useState("");
  const [flowTrigger, setFlowTrigger] = useState("Manual start");
  const [picked, setPicked] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  function refreshDesk() {
    setAgents(listCustomAgents());
    setFlows(listCustomWorkflows());
  }

  useEffect(() => {
    refreshDesk();
    api<Page<AgentRun>>("/runs?page_size=8")
      .then((page) => setRuns(page.items))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load runs."));
  }, []);

  function addAgent(e: FormEvent) {
    e.preventDefault();
    if (!agentName.trim()) return;
    const row = saveCustomAgent({
      name: agentName.trim(),
      role: agentRole.trim() || "Custom agent",
      tools: agentTools.trim(),
      prompt: agentPrompt.trim(),
    });
    refreshDesk();
    setPicked((ids) => [...ids, row.id]);
    setAgentName("");
    setAgentRole("");
    setAgentTools("");
    setAgentPrompt("");
    setFlash(`Saved custom agent “${row.name}”.`);
  }

  function addWorkflow(e: FormEvent) {
    e.preventDefault();
    if (!flowName.trim()) return;
    const row = saveCustomWorkflow({
      name: flowName.trim(),
      trigger: flowTrigger.trim() || "Manual start",
      agent_ids: picked,
    });
    refreshDesk();
    setFlowName("");
    setFlash(`Saved custom workflow “${row.name}”.`);
    router.push(`/app/workflows/${row.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--muted))]">Workflows</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            Build a custom agent box, assemble a custom workflow, or open the live lead graph.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/" variant="ghost">
            Home
          </Button>
          {isAdmin ? <Button href="/app/admin">Admin</Button> : null}
          <Button href="/app/workflows/lead-graph">Open lead graph</Button>
        </div>
      </div>

      {flash ? <p className="text-sm text-teal-300">{flash}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-violet-400/30 bg-violet-500/5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[rgb(var(--muted))]">Custom agent</p>
              <h2 className="text-lg font-medium">Agent box</h2>
            </div>
          </div>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">Create a desk agent, then drop it into a custom workflow.</p>
          <form className="mt-4 space-y-3" onSubmit={addAgent}>
            <Field label="Agent name" value={agentName} onChange={(e) => setAgentName(e.target.value)} required />
            <Field label="Role" value={agentRole} onChange={(e) => setAgentRole(e.target.value)} placeholder="Research, follow-up, scoring…" />
            <Field label="Tools" value={agentTools} onChange={(e) => setAgentTools(e.target.value)} placeholder="CRM, inbox, notes" />
            <label className="block text-sm">
              <span className="text-[rgb(var(--muted))]">Prompt / brief</span>
              <textarea
                className="mt-1.5 w-full rounded-2xl border border-line bg-[rgb(var(--bg))] px-3.5 py-2.5 outline-none"
                rows={3}
                value={agentPrompt}
                onChange={(e) => setAgentPrompt(e.target.value)}
              />
            </label>
            <Button type="submit">Save custom agent</Button>
          </form>
        </Card>

        <Card className="border border-sky-400/30 bg-sky-500/5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-200">
              <Workflow className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[rgb(var(--muted))]">Custom workflow</p>
              <h2 className="text-lg font-medium">Workflow box</h2>
            </div>
          </div>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">Pick custom agents, name the flow, then open the canvas.</p>
          <form className="mt-4 space-y-3" onSubmit={addWorkflow}>
            <Field label="Workflow name" value={flowName} onChange={(e) => setFlowName(e.target.value)} required />
            <Field label="Trigger" value={flowTrigger} onChange={(e) => setFlowTrigger(e.target.value)} />
            <fieldset>
              <legend className="text-sm text-[rgb(var(--muted))]">Agents in this flow</legend>
              <ul className="mt-2 space-y-2">
                {agents.length === 0 ? (
                  <li className="text-sm text-[rgb(var(--muted))]">Save a custom agent first.</li>
                ) : (
                  agents.map((agent) => (
                    <li key={agent.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={picked.includes(agent.id)}
                          onChange={() =>
                            setPicked((ids) => (ids.includes(agent.id) ? ids.filter((id) => id !== agent.id) : [...ids, agent.id]))
                          }
                        />
                        {agent.name}
                      </label>
                    </li>
                  ))
                )}
              </ul>
            </fieldset>
            <Button type="submit">Save custom workflow</Button>
          </form>
        </Card>
      </div>

      {agents.length ? (
        <div>
          <h2 className="mb-3 text-lg font-medium">Your custom agent boxes</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="border border-violet-400/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--muted))]">{agent.role}</p>
                  </div>
                  <Badge tone="violet">custom</Badge>
                </div>
                {agent.tools ? <p className="mt-3 text-xs text-[rgb(var(--muted))]">{agent.tools}</p> : null}
                {agent.prompt ? <p className="mt-2 line-clamp-3 text-sm text-[rgb(var(--muted))]">{agent.prompt}</p> : null}
                <button
                  type="button"
                  className="mt-4 text-xs text-rose-300 hover:underline"
                  onClick={() => {
                    deleteCustomAgent(agent.id);
                    setPicked((ids) => ids.filter((id) => id !== agent.id));
                    refreshDesk();
                    setFlash(`Removed agent “${agent.name}”.`);
                  }}
                >
                  Delete
                </button>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {flows.length ? (
        <Card>
          <h2 className="font-medium">Your custom workflows</h2>
          <ul className="mt-4 space-y-2">
            {flows.map((flow) => (
              <li key={flow.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{flow.name}</p>
                  <p className="text-xs text-[rgb(var(--muted))]">
                    {flow.trigger} · {flow.agent_ids.length} agent{flow.agent_ids.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button href={`/app/workflows/${flow.id}`} variant="ghost" className="px-4 py-1.5 text-xs">
                    Open canvas
                  </Button>
                  <button
                    type="button"
                    className="rounded-full border border-line px-3 py-1 text-xs text-rose-300"
                    onClick={() => {
                      deleteCustomWorkflow(flow.id);
                      refreshDesk();
                      setFlash(`Removed workflow “${flow.name}”.`);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="font-medium">Lead graph</h2>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">Live LangGraph pipeline. Test run hits POST /leads.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {NODES.map((node) => (
            <Badge key={node} tone="ok">
              {node}
            </Badge>
          ))}
        </div>
        <Button href="/app/workflows/lead-graph" className="mt-4">
          Open lead graph
        </Button>
      </Card>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <Card>
        <h2 className="font-medium">Recent executions</h2>
        <ul className="mt-4 space-y-2">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2 text-sm">
              <Link className="font-mono text-sky-300" href={`/app/runs/${run.id}`}>
                {run.id.slice(0, 8)}
              </Link>
              <span className="text-[rgb(var(--muted))]">{run.status}</span>
            </li>
          ))}
        </ul>
        {runs.length === 0 && !error ? <p className="mt-4 text-sm text-[rgb(var(--muted))]">No runs yet. Start one from Home or New lead.</p> : null}
      </Card>
    </div>
  );
}
