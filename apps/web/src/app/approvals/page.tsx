import Link from "next/link";

import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { getWebAuthSession } from "../../lib/auth-session";
import { loadClusterOptions, loadHostOptions } from "../../lib/inventory";
import { loadApprovals, loadDeposits } from "../../lib/workflows";

import { CreateApprovalForm, type ApprovalPrefill } from "./create-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function decodePrefill(raw: string | undefined): ApprovalPrefill | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    const policyType =
      parsed.policyType === "ROLLOUT" || parsed.policyType === "DEPOSIT_REQUEST"
        ? parsed.policyType
        : undefined;
    const out: ApprovalPrefill = {};
    if (policyType) out.policyType = policyType;
    if (typeof parsed.clusterId === "string") out.clusterId = parsed.clusterId;
    if (typeof parsed.hostId === "string") out.hostId = parsed.hostId;
    if (typeof parsed.automationOperation === "string")
      out.automationOperation = parsed.automationOperation;
    if (typeof parsed.depositRequestId === "string")
      out.depositRequestId = parsed.depositRequestId;
    return out;
  } catch {
    return null;
  }
}

const ROLLOUT_OPERATIONS = [
  "ROLLOUT_EXECUTE",
  "STAGE_ARTIFACTS_EXECUTE",
  "COMPOSE_EXECUTE",
  "FULL_OPERATOR_MVP"
];

type ApprovalDisplayRow = {
  id: string;
  resource: string;
  policy: string;
  status: string;
  requestedBy: string;
  decidedBy: string;
};

export default async function ApprovalsPage(props: { searchParams?: SearchParams }) {
  const params = (await props.searchParams) ?? {};
  const prefillRaw = firstQueryValue(params.prefill);
  const prefill = decodePrefill(prefillRaw);
  const [approvals, session, clusters, hosts, deposits] = await Promise.all([
    loadApprovals(),
    getWebAuthSession(),
    loadClusterOptions(),
    loadHostOptions(),
    loadDeposits()
  ]);

  const canCreateRollout = session.role === "ADMIN" || session.role === "INFRA_OPERATOR";
  const canCreateDeposit = session.role === "ADMIN" || session.role === "TREASURY_OPERATOR";

  const rows: ApprovalDisplayRow[] = approvals.rows.map((row, index) => ({
    id: approvals.idByIndex[index] ?? "",
    resource: row.resource,
    policy: row.policy,
    status: row.status,
    requestedBy: row.requestedBy,
    decidedBy: row.decidedBy
  }));

  return (
    <OpsShell
      currentPath="/approvals"
      title="Approvals"
      description="Risky actions remain separated from automation and move through explicit policy-driven approval stages."
    >
      <CreateApprovalForm
        canCreateRollout={canCreateRollout}
        canCreateDeposit={canCreateDeposit}
        clusters={clusters}
        hosts={hosts}
        deposits={deposits.rows.map((row) => ({ id: row.id, requestNumber: row.request }))}
        rolloutOperations={ROLLOUT_OPERATIONS}
        prefill={prefill}
      />

      <Panel
        title="Approval Queue"
        description="Click a row to open detail, audit trail, and (for APPROVER/ADMIN) decision controls."
      >
        <DataTable
          columns={[
            {
              key: "resource",
              header: "Resource",
              render: (row) =>
                row.id ? (
                  <Link
                    href={`/approvals/${row.id}`}
                    className="text-[var(--miro-ink)] underline-offset-2 hover:underline"
                  >
                    {row.resource}
                  </Link>
                ) : (
                  <span>{row.resource}</span>
                )
            },
            { key: "policy", header: "Policy" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
              )
            },
            { key: "requestedBy", header: "Requested By" },
            { key: "decidedBy", header: "Decided By" }
          ]}
          rows={rows}
        />
      </Panel>
    </OpsShell>
  );
}
