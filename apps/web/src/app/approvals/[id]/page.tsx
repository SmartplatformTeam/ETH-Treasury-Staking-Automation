import { notFound } from "next/navigation";

import { hasPermission } from "@eth-staking/domain";
import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../../components/ops-shell";
import { statusToneFromLabel } from "../../../components/status-tone";
import { getWebAuthSession } from "../../../lib/auth-session";
import {
  loadApproval,
  loadApprovalAuditEntries,
  type ApprovalAuditEntry,
  type ApprovalDetail
} from "../../../lib/workflows";
import { DecisionPanel } from "../decision-panel";

type ApprovalDetailPageProps = {
  params: Promise<{ id: string }>;
};

type MetaRow = { field: string; value: string };
type AuditRowDisplay = {
  timestamp: string;
  action: string;
  actor: string;
  detail: string;
};

function summarizeDiff(diff: ApprovalAuditEntry["diff"]) {
  if (!diff) return "—";
  const interesting = ["previousStatus", "nextStatus", "reason"];
  const parts: string[] = [];
  for (const key of interesting) {
    const value = diff[key];
    if (typeof value === "string" && value.length > 0) {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function buildMetaRows(approval: ApprovalDetail): MetaRow[] {
  return [
    { field: "Approval ID", value: approval.id },
    { field: "Resource", value: `${approval.resourceType}:${approval.resourceId}` },
    { field: "Policy", value: approval.policyType },
    { field: "Status", value: approval.finalStatus },
    {
      field: "Requested By",
      value: `${approval.requestedBy.email} (${approval.requestedBy.role})`
    },
    {
      field: "Decided By",
      value: approval.approvedBy?.email ?? approval.rejectedBy?.email ?? "—"
    },
    { field: "Cluster ID", value: approval.clusterId ?? "—" },
    { field: "Host ID", value: approval.hostId ?? "—" },
    { field: "Automation Operation", value: approval.automationOperation ?? "—" },
    {
      field: "Deposit Request",
      value: approval.depositRequest?.requestNumber ?? "—"
    },
    { field: "Created At", value: new Date(approval.createdAt).toLocaleString() },
    { field: "Updated At", value: new Date(approval.updatedAt).toLocaleString() }
  ];
}

function buildAuditRows(entries: ApprovalAuditEntry[]): AuditRowDisplay[] {
  return entries.map((entry) => ({
    timestamp: new Date(entry.createdAt).toLocaleString(),
    action: entry.actionType,
    actor: entry.actorEmail,
    detail: summarizeDiff(entry.diff)
  }));
}

export default async function ApprovalDetailPage(props: ApprovalDetailPageProps) {
  const { id } = await props.params;
  const [approval, auditEntries, session] = await Promise.all([
    loadApproval(id),
    loadApprovalAuditEntries(id),
    getWebAuthSession()
  ]);

  if (!approval) {
    notFound();
  }

  const canDecide = hasPermission(session, "approvals:decide");
  const metaRows = buildMetaRows(approval);
  const auditRows = buildAuditRows(auditEntries);

  return (
    <OpsShell
      currentPath="/approvals"
      title={`Approval ${approval.id.slice(-8)}`}
      description={`${approval.policyType} · ${approval.resourceType}:${approval.resourceId}`}
    >
      <Panel
        title="Approval Detail"
        description="Resource, policy, requester, and decision context for this approval."
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
            Current Status
          </span>
          <StatusBadge tone={statusToneFromLabel(approval.finalStatus)}>
            {approval.finalStatus}
          </StatusBadge>
        </div>
        <DataTable
          columns={[
            { key: "field", header: "Field", width: "30%" },
            { key: "value", header: "Value" }
          ]}
          rows={metaRows}
        />
      </Panel>

      {canDecide ? (
        <Panel
          title="Decision"
          description="Only APPROVER and ADMIN roles see these controls. Requesters cannot decide their own approvals."
        >
          <DecisionPanel approvalId={approval.id} finalStatus={approval.finalStatus} />
        </Panel>
      ) : null}

      <Panel
        title="Audit Trail"
        description="Approval-scoped audit log entries. Other system events appear on /audit."
      >
        {auditRows.length === 0 ? (
          <p className="text-sm font-light text-[var(--miro-slate)]">
            No audit entries yet for this approval.
          </p>
        ) : (
          <DataTable
            columns={[
              { key: "timestamp", header: "Timestamp", width: "22%" },
              { key: "action", header: "Action", width: "24%" },
              { key: "actor", header: "Actor", width: "26%" },
              { key: "detail", header: "Detail" }
            ]}
            rows={auditRows}
          />
        )}
      </Panel>
    </OpsShell>
  );
}
