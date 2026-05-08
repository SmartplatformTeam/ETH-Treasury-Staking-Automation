import "server-only";

import { fetchApiJson, postApiJson } from "./api-client";

export type AutomationRun = {
  runId: string;
  status: string;
  operation: string;
  clusterId: string | null;
  hostId: string | null;
  approvalId: string | null;
  playbook: string;
  inventoryRef: string;
  dryRun: boolean;
  startedAt: string | null;
  completedAt: string | null;
  exitCode: number | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  events?: AutomationRunEvent[];
};

export type AutomationRunEvent = {
  id: string;
  sequence: number;
  stream: string;
  message: string;
  redacted: boolean;
  createdAt: string;
};

export type AutomationOption = {
  id: string;
  name: string;
  clusterId?: string | null;
  clusterName?: string | null;
};

type ListResponse<T> = {
  total: number;
  items: T[];
};

type ClusterItem = {
  id: string;
  name: string;
};

type HostItem = {
  id: string;
  name: string;
  clusterId: string | null;
  clusterName: string | null;
};

export async function loadAutomationOptions() {
  try {
    const [clusters, hosts] = await Promise.all([
      fetchApiJson<ListResponse<ClusterItem>>("/inventory/clusters"),
      fetchApiJson<ListResponse<HostItem>>("/inventory/hosts"),
    ]);

    return {
      clusters: clusters.items.map((cluster) => ({ id: cluster.id, name: cluster.name })),
      hosts: hosts.items.map((host) => ({
        id: host.id,
        name: host.name,
        clusterId: host.clusterId,
        clusterName: host.clusterName,
      })),
      unavailable: false,
    };
  } catch {
    return {
      clusters: [] as AutomationOption[],
      hosts: [] as AutomationOption[],
      unavailable: true,
    };
  }
}

export async function loadAutomationRuns() {
  try {
    return await fetchApiJson<ListResponse<AutomationRun>>("/automation/runs?limit=25");
  } catch {
    return {
      total: 0,
      items: [],
    };
  }
}

export async function loadAutomationRun(runId: string) {
  try {
    return await fetchApiJson<AutomationRun>(`/automation/runs/${runId}`);
  } catch {
    return null;
  }
}

export async function createAutomationRun(body: {
  operation: string;
  clusterId: string;
  hostId: string;
  dryRun: boolean;
  approvalId?: string;
  extraVars?: Record<string, string | boolean>;
}) {
  return postApiJson<AutomationRun>("/automation/runs", body);
}
