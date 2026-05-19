import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import type { StatusTone } from "@eth-staking/domain";
import { Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import {
  createAutomationRun,
  loadAutomationOptions,
  loadAutomationRun,
  loadAutomationRuns,
} from "../../lib/automation";

const operationOptions = [
  { value: "BOOTSTRAP_HOST", label: "Bootstrap host", mode: "admin prepare", dryRun: false },
  {
    value: "VERIFY_BASELINE",
    label: "Verify baseline mirror",
    mode: "read-only",
    dryRun: false,
  },
  { value: "RENDER_RUNTIME", label: "Render runtime", mode: "dry-run", dryRun: true },
  { value: "VERIFY_RUNTIME", label: "Verify runtime", mode: "dry-run", dryRun: true },
  { value: "ROLLOUT_DRY_RUN", label: "Rollout preview", mode: "dry-run", dryRun: true },
  { value: "ROLLOUT_EXECUTE", label: "Rollout execute", mode: "execute", dryRun: false },
  { value: "PREFLIGHT_HOST", label: "Host preflight", mode: "dry-run", dryRun: true },
  {
    value: "STAGE_ARTIFACTS_DRY_RUN",
    label: "Artifact stage preview",
    mode: "dry-run",
    dryRun: true,
  },
  {
    value: "STAGE_ARTIFACTS_EXECUTE",
    label: "Artifact stage execute",
    mode: "execute",
    dryRun: false,
  },
  { value: "DEPLOYED_VERIFY", label: "Deployed verify", mode: "dry-run", dryRun: true },
  { value: "COMPOSE_DRY_RUN", label: "Compose preview", mode: "dry-run", dryRun: true },
  { value: "COMPOSE_EXECUTE", label: "Compose execute", mode: "execute", dryRun: false },
  { value: "FULL_OPERATOR_MVP", label: "Full operator MVP", mode: "execute", dryRun: false },
  { value: "HEALTH_SYNC_DRY_RUN", label: "Health sync preview", mode: "dry-run", dryRun: true },
] as const;

const executeOperations = new Set([
  "ROLLOUT_EXECUTE",
  "STAGE_ARTIFACTS_EXECUTE",
  "COMPOSE_EXECUTE",
  "FULL_OPERATOR_MVP",
]);

const fieldLabelClass = "grid min-w-0 gap-2 text-sm font-light text-[var(--miro-charcoal)]";
const fieldCaptionClass =
  "text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]";
const fieldControlClass =
  "min-h-12 w-full min-w-0 rounded-none border border-[var(--miro-hairline)] bg-[var(--miro-surface)] px-4 py-3 text-sm font-light text-[var(--miro-ink)] outline-none transition focus:border-[var(--miro-ink)] disabled:bg-[var(--miro-surface-soft)] disabled:text-[var(--miro-muted)]";
const detailLabelClass =
  "text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]";
const detailValueClass = "mt-1 block truncate text-[var(--miro-ink)]";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusTone(status: string): StatusTone {
  if (status === "SUCCEEDED") {
    return "healthy";
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "critical";
  }

  if (status === "RUNNING" || status === "QUEUED" || status === "CANCEL_REQUESTED") {
    return "warning";
  }

  return "neutral";
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

async function startAutomationRun(formData: FormData) {
  "use server";

  const operation = readFormString(formData, "operation");
  const option = operationOptions.find((item) => item.value === operation);
  const clusterId = readFormString(formData, "clusterId");
  const hostId = readFormString(formData, "hostId");
  const approvalId = readFormString(formData, "approvalId");
  const requiresApproval = executeOperations.has(operation);

  if (!option || !clusterId || !hostId) {
    redirect("/automation?error=missing_target");
  }

  if (requiresApproval && (!approvalId || formData.get("executeConfirmed") !== "on")) {
    redirect("/automation?error=approval_required");
  }

  let run: Awaited<ReturnType<typeof createAutomationRun>>;

  try {
    run = await createAutomationRun({
      operation,
      clusterId,
      hostId,
      dryRun: option.dryRun,
      ...(approvalId ? { approvalId } : {}),
    });
  } catch {
    redirect("/automation?error=start_failed");
  }

  revalidatePath("/automation");
  redirect(`/automation?runId=${run.runId}`);
}

export default async function AutomationPage(props: { searchParams?: SearchParams }) {
  const params = (await props.searchParams) ?? {};
  const selectedRunId = firstValue(params.runId);
  const error = firstValue(params.error);
  const [options, runs, selectedRun] = await Promise.all([
    loadAutomationOptions(),
    loadAutomationRuns(),
    selectedRunId ? loadAutomationRun(selectedRunId) : Promise.resolve(null),
  ]);
  const canStart = options.clusters.length > 0 && options.hosts.length > 0;

  return (
    <OpsShell
      currentPath="/automation"
      title="Automation"
      description="Start approval-gated Ansible runs and inspect redacted stdout/stderr from the CDVN runtime scripts."
    >
      <Panel
        title="Run Automation"
        description="Terraform is not used in this MVP. Existing bare-metal hosts are required, and the backend invokes Ansible against the configured inventory."
      >
        <form action={startAutomationRun} className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
          <label className={fieldLabelClass}>
            <span className={fieldCaptionClass}>Cluster</span>
            <select name="clusterId" className={fieldControlClass} required disabled={!canStart}>
              {options.clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </select>
          </label>

          <label className={fieldLabelClass}>
            <span className={fieldCaptionClass}>Operator Host</span>
            <select name="hostId" className={fieldControlClass} required disabled={!canStart}>
              {options.hosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.name}
                  {host.clusterName ? ` / ${host.clusterName}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className={fieldLabelClass}>
            <span className={fieldCaptionClass}>Operation</span>
            <select name="operation" className={fieldControlClass} required disabled={!canStart}>
              {operationOptions.map((operation) => (
                <option key={operation.value} value={operation.value}>
                  {operation.label} - {operation.mode}
                </option>
              ))}
            </select>
          </label>

          <label className={`${fieldLabelClass} xl:col-span-2`}>
            <span className={fieldCaptionClass}>Approval ID</span>
            <input
              name="approvalId"
              className={fieldControlClass}
              placeholder="Required for execute operations"
            />
          </label>

          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-start gap-3 border border-[var(--miro-yellow)] bg-[var(--miro-surface)] px-4 py-3 text-sm font-light leading-6 text-[var(--miro-charcoal)]">
              <input
                name="executeConfirmed"
                type="checkbox"
                className="mt-1 accent-[var(--miro-yellow)]"
              />
              <span>
                Execute operations require an approved backend approval record. Operator-specific
                artifacts remain on the host-local secure path and are not uploaded.
              </span>
            </label>
            <button
              type="submit"
              disabled={!canStart}
              className="min-h-12 border border-[var(--miro-ink)] bg-transparent px-8 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--miro-ink)] transition hover:bg-[var(--miro-ink)] hover:text-[var(--miro-on-primary)] disabled:border-[var(--miro-hairline)] disabled:bg-transparent disabled:text-[var(--miro-muted)]"
            >
              Run
            </button>
          </div>
        </form>

        <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--miro-slate)] md:grid-cols-2">
          <p>
            Execute operations require approval and stop on approval, cluster, host, or operation
            mismatch.
          </p>
          <p>
            Artifact staging only reads from the configured secure host-local source path; upload
            fields for keys, jwt.hex, keystores, seed material, and raw DKG output are intentionally
            absent.
          </p>
        </div>

        {options.unavailable ? (
          <p className="mt-4 border border-[var(--miro-yellow)] bg-[var(--miro-surface)] px-4 py-3 text-sm font-light text-[var(--miro-yellow)]">
            Inventory API is unavailable, so automation cannot be started from this page.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 border border-[var(--miro-m-red)] bg-[var(--miro-coral-soft)] px-4 py-3 text-sm font-light text-[#ff8a72]">
            {error === "approval_required"
              ? "Execute operation was not started because approval ID and confirmation are required."
              : error === "missing_target"
                ? "Automation run was not started because cluster, host, or operation was missing."
                : "Automation run failed to start. Check the API response and approval constraints."}
          </p>
        ) : null}
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
