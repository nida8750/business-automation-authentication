export type CustomAgent = {
  id: string;
  name: string;
  role: string;
  tools: string;
  prompt: string;
  created_at: string;
};

export type CustomWorkflow = {
  id: string;
  name: string;
  trigger: string;
  agent_ids: string[];
  created_at: string;
};

const AGENTS_KEY = "nexaflow.customAgents";
const FLOWS_KEY = "nexaflow.customWorkflows";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, rows: T[]): void {
  localStorage.setItem(key, JSON.stringify(rows));
}

export function listCustomAgents(): CustomAgent[] {
  return read<CustomAgent>(AGENTS_KEY);
}

export function saveCustomAgent(input: Omit<CustomAgent, "id" | "created_at">): CustomAgent {
  const row: CustomAgent = {
    ...input,
    id: `agent-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  write(AGENTS_KEY, [row, ...listCustomAgents()]);
  return row;
}

export function listCustomWorkflows(): CustomWorkflow[] {
  return read<CustomWorkflow>(FLOWS_KEY);
}

export function saveCustomWorkflow(input: Omit<CustomWorkflow, "id" | "created_at">): CustomWorkflow {
  const row: CustomWorkflow = {
    ...input,
    id: `custom-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  write(FLOWS_KEY, [row, ...listCustomWorkflows()]);
  return row;
}

export function getCustomWorkflow(id: string): CustomWorkflow | undefined {
  return listCustomWorkflows().find((row) => row.id === id);
}

export function updateCustomWorkflow(id: string, patch: Partial<CustomWorkflow>): CustomWorkflow | undefined {
  const rows = listCustomWorkflows().map((row) => (row.id === id ? { ...row, ...patch, id: row.id } : row));
  write(FLOWS_KEY, rows);
  return rows.find((row) => row.id === id);
}

export function deleteCustomAgent(id: string): void {
  write(
    AGENTS_KEY,
    listCustomAgents().filter((row) => row.id !== id),
  );
  write(
    FLOWS_KEY,
    listCustomWorkflows().map((flow) => ({
      ...flow,
      agent_ids: flow.agent_ids.filter((agentId) => agentId !== id),
    })),
  );
}

export function deleteCustomWorkflow(id: string): void {
  write(
    FLOWS_KEY,
    listCustomWorkflows().filter((row) => row.id !== id),
  );
}
