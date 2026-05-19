import Link from "next/link";

import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { getWebAuthSession } from "../../lib/auth-session";
import { loadClusterOptions, loadHostOptions } from "../../lib/inventory";
import { loadApprovals, loadDeposits } from "../../lib/workflows";

import { CreateApprovalForm } from "./create-form";

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

export default async function ApprovalsPage() {
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
