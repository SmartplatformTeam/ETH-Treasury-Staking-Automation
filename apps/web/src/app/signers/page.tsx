import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { loadSignerInventory } from "../../lib/inventory";

export default async function SignersPage() {
  const inventory = await loadSignerInventory();

  return (
    <OpsShell
      currentPath="/signers"
      title="Signers"
      description="Web3Signer endpoints and KMS key references are tracked as inventory so signer custody posture remains auditable."
    >
      <Panel
        title="Signer Inventory"
        description="Signer registration and key routing are tracked here. Risky binding changes should still route through approval."
      >
        <DataTable
          columns={[
            { key: "name", header: "Signer" },
            { key: "provider", header: "Provider" },
            { key: "endpoint", header: "Endpoint" },
            { key: "keyRef", header: "KMS Key Ref" },
            { key: "cluster", header: "Cluster" },
            { key: "host", header: "Host" },
            { key: "validators", header: "Validators" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
              )
            }
          ]}
          rows={inventory.rows}
        />
      </Panel>
    </OpsShell>
  );
}
