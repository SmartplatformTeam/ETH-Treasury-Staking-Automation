import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { loadDeposits } from "../../lib/workflows";

export default async function DepositsPage() {
  const deposits = await loadDeposits();

  return (
    <OpsShell
      currentPath="/deposits"
      title="Deposits"
      description="Deposit requests, DKG tracking, validation state, and Safe export stay within the approval-controlled flow."
    >
      <Panel
        title="Deposit Requests"
        description="No deposit submit path is automated here. Export and tracking come first, execution stays outside the app."
      >
        <DataTable
          columns={[
            { key: "request", header: "Request" },
            { key: "approvalPolicy", header: "Policy" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
              )
            },
            { key: "requestedBy", header: "Requested By" },
            { key: "exportTarget", header: "Export Target" }
          ]}
          rows={deposits.rows}
        />
      </Panel>
    </OpsShell>
  );
}
