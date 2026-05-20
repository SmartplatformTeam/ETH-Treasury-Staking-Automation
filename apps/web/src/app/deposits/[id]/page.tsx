import { notFound } from "next/navigation";

import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../../components/ops-shell";
import { statusToneFromLabel } from "../../../components/status-tone";
import { getWebAuthSession } from "../../../lib/auth-session";
import { loadDeposit, type DepositDetail } from "../../../lib/deposits";
import {
  loadAuditEntriesForResource,
  type ApprovalAuditEntry
} from "../../../lib/workflows";
import { DepositActionsPanel } from "../deposit-actions-panel";

type PageProps = { params: Promise<{ id: string }> };

type MetaRow = { field: string; value: string };

function buildMetaRows(deposit: DepositDetail): MetaRow[] {
  return [
    { field: "Request Number", value: deposit.requestNumber },
    { field: "Network", value: deposit.network },
    { field: "Owner Entity", value: deposit.ownerEntity },
    { field: "Validator Count", value: String(deposit.validatorCount) },
    { field: "Validation Status", value: deposit.validationStatus },
    { field: "Approval Status", value: deposit.approvalStatus },
    { field: "Execution Status", value: deposit.executionStatus },
    {
      field: "Linked Approval",
      value: deposit.latestApproval
        ? `${deposit.latestApproval.id} (${deposit.latestApproval.finalStatus})`
        : "—"
    },
    { field: "Cluster", value: deposit.cluster?.name ?? "—" },
    {
      field: "Treasury Safe",
      value: deposit.treasuryAccount
        ? `${deposit.treasuryAccount.label} · ${deposit.treasuryAccount.safeAddress} · chainId ${deposit.treasuryAccount.chainId}`
        : "—"
    },
    {
      field: "Safe Proposal",
      value: deposit.safeProposal
        ? `${deposit.safeProposal.proposalNumber} (${deposit.safeProposal.status})`
        : "—"
    },
    { field: "Safe Tx Hash", value: deposit.safeProposal?.safeTxHash ?? "—" },
    { field: "Requested By", value: deposit.requestedBy.email },
    { field: "Created At", value: new Date(deposit.createdAt).toLocaleString() },
    { field: "Updated At", value: new Date(deposit.updatedAt).toLocaleString() }
  ];
}

function buildAuditRows(entries: ApprovalAuditEntry[]) {
  return entries.map((entry) => ({
    timestamp: new Date(entry.createdAt).toLocaleString(),
    action: entry.actionType,
    actor: entry.actorEmail,
    detail: entry.diff ? JSON.stringify(entry.diff).slice(0, 180) : "—"
  }));
}

export default async function DepositDetailPage(props: PageProps) {
  const { id } = await props.params;
  const [deposit, session, auditEntries] = await Promise.all([
    loadDeposit(id),
    getWebAuthSession(),
    loadAuditEntriesForResource("DepositRequest", id)
  ]);

  if (!deposit) notFound();

  const canWrite =
    session.role === "ADMIN" || session.role === "TREASURY_OPERATOR";

  const metaRows = buildMetaRows(deposit);
  const auditRows = buildAuditRows(auditEntries);
  const payloadJson = deposit.safeProposal?.payloadJson
    ? JSON.stringify(deposit.safeProposal.payloadJson, null, 2)
    : null;

  return (
    <OpsShell
      currentPath="/deposits"
      title={`Deposit ${deposit.requestNumber}`}
      description={`${deposit.network} · ${deposit.ownerEntity}`}
    >
      <Panel
        title="Deposit Request Detail"
        description="State machine: VALID → APPROVED → DRAFT → EXPORTED → SUBMITTED."
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
            Status
          </span>
          <StatusBadge tone={statusToneFromLabel(deposit.executionStatus)}>
            {deposit.executionStatus}
          </StatusBadge>
          <StatusBadge tone={statusToneFromLabel(deposit.approvalStatus)}>
            APPROVAL: {deposit.approvalStatus}
          </StatusBadge>
        </div>
        <DataTable
          columns={[
            { key: "field", header: "Field", width: "28%" },
            { key: "value", header: "Value" }
          ]}
          rows={metaRows}
        />
      </Panel>

      {canWrite ? (
        <Panel
          title="Actions"
          description="Only TREASURY_OPERATOR and ADMIN see write controls. All actions are recorded in the audit log."
        >
          <DepositActionsPanel
            depositId={deposit.id}
            executionStatus={deposit.executionStatus}
            approvalStatus={deposit.approvalStatus}
            hasSafeProposal={Boolean(deposit.safeProposal)}
          />
        </Panel>
      ) : null}

      {payloadJson ? (
        <Panel
          title="Safe Tx Payload"
          description="Safe Tx Service v1 compatible. Copy or download, then import into Safe Web UI."
        >
          <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap break-words border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] p-4 font-mono text-xs leading-5 text-[var(--miro-ink)]">
            {payloadJson}
          </pre>
        </Panel>
      ) : null}

      <Panel
        title="Audit Trail"
        description="Deposit-scoped audit log entries."
      >
        {auditRows.length === 0 ? (
          <p className="text-sm font-light text-[var(--miro-slate)]">
            No audit entries yet for this deposit.
          </p>
        ) : (
          <DataTable
            columns={[
              { key: "timestamp", header: "Timestamp", width: "22%" },
              { key: "action", header: "Action", width: "24%" },
              { key: "actor", header: "Actor", width: "22%" },
              { key: "detail", header: "Detail" }
            ]}
            rows={auditRows}
          />
        )}
      </Panel>
    </OpsShell>
  );
}
