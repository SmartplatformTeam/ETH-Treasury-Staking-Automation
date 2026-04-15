import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { loadApprovals } from "../../lib/workflows";

export default async function ApprovalsPage() {
  const approvals = await loadApprovals();

  return (
    <OpsShell
      currentPath="/approvals"
      title="Approvals"
      description="Risky actions remain separated from automation and move through explicit policy-driven approval stages."
    >
      <Panel
        title="Approval Queue"
        description="Deposit requests, signer changes, and rollout actions all route through a unified approval surface."
      >
        <DataTable
          columns={[
            { key: "resource", header: "Resource" },
            { key: "policy", header: "Policy" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
              )
            },
            { key: "requestedBy", header: "Requested By" }
          ]}
          rows={approvals.rows}
        />
      </Panel>
    </OpsShell>
  );
}
