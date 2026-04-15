import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { loadNodeInventory } from "../../lib/inventory";

export default async function NodesPage() {
  const inventory = await loadNodeInventory();

  return (
    <OpsShell
      currentPath="/nodes"
      title="Nodes"
      description="Host, client, and heartbeat visibility across the four bare-metal operator servers."
    >
      <Panel
        title="Runtime Nodes"
        description="Execution, consensus, charon, validator, and signer services are modeled as auditable runtime inventory."
      >
        <DataTable
          columns={[
            { key: "name", header: "Node" },
            { key: "role", header: "Role" },
            { key: "client", header: "Client" },
            { key: "region", header: "Region" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
              )
            },
            { key: "lastHeartbeat", header: "Last Heartbeat" }
          ]}
          rows={inventory.rows}
        />
      </Panel>
    </OpsShell>
  );
}
