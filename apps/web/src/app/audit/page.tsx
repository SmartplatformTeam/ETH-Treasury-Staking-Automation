import { DataTable, Panel } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { loadAuditLogs } from "../../lib/workflows";

export default async function AuditPage() {
  const auditLogs = await loadAuditLogs();

  return (
    <OpsShell
      currentPath="/audit"
      title="Audit"
      description="Every material action should leave an explicit trail across approval, export, rollout, and signer workflows."
    >
      <Panel
        title="Recent Events"
        description="This log is the anchor for operational defensibility. It is not a secondary reporting feature."
      >
        <DataTable
          columns={[
            { key: "actor", header: "Actor" },
            { key: "action", header: "Action" },
            { key: "resource", header: "Resource" },
            { key: "timestamp", header: "Timestamp" }
          ]}
          rows={auditLogs.rows}
        />
      </Panel>
    </OpsShell>
  );
}
