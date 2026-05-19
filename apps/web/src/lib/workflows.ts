import {
  approvalRows as fallbackApprovalRows,
  auditRows as fallbackAuditRows,
  type ApprovalRow,
  type AuditRow
} from "@eth-staking/domain";

import { fetchApiJson } from "./api-client";

export type DepositDisplayRow = {
  id: string;
  request: string;
  approvalPolicy: string;
  status: string;
  requestedBy: string;
  exportTarget: string;
};

type ApprovalApiItem = {
  resourceType: string;
  resourceId: string;
  policyType: string;
  finalStatus: string;
  requestedBy: {
    email: string;
    name: string;
  };
  approvedBy: {
    email: string;
    name: string;
  } | null;
  rejectedBy: {
    email: string;
    name: string;
  } | null;
  depositRequest: {
    requestNumber: string;
  } | null;
};

type DepositApiItem = {
  id: string;
  requestNumber: string;
  approvalStatus: string;
  executionStatus: string;
  requestedBy: {
    email: string;
    name: string;
  };
  treasuryAccount: {
    label: string;
    safeAddress: string;
  } | null;
  latestApproval: {
    policyType: string;
  } | null;
};

type AuditLogApiItem = {
  actionType: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  actor: {
    email: string;
    name: string;
  } | null;
};

type ListResponse<Item> = {
  total: number;
  items: Item[];
};

type ApprovalsResult = {
  total: number;
  activeQueueCount: number;
  rows: ApprovalRow[];
  idByIndex: string[];
};

type DepositsResult = {
  total: number;
  rows: DepositDisplayRow[];
};

type AuditLogsResult = {
  total: number;
  rows: AuditRow[];
};

const fallbackDepositRows: DepositDisplayRow[] = fallbackApprovalRows.map((row) => ({
  id: "",
  request: row.resource,
  approvalPolicy: row.policy,
  status: row.status,
  requestedBy: row.requestedBy,
  exportTarget: "Safe OVM account"
}));

function countQueueRows(rows: ApprovalRow[]) {
  return rows.filter(
    (row) => row.status.toUpperCase().includes("REQUESTED") || row.status.toUpperCase().includes("REVIEW")
  ).length;
}

export type ApprovalDetail = {
  id: string;
  resourceType: string;
  resourceId: string;
  policyType: string;
  finalStatus: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  requestedBy: { id: string; email: string; name: string; role: string };
  approvedBy: { id: string; email: string; name: string; role: string } | null;
  rejectedBy: { id: string; email: string; name: string; role: string } | null;
  depositRequest: {
    id: string;
    requestNumber: string;
    approvalStatus: string;
    executionStatus: string;
  } | null;
  clusterId: string | null;
  hostId: string | null;
  automationOperation: string | null;
};

type ApprovalDetailApiItem = ApprovalApiItem & {
  id: string;
  createdAt: string;
  updatedAt: string;
  currentStep: number;
  clusterId?: string | null;
  hostId?: string | null;
  automationOperation?: string | null;
  depositRequest:
    | {
        id: string;
        requestNumber: string;
        approvalStatus: string;
        executionStatus: string;
      }
    | null;
};

export type ApprovalAuditEntry = {
  id: string;
  actionType: string;
  actorEmail: string;
  actorName: string;
  diff: Record<string, unknown> | null;
  createdAt: string;
};

export async function loadApproval(id: string): Promise<ApprovalDetail | null> {
  try {
    const item = await fetchApiJson<ApprovalDetailApiItem>(`/approvals/${encodeURIComponent(id)}`);
    return {
      id: item.id,
      resourceType: item.resourceType,
      resourceId: item.resourceId,
      policyType: item.policyType,
      finalStatus: item.finalStatus,
      currentStep: item.currentStep,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      requestedBy: item.requestedBy as ApprovalDetail["requestedBy"],
      approvedBy: item.approvedBy as ApprovalDetail["approvedBy"],
      rejectedBy: item.rejectedBy as ApprovalDetail["rejectedBy"],
      depositRequest: item.depositRequest,
      clusterId: item.clusterId ?? null,
      hostId: item.hostId ?? null,
      automationOperation: item.automationOperation ?? null
    };
  } catch {
    return null;
  }
}

export async function loadApprovalAuditEntries(approvalId: string): Promise<ApprovalAuditEntry[]> {
  try {
    const response = await fetchApiJson<ListResponse<AuditLogApiItem & {
      id: string;
      diff: Record<string, unknown> | null;
    }>>(
      `/audit-logs?resourceType=Approval&limit=50`
    );
    return response.items
      .filter((item) => item.resourceType === "Approval" && (item as { resourceId: string }).resourceId === approvalId)
      .map((item) => ({
        id: item.id,
        actionType: item.actionType,
        actorEmail: item.actor?.email ?? "system",
        actorName: item.actor?.name ?? "system",
        diff: item.diff,
        createdAt: item.createdAt
      }));
  } catch {
    return [];
  }
}

export type ApprovalOptionForAutomation = {
  id: string;
  resourceId: string;
  createdAt: string;
};

const ROLLOUT_OPERATIONS_TO_POLICY: Record<string, string> = {
  ROLLOUT_EXECUTE: "ROLLOUT",
  COMPOSE_EXECUTE: "ROLLOUT",
  FULL_OPERATOR_MVP: "ROLLOUT",
  STAGE_ARTIFACTS_EXECUTE: "CHARON_ARTIFACT_STAGE"
};

export function expectedPolicyForOperation(operation: string): string | null {
  return ROLLOUT_OPERATIONS_TO_POLICY[operation] ?? null;
}

export type ApprovedApprovalForAutomation = {
  id: string;
  resourceId: string;
  clusterId: string | null;
  hostId: string | null;
  policyType: string;
  automationOperation: string | null;
  createdAt: string;
};

export async function loadApprovedApprovalsForAutomation(): Promise<
  ApprovedApprovalForAutomation[]
> {
  try {
    const search = new URLSearchParams({ status: "APPROVED", limit: "100" });
    const response = await fetchApiJson<
      ListResponse<
        ApprovalApiItem & {
          id: string;
          createdAt: string;
          clusterId?: string | null;
          hostId?: string | null;
          automationOperation?: string | null;
        }
      >
    >(`/approvals?${search.toString()}`);
    return response.items.map((item) => ({
      id: item.id,
      resourceId: item.resourceId,
      clusterId: item.clusterId ?? null,
      hostId: item.hostId ?? null,
      policyType: item.policyType,
      automationOperation: item.automationOperation ?? null,
      createdAt: item.createdAt
    }));
  } catch {
    return [];
  }
}

export async function loadApprovalsForAutomation(params: {
  clusterId: string;
  hostId: string;
  automationOperation: string;
}): Promise<ApprovalOptionForAutomation[]> {
  const policyType = expectedPolicyForOperation(params.automationOperation);
  if (!policyType) return [];

  try {
    const search = new URLSearchParams({
      status: "APPROVED",
      policyType,
      clusterId: params.clusterId,
      hostId: params.hostId,
      automationOperation: params.automationOperation,
      limit: "20"
    });
    const response = await fetchApiJson<ListResponse<ApprovalApiItem & { id: string; createdAt: string }>>(
      `/approvals?${search.toString()}`
    );
    return response.items.map((item) => ({
      id: item.id,
      resourceId: item.resourceId,
      createdAt: item.createdAt
    }));
  } catch {
    return [];
  }
}

export async function loadApprovals(): Promise<ApprovalsResult> {
  try {
    const response = await fetchApiJson<ListResponse<ApprovalApiItem & { id: string }>>(
      "/approvals"
    );
    const idByIndex: string[] = [];
    const rows: ApprovalRow[] = response.items.map((item) => {
      idByIndex.push(item.id);
      return {
        resource: item.depositRequest?.requestNumber ?? `${item.resourceType}:${item.resourceId}`,
        policy: item.policyType,
        status: item.finalStatus,
        requestedBy: item.requestedBy.email,
        decidedBy: item.approvedBy?.email ?? item.rejectedBy?.email ?? "—"
      };
    });

    return {
      total: response.total,
      activeQueueCount: countQueueRows(rows),
      rows,
      idByIndex
    };
  } catch {
    return {
      total: fallbackApprovalRows.length,
      activeQueueCount: countQueueRows(fallbackApprovalRows),
      rows: fallbackApprovalRows,
      idByIndex: fallbackApprovalRows.map(() => "")
    };
  }
}

export async function loadDeposits(): Promise<DepositsResult> {
  try {
    const response = await fetchApiJson<ListResponse<DepositApiItem>>("/deposits");
    const rows: DepositDisplayRow[] = response.items.map((item) => ({
      id: item.id,
      request: item.requestNumber,
      approvalPolicy: item.latestApproval?.policyType ?? "DEPOSIT_REQUEST",
      status: `${item.approvalStatus} / ${item.executionStatus}`,
      requestedBy: item.requestedBy.email,
      exportTarget: item.treasuryAccount?.label ?? "Safe OVM account"
    }));

    return {
      total: response.total,
      rows
    };
  } catch {
    return {
      total: fallbackDepositRows.length,
      rows: fallbackDepositRows
    };
  }
}

export async function loadAuditLogs(): Promise<AuditLogsResult> {
  try {
    const response = await fetchApiJson<ListResponse<AuditLogApiItem>>("/audit-logs");
    const rows: AuditRow[] = response.items.map((item) => ({
      actor: item.actor?.email ?? "system",
      action: item.actionType,
      resource: `${item.resourceType}:${item.resourceId}`,
      timestamp: item.createdAt
    }));

    return {
      total: response.total,
      rows
    };
  } catch {
    return {
      total: fallbackAuditRows.length,
      rows: fallbackAuditRows
    };
  }
}
