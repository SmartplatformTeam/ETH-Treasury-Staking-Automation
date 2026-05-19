import { CopyableAddress, DataTable, Panel, StatusBadge } from "@eth-staking/ui";

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
            {
              key: "publicKey",
              header: "Public Key",
              width: "200px",
              render: (row) => <CopyableAddress value={row.publicKey} />
            },
            {
              key: "status",
              header: "Status",
              width: "120px",
              render: (row) => (
                <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
              )
            },
            { key: "validatorIndex", header: "Index", width: "80px" },
            { key: "beaconStatus", header: "Beacon Status", width: "140px" },
            { key: "balanceEth", header: "Balance (ETH)", width: "120px" },
            { key: "effectiveBalanceEth", header: "Effective (ETH)", width: "120px" },
            { key: "strategy", header: "Strategy", width: "100px" },
            { key: "cluster", header: "Cluster" },
            { key: "ownerEntity", header: "Owner" },
            { key: "lastSyncedAt", header: "Synced", width: "180px" }
          ]}
          rows={inventory.rows}
        />
      </Panel>
    </OpsShell>
  );
}
