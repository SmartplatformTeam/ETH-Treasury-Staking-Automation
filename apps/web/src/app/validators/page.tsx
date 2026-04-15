import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { loadValidatorInventory } from "../../lib/inventory";

export default async function ValidatorsPage() {
  const inventory = await loadValidatorInventory();

  return (
    <OpsShell
      currentPath="/validators"
      title="Validators"
      description="Validator inventory tracks cluster binding, strategy type, owner entity, fee recipient, and withdrawal target."
    >
      <Panel
        title="Inventory"
        description="Operational visibility comes first. Actions that could move funds or alter slash posture stay out of this surface."
      >
        <DataTable
          columns={[
            { key: "publicKey", header: "Public Key" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
              )
            },
            { key: "strategy", header: "Strategy" },
            { key: "cluster", header: "Cluster" },
            { key: "ownerEntity", header: "Owner" }
          ]}
          rows={inventory.rows}
        />
      </Panel>
    </OpsShell>
  );
}
