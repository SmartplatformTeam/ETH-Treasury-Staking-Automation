import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { loadClusterInventory } from "../../lib/inventory";

export default async function ClustersPage() {
  const inventory = await loadClusterInventory();

  return (
    <OpsShell
      currentPath="/clusters"
      title="Clusters"
      description="Obol DVT topology, baseline pinning, and signer overlay state stay visible before rollout or DKG changes."
    >
      <Panel
        title="CDVN Baseline"
        description="Pinned upstream baseline plus overlay versioning makes rollout drift and operator differences explicit."
      >
        <DataTable
          columns={[
            { key: "name", header: "Cluster" },
            { key: "baselineVersion", header: "Baseline" },
            { key: "overlayVersion", header: "Overlay" },
            { key: "threshold", header: "Threshold" },
            { key: "signerPath", header: "Signer Path" },
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
