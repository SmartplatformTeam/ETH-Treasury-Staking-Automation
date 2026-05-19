"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Button, FormAlert, FormField, Select } from "@eth-staking/ui";

import type { ApprovedApprovalForAutomation } from "../../lib/workflows";

import { automationActionIdleState, type AutomationActionState } from "./action-state";
import { startAutomationRunAction } from "./actions";
import {
  isExecuteOperation,
  operationOptions,
  operationToExpectedPolicy
} from "./operations";

type ClusterOption = { id: string; name: string };
type HostOption = { id: string; name: string; clusterId: string | null; clusterName?: string };

type AutomationFormProps = {
  clusters: ClusterOption[];
  hosts: HostOption[];
  approvedApprovals: ApprovedApprovalForAutomation[];
};

function encodePrefill(payload: Record<string, string>) {
  const json = JSON.stringify(payload);
  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(json)));
}

export function AutomationForm({ clusters, hosts, approvedApprovals }: AutomationFormProps) {
  const [state, action, pending] = useActionState(
    startAutomationRunAction,
    automationActionIdleState
  );

  const [clusterId, setClusterId] = useState(clusters[0]?.id ?? "");
  const [operation, setOperation] = useState(operationOptions[0]?.value ?? "");

  const filteredHosts = useMemo(() => {
    if (!clusterId) return hosts;
    return hosts.filter((host) => host.clusterId === clusterId || host.clusterId === null);
  }, [clusterId, hosts]);

  const [hostId, setHostId] = useState(filteredHosts[0]?.id ?? "");

  const isExecute = isExecuteOperation(operation);
  const expectedPolicy = operationToExpectedPolicy[operation];

  const matchingApprovals = useMemo(() => {
    if (!isExecute || !expectedPolicy || !clusterId || !hostId) return [];
    return approvedApprovals.filter(
      (item) =>
        item.policyType === expectedPolicy &&
        item.clusterId === clusterId &&
        item.hostId === hostId &&
        item.automationOperation === operation
    );
  }, [approvedApprovals, clusterId, hostId, operation, expectedPolicy, isExecute]);

  const noMatch = isExecute && matchingApprovals.length === 0;
  const prefillHref = noMatch
    ? `/approvals?prefill=${encodePrefill({
        policyType: "ROLLOUT",
        clusterId,
        hostId,
        automationOperation: operation
      })}`
    : null;

  const canStart = clusters.length > 0 && filteredHosts.length > 0;

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <FormField label="Cluster" htmlFor="clusterId">
          <Select
            id="clusterId"
            name="clusterId"
            value={clusterId}
            onChange={(event) => {
              setClusterId(event.target.value);
              setHostId("");
            }}
            disabled={!canStart || pending}
            required
          >
            <option value="">Select cluster…</option>
            {clusters.map((cluster) => (
              <option key={cluster.id} value={cluster.id}>
                {cluster.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Operator Host" htmlFor="hostId">
          <Select
            id="hostId"
            name="hostId"
            value={hostId}
            onChange={(event) => setHostId(event.target.value)}
            disabled={!canStart || !clusterId || pending}
            required
          >
            <option value="">Select host…</option>
            {filteredHosts.map((host) => (
              <option key={host.id} value={host.id}>
                {host.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Operation" htmlFor="operation">
          <Select
            id="operation"
            name="operation"
            value={operation}
            onChange={(event) => setOperation(event.target.value)}
            disabled={!canStart || pending}
            required
          >
            {operationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.mode})
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {isExecute ? (
        <FormField
          label="Matching Approval"
          htmlFor="approvalId"
          helper={
            expectedPolicy
              ? `Execute requires APPROVED ${expectedPolicy} approval scoped to this cluster/host/operation.`
              : undefined
          }
        >
          {matchingApprovals.length > 0 ? (
            <Select id="approvalId" name="approvalId" disabled={pending} required>
              {matchingApprovals.map((approval) => (
                <option key={approval.id} value={approval.id}>
                  {approval.id} · created {new Date(approval.createdAt).toLocaleString()}
                </option>
              ))}
            </Select>
          ) : (
            <div className="flex flex-col gap-2 border border-[var(--miro-yellow)] bg-[var(--miro-surface-soft)] px-3 py-2 text-xs font-light text-[var(--miro-charcoal)]">
              <span>
                No APPROVED {expectedPolicy ?? "ROLLOUT"} approval matches the current cluster /
                host / operation.
              </span>
              {prefillHref ? (
                <Link
                  href={prefillHref}
                  className="text-[var(--miro-ink)] underline-offset-2 hover:underline"
                >
                  → Create one in /approvals (form prefilled)
                </Link>
              ) : null}
            </div>
          )}
        </FormField>
      ) : null}

      <div className="flex items-center gap-4">
        <Button type="submit" variant="primary" disabled={!canStart || pending || noMatch}>
          {pending ? "Starting…" : "Run"}
        </Button>
        <span className="text-xs font-light text-[var(--miro-slate)]">
          {isExecute
            ? "Execute operations rely on the approval gate enforced server-side (cluster/host/operation/policy match)."
            : "Safe-tier operation runs without an approval."}
        </span>
      </div>

      {state.status === "error" ? <FormAlert tone="error">{state.message}</FormAlert> : null}
    </form>
  );
}
