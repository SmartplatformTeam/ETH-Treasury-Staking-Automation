import Link from "next/link";

import type { StatusTone } from "@eth-staking/domain";
import { Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { getWebAuthSession } from "../../lib/auth-session";
import {
  loadAutomationOptions,
  loadAutomationRun,
  loadAutomationRuns,
} from "../../lib/automation";
import { loadApprovedApprovalsForAutomation } from "../../lib/workflows";

import { AutomationForm } from "./automation-form";

const detailLabelClass =
  "text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]";
const detailValueClass = "mt-1 block truncate text-[var(--miro-ink)]";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusTone(status: string): StatusTone {
  if (status === "SUCCEEDED") return "healthy";
  if (status === "FAILED" || status === "CANCELLED") return "critical";
  if (status === "RUNNING" || status === "QUEUED" || status === "CANCEL_REQUESTED")
    return "warning";
  return "neutral";
}

export default async function AutomationPage(props: { searchParams?: SearchParams }) {
  const params = (await props.searchParams) ?? {};
  const selectedRunId = firstValue(params.runId);
  const [options, runs, selectedRun, session, approvedApprovals] = await Promise.all([
    loadAutomationOptions(),
    loadAutomationRuns(),
    selectedRunId ? loadAutomationRun(selectedRunId) : Promise.resolve(null),
    getWebAuthSession(),
    loadApprovedApprovalsForAutomation(),
  ]);

  const canStartAutomation = session.role === "ADMIN" || session.role === "INFRA_OPERATOR";

  return (
    <OpsShell
      currentPath="/automation"
      title="Automation"
      description="Start approval-gated Ansible runs and inspect redacted stdout/stderr from the CDVN runtime scripts."
    >
      <Panel
        title="Run Automation"
        description="Existing bare-metal hosts are required. Execute operations need an APPROVED approval scoped to the same cluster, host, and operation."
      >
        {canStartAutomation ? (
          options.unavailable ? (
            <p className="border border-[var(--miro-yellow)] bg-[var(--miro-surface)] px-4 py-3 text-sm font-light text-[var(--miro-yellow)]">
              Inventory API is unavailable, so automation cannot be started from this page.
            </p>
          ) : (
            <AutomationForm
              clusters={options.clusters.map((cluster) => ({ id: cluster.id, name: cluster.name }))}
              hosts={options.hosts.map((host) => ({
                id: host.id,
                name: host.name,
                clusterId: host.clusterId ?? null,
                ...(host.clusterName ? { clusterName: host.clusterName } : {}),
              }))}
              approvedApprovals={approvedApprovals}
            />
          )
        ) : (
          <p className="border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] px-4 py-3 text-sm font-light text-[var(--miro-slate)]">
            Your role ({session.role}) cannot start automation runs. Only ADMIN and INFRA_OPERATOR
            can. View Recent Runs and audit trail below.
          </p>
        )}
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel
          title="Recent Runs"
          description="Latest AutomationRun records persisted by the backend."
        >
          <div className="space-y-3">
            {runs.items.length === 0 ? (
              <p className="text-sm text-[var(--miro-muted)]">
                No automation runs have been recorded.
              </p>
            ) : (
              runs.items.map((run) => (
                <Link
                  key={run.runId}
                  href={`/automation?runId=${run.runId}`}
                  className="block border border-[var(--miro-hairline)] bg-[var(--miro-surface)] p-4 transition hover:border-[var(--miro-ink)]"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p
                      className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.08em] text-[var(--miro-ink)]"
                      title={run.operation}
                    >
                      {run.operation}
                    </p>
                    <StatusBadge tone={statusTone(run.status)}>{run.status}</StatusBadge>
                  </div>
                  <p
                    className="mt-2 truncate text-xs font-light leading-5 text-[var(--miro-slate)]"
                    title={`${run.runId} / ${run.dryRun ? "dry-run" : "execute"} / ${new Date(run.createdAt).toLocaleString()}`}
                  >
                    {run.runId} / {run.dryRun ? "dry-run" : "execute"} /{" "}
                    {new Date(run.createdAt).toLocaleString()}
                  </p>
                </Link>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title="Run Detail"
          description="Stored stdout/stderr is redacted before persistence. Refresh to fetch newly appended events."
        >
          {selectedRun ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm text-[var(--miro-charcoal)] md:grid-cols-2">
                <div className="min-w-0">
                  <p className={detailLabelClass}>Run ID</p>
                  <p className={detailValueClass} title={selectedRun.runId}>
                    {selectedRun.runId}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className={detailLabelClass}>Playbook</p>
                  <p className={detailValueClass} title={selectedRun.playbook}>
                    {selectedRun.playbook}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className={detailLabelClass}>Inventory</p>
                  <p className={detailValueClass} title={selectedRun.inventoryRef}>
                    {selectedRun.inventoryRef}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className={detailLabelClass}>Exit Code</p>
                  <p className="mt-1 text-[var(--miro-primary)]">
                    {selectedRun.exitCode ?? "pending"}
                  </p>
                </div>
              </div>
              {selectedRun.failureReason ? (
                <p className="border border-[var(--miro-m-red)] bg-[var(--miro-coral-soft)] px-4 py-3 text-sm font-light text-[#ff8a72]">
                  {selectedRun.failureReason}
                </p>
              ) : null}
              <div className="border border-[var(--miro-hairline)]">
                <div className="flex items-center justify-between border-b border-[var(--miro-hairline)] bg-[var(--miro-surface)] px-4 py-3">
                  <StatusBadge tone={statusTone(selectedRun.status)}>
                    {selectedRun.status}
                  </StatusBadge>
                  <Link
                    href={`/automation?runId=${selectedRun.runId}`}
                    className="border border-[var(--miro-hairline)] bg-transparent px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--miro-ink)] hover:border-[var(--miro-ink)]"
                  >
                    Refresh
                  </Link>
                </div>
                <div className="max-h-[560px] space-y-3 overflow-auto bg-[var(--miro-surface-soft)] p-4">
                  {selectedRun.events?.length ? (
                    selectedRun.events.map((event) => (
                      <article
                        key={event.id}
                        className="border border-[var(--miro-hairline)] bg-[var(--miro-surface)] p-3"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
                          <span>
                            #{event.sequence} {event.stream}
                          </span>
                          <span>{event.redacted ? "redacted" : "clean"}</span>
                        </div>
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[var(--miro-ink)]">
                          {event.message}
                        </pre>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--miro-on-primary)] opacity-60">
                      No log events stored for this run.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--miro-muted)]">
              Select a recent run to inspect status and logs.
            </p>
          )}
        </Panel>
      </div>
    </OpsShell>
  );
}
