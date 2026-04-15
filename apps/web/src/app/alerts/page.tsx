import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { loadAlerts } from "../../lib/insights";

export default async function AlertsPage() {
  const alerts = await loadAlerts();

  return (
    <OpsShell
      currentPath="/alerts"
      title="Alerts"
      description="Severity, acknowledgement, and escalation are first-class concerns before any operator attempts remediation."
    >
      <Panel
        title="Alert Queue"
        description="This surface is intentionally conservative: it prioritizes source attribution and routing state over quick-action buttons."
      >
        <DataTable
          columns={[
            { key: "source", header: "Source" },
            {
              key: "severity",
              header: "Severity",
              render: (row) => (
                <StatusBadge tone={statusToneFromLabel(row.severity)}>{row.severity}</StatusBadge>
              )
            },
            { key: "summary", header: "Summary" },
            { key: "acknowledged", header: "Acknowledged" }
          ]}
          rows={alerts.rows}
        />
      </Panel>
    </OpsShell>
  );
}
