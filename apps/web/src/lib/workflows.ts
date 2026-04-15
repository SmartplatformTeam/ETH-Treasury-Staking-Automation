import {
  approvalRows as fallbackApprovalRows,
  auditRows as fallbackAuditRows,
  type ApprovalRow,
  type AuditRow
} from "@eth-staking/domain";

import { fetchApiJson } from "./api-client";

export type DepositDisplayRow = {
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
  depositRequest: {
    requestNumber: string;
  } | null;
};

type DepositApiItem = {
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

export async function loadApprovals(): Promise<ApprovalsResult> {
  try {
    const response = await fetchApiJson<ListResponse<ApprovalApiItem>>("/approvals");
    const rows: ApprovalRow[] = response.items.map((item) => ({
      resource: item.depositRequest?.requestNumber ?? `${item.resourceType}:${item.resourceId}`,
      policy: item.policyType,
      status: item.finalStatus,
      requestedBy: item.requestedBy.email
    }));

    return {
      total: response.total,
      activeQueueCount: countQueueRows(rows),
      rows
    };
  } catch {
    return {
      total: fallbackApprovalRows.length,
      activeQueueCount: countQueueRows(fallbackApprovalRows),
      rows: fallbackApprovalRows
    };
  }
}

export async function loadDeposits(): Promise<DepositsResult> {
  try {
    const response = await fetchApiJson<ListResponse<DepositApiItem>>("/deposits");
    const rows: DepositDisplayRow[] = response.items.map((item) => ({
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
