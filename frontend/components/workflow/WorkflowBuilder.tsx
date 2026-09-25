"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Badge, Button, Card, Field } from "@/components/ui";
import { api, ApiError } from "@/lib/api/client";
import type { Lead } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  getCustomWorkflow,
  listCustomAgents,
  saveCustomAgent,
  updateCustomWorkflow,
  type CustomAgent,
  type CustomWorkflow,
} from "@/lib/custom-desk";

type Kind = "trigger" | "agent" | "approval" | "end";

type FlowNode = Node<{ label: string; kind: Kind; detail: string }>;

const kindTone: Record<Kind, string> = {
  trigger: "border-sky-400/50 bg-sky-500/10",
  agent: "border-violet-400/50 bg-violet-500/10",
  approval: "border-fuchsia-400/50 bg-fuchsia-500/10",
  end: "border-white/20 bg-white/5",
};

function KindNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div className={`min-w-[180px] rounded-2xl border px-3 py-2 text-left ${kindTone[data.kind]} ${selected ? "ring-2 ring-sky-400" : ""}`}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-sky-400" />
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">{data.kind}</p>
      <p className="text-sm font-medium">{data.label}</p>
      <p className="text-[11px] opacity-70">{data.detail}</p>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-teal-300" />
    </div>
  );
}

const nodeTypes = { kind: KindNode };

const initialNodes: FlowNode[] = [
  { id: "t", type: "kind", position: { x: 40, y: 140 }, data: { kind: "trigger", label: "Lead created", detail: "POST /leads" } },
  { id: "supervisor", type: "kind", position: { x: 260, y: 140 }, data: { kind: "agent", label: "supervisor", detail: "Route the run" } },
  { id: "research", type: "kind", position: { x: 480, y: 140 }, data: { kind: "agent", label: "research", detail: "Firm + contact" } },
  { id: "qualification", type: "kind", position: { x: 700, y: 140 }, data: { kind: "agent", label: "qualification", detail: "Score fit" } },
  { id: "outreach", type: "kind", position: { x: 480, y: 280 }, data: { kind: "agent", label: "outreach", detail: "Draft email" } },
  { id: "approval", type: "kind", position: { x: 700, y: 280 }, data: { kind: "approval", label: "Human inbox", detail: "POST /approvals/:id" } },
  { id: "crm", type: "kind", position: { x: 920, y: 280 }, data: { kind: "agent", label: "crm", detail: "CRM proposal" } },
  { id: "reporting", type: "kind", position: { x: 1140, y: 280 }, data: { kind: "agent", label: "reporting", detail: "Write report" } },
  { id: "end", type: "kind", position: { x: 1360, y: 280 }, data: { kind: "end", label: "Outbox", detail: "Deliver / retry" } },
];

function nodesForCustom(flow: CustomWorkflow, agents: CustomAgent[]): FlowNode[] {
  const selected = agents.filter((agent) => flow.agent_ids.includes(agent.id));
  const nodes: FlowNode[] = [
    { id: "t", type: "kind", position: { x: 40, y: 160 }, data: { kind: "trigger", label: flow.trigger || "Manual start", detail: flow.name } },
  ];
  selected.forEach((agent, i) => {
    nodes.push({
      id: agent.id,
      type: "kind",
      position: { x: 260 + i * 220, y: 160 },
      data: { kind: "agent", label: agent.name, detail: agent.role || "Custom agent" },
    });
  });
  nodes.push({
    id: "end",
    type: "kind",
    position: { x: 260 + selected.length * 220, y: 160 },
    data: { kind: "end", label: "Done", detail: "Custom workflow" },
  });
  return nodes;
}

function edgesForCustom(nodes: FlowNode[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    edges.push({ id: `e-${nodes[i].id}-${nodes[i + 1].id}`, source: nodes[i].id, target: nodes[i + 1].id, animated: true });
  }
  return edges;
}

const initialEdges: Edge[] = [
  { id: "e1", source: "t", target: "supervisor", animated: true },
  { id: "e2", source: "supervisor", target: "research", animated: true },
  { id: "e3", source: "research", target: "qualification", animated: true },
  { id: "e4", source: "qualification", target: "outreach", animated: true },
  { id: "e5", source: "outreach", target: "approval" },
  { id: "e6", source: "approval", target: "crm" },
  { id: "e7", source: "crm", target: "reporting", animated: true },
  { id: "e8", source: "reporting", target: "end" },
];

export function WorkflowBuilder({ workflowId }: { workflowId: string }) {
  const router = useRouter();
  const { canWriteLeads } = useAuth();
  const custom = workflowId !== "lead-graph";
  const [flow, setFlow] = useState<CustomWorkflow | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selected, setSelected] = useState<FlowNode | null>(initialNodes[1]);
  const [tab, setTab] = useState<"config" | "test" | "versions" | "logs">("config");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("demo.lead@example.com");
  const [name, setName] = useState("Demo Lead");
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [agentTools, setAgentTools] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");

  useEffect(() => {
    if (!custom) return;
    const saved = getCustomWorkflow(workflowId);
    setFlow(saved ?? null);
    if (!saved) return;
    const next = nodesForCustom(saved, listCustomAgents());
    setNodes(next);
    setEdges(edgesForCustom(next));
    setSelected(next[1] ?? next[0] ?? null);
  }, [custom, workflowId, setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)), [setEdges]);

  const selectedId = selected?.id;
  const liveSelected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);

  function addCustomAgent(e: FormEvent) {
    e.preventDefault();
    if (!agentName.trim()) return;
    const row = saveCustomAgent({
      name: agentName.trim(),
      role: agentRole.trim() || "Custom agent",
      tools: agentTools.trim(),
      prompt: agentPrompt.trim(),
    });
    const node: FlowNode = {
      id: row.id,
      type: "kind",
      position: { x: 260 + nodes.length * 40, y: 80 + (nodes.length % 4) * 70 },
      data: { kind: "agent", label: row.name, detail: row.role },
    };
    setNodes((current) => {
      const withoutEnd = current.filter((n) => n.id !== "end");
      const end = current.find((n) => n.id === "end") ?? {
        id: "end",
        type: "kind",
        position: { x: 260 + withoutEnd.length * 220, y: 160 },
        data: { kind: "end" as const, label: "Done", detail: "Custom workflow" },
      };
      return [...withoutEnd, node, { ...end, position: { x: 260 + withoutEnd.length * 220, y: 160 } }];
    });
    setEdges((current) => {
      const last = nodes.filter((n) => n.id !== "end").at(-1);
      const extra: Edge[] = [];
      if (last) extra.push({ id: `e-${last.id}-${row.id}`, source: last.id, target: row.id, animated: true });
      extra.push({ id: `e-${row.id}-end`, source: row.id, target: "end", animated: true });
      return [...current.filter((edge) => edge.target !== "end"), ...extra];
    });
    if (flow) {
      const next = updateCustomWorkflow(flow.id, { agent_ids: [...flow.agent_ids, row.id] });
      if (next) setFlow(next);
    }
    setAgentName("");
    setAgentRole("");
    setAgentTools("");
    setAgentPrompt("");
    setStatus(`Added custom agent “${row.name}”.`);
    setSelected(node);
  }

  async function runLive() {
    if (!canWriteLeads) {
      setError("Only admin or operator can start the graph.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const lead = await api<Lead>("/leads", {
        method: "POST",
        body: {
          full_name: name,
          email,
          notes: "Started from LangGraph canvas Test run.",
          start_run: true,
        },
      });
      setStatus(`Queued live graph for ${lead.full_name}.`);
      router.push(`/app/leads/${lead.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the graph.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[640px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[rgb(var(--muted))]">{workflowId}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{custom ? flow?.name || "Custom workflow" : "Lead graph"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/" variant="ghost">
            Home
          </Button>
          <Button href="/app/workflows" variant="ghost">
            Workflows
          </Button>
          <Button href="/app/admin" variant="ghost">
            Admin
          </Button>
          {!custom ? (
            <Button variant="ghost" onClick={() => void runLive()} disabled={busy}>
              {busy ? "Queuing…" : "Test run (live API)"}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex min-h-[520px] flex-1 flex-col gap-3 lg:flex-row">
      <div className="flex min-h-[380px] min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-line">
        <div className="relative min-h-[380px] flex-1 bg-[#070b14]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelected(node as FlowNode)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} color="rgba(148,163,184,0.15)" />
            <MiniMap pannable zoomable maskColor="rgba(6,8,15,0.7)" />
            <Controls />
          </ReactFlow>
        </div>
      </div>
      <aside className="w-full shrink-0 lg:w-80">
        <Card className="h-full">
          <div className="flex flex-wrap gap-1">
            {(["config", "test", "versions", "logs"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs ${tab === t ? "bg-white/10" : "text-[rgb(var(--muted))]"}`}
              >
                {t}
              </button>
            ))}
          </div>
          {status ? (
            <p className="mt-3 text-xs text-teal-300" role="status">
              {status}
            </p>
          ) : null}
          {tab === "config" ? (
            <div className="mt-4 space-y-4 text-sm">
              {liveSelected ? (
                <div className="space-y-3">
                  <Badge>{liveSelected.data.kind}</Badge>
                  <p className="text-lg font-medium">{liveSelected.data.label}</p>
                  <p className="text-[rgb(var(--muted))]">{liveSelected.data.detail}</p>
                  {liveSelected.data.kind === "approval" ? (
                    <p>Outreach and CRM wait in /app/inbox until a reviewer approves.</p>
                  ) : null}
                </div>
              ) : null}
              <form className="space-y-2 rounded-2xl border border-line p-3" onSubmit={addCustomAgent}>
                <p className="font-medium">Custom agent box</p>
                <Field label="Name" value={agentName} onChange={(e) => setAgentName(e.target.value)} required />
                <Field label="Role" value={agentRole} onChange={(e) => setAgentRole(e.target.value)} />
                <Field label="Tools" value={agentTools} onChange={(e) => setAgentTools(e.target.value)} />
                <label className="block text-xs text-[rgb(var(--muted))]">
                  Prompt
                  <textarea
                    className="mt-1 w-full rounded-xl border border-line bg-transparent px-3 py-2 text-sm"
                    rows={2}
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                  />
                </label>
                <Button type="submit" className="w-full">
                  Add custom agent
                </Button>
              </form>
            </div>
          ) : null}
          {tab === "test" ? (
            custom ? (
              <p className="mt-4 text-sm text-[rgb(var(--muted))]">
                Custom workflows stay on this desk. Use the lead graph canvas to queue a live POST /leads run.
              </p>
            ) : (
            <div className="mt-4 space-y-3 text-sm">
              <label className="block text-xs text-[rgb(var(--muted))]">
                Full name
                <input className="mt-1 w-full rounded-xl border border-line bg-transparent px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block text-xs text-[rgb(var(--muted))]">
                Email
                <input className="mt-1 w-full rounded-xl border border-line bg-transparent px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <Button onClick={() => void runLive()} disabled={busy}>
                {busy ? "Queuing…" : "POST /leads + start_run"}
              </Button>
            </div>
            )
          ) : null}
          {tab === "versions" ? (
            <p className="mt-4 text-sm text-[rgb(var(--muted))]">Graph is compiled in backend/app/agents/graph.py. Canvas layout is a preview of those six nodes.</p>
          ) : null}
          {tab === "logs" ? (
            <p className="mt-4 text-sm text-[rgb(var(--muted))]">Step logs live on each run trace at /app/runs/:id.</p>
          ) : null}
        </Card>
      </aside>
      </div>
    </div>
  );
}
