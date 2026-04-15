import { type MetricCard } from "@eth-staking/domain";
import { DataTable, MetricStrip, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../components/ops-shell";
import { statusToneFromLabel } from "../components/status-tone";
import {
  loadClusterInventory,
  loadNodeInventory,
  loadValidatorInventory
} from "../lib/inventory";
import { loadAlerts } from "../lib/insights";
import { loadApprovals } from "../lib/workflows";

export default async function DashboardPage() {
  const [validatorInventory, nodeInventory, clusterInventory, approvalInventory, alertInventory] =
    await Promise.all([
      loadValidatorInventory(),
      loadNodeInventory(),
      loadClusterInventory(),
      loadApprovals(),
      loadAlerts()
    ]);
  const approvalPressureMetric: MetricCard = {
    label: "Approval Queue",
    value: String(approvalInventory.activeQueueCount),
    detail: `${approvalInventory.total} approvals in tracked workflow history`,
    tone: approvalInventory.activeQueueCount > 0 ? "warning" : "healthy"
  };
  const criticalAlertsMetric: MetricCard = {
    label: "Critical Alerts",
    value: String(alertInventory.criticalCount),
    detail: `${alertInventory.total} alerts in queue`,
    tone: alertInventory.criticalCount > 0 ? "critical" : "healthy"
  };
  const metrics: MetricCard[] = [
    {
      label: "Validator Fleet",
      value: String(validatorInventory.total),
      detail: `${validatorInventory.activeCount} active, ${validatorInventory.pendingCount} pending deposit`,
      tone: validatorInventory.pendingCount > 0 ? "warning" : "healthy"
    },
    {
      label: "Operator Clusters",
      value: String(clusterInventory.total),
      detail: `${clusterInventory.healthyCount} healthy runtime`,
      tone: clusterInventory.healthyCount === clusterInventory.total ? "healthy" : "degraded"
    },
    approvalPressureMetric,
    criticalAlertsMetric
  ];

  return (
    <OpsShell
      currentPath="/"
      title="Operator Dashboard"
      description="Baseline fleet health, approval load, and DVT rollout posture across the four-host operator topology."
    >
      <MetricStrip items={metrics} />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Panel
          title="Validator Fleet"
          description="Inventory is separated from risky actions. Deposit and signer operations continue through approval flow."
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
            rows={validatorInventory.rows}
          />
        </Panel>
        <Panel
          title="Approval Pressure"
          description="Human approvals gate DKG, rollout, Safe payload export, and signer changes."
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
            rows={approvalInventory.rows}
          />
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="CDVN Cluster Baseline"
          description="Pinned baseline plus overlay versioning stays visible so rollout drift can be audited."
        >
          <DataTable
            columns={[
              { key: "name", header: "Cluster" },
              { key: "baselineVersion", header: "Baseline" },
              { key: "overlayVersion", header: "Overlay" },
              { key: "threshold", header: "Threshold" },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
                )
              }
            ]}
            rows={clusterInventory.rows}
          />
        </Panel>
        <Panel
          title="Active Alerts"
          description="Alert handling is designed for acknowledgement and escalation before corrective action."
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
              { key: "acknowledged", header: "Acked" }
            ]}
            rows={alertInventory.rows}
          />
        </Panel>
      </div>
      <Panel
        title="Runtime Snapshot"
        description="Operator nodes, consensus clients, and signer endpoints remain visible together for cross-layer triage."
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
          rows={nodeInventory.rows}
        />
      </Panel>
    </OpsShell>
  );
}
