"use client";

import { useActionState, useMemo, useState } from "react";

import { Button, FormAlert, FormField, Select } from "@eth-staking/ui";

import type { ClusterOption, HostOption } from "../../lib/inventory";

import { approvalActionIdleState, type ApprovalActionState } from "./action-state";
import { createApprovalAction } from "./actions";

type CreateFormProps = {
  canCreateRollout: boolean;
  canCreateDeposit: boolean;
  clusters: ClusterOption[];
  hosts: HostOption[];
  deposits: { id: string; requestNumber: string }[];
  rolloutOperations: string[];
};

export function CreateApprovalForm(props: CreateFormProps) {
  const { canCreateRollout, canCreateDeposit, clusters, hosts, deposits, rolloutOperations } =
    props;

  const allowedPolicyTypes = useMemo(() => {
    const allowed: ("ROLLOUT" | "DEPOSIT_REQUEST")[] = [];
    if (canCreateRollout) allowed.push("ROLLOUT");
    if (canCreateDeposit) allowed.push("DEPOSIT_REQUEST");
    return allowed;
  }, [canCreateRollout, canCreateDeposit]);

  const [expanded, setExpanded] = useState(false);
  const [policyType, setPolicyType] = useState<"ROLLOUT" | "DEPOSIT_REQUEST" | "">(
    allowedPolicyTypes[0] ?? ""
  );
  const [clusterId, setClusterId] = useState("");

  const [state, action, pending] = useActionState(
    (previous: ApprovalActionState, formData: FormData) =>
      createApprovalAction(previous, formData),
    approvalActionIdleState
  );

  const filteredHosts = useMemo(() => {
    if (!clusterId) return hosts;
    return hosts.filter((host) => host.clusterId === clusterId);
  }, [clusterId, hosts]);

  if (allowedPolicyTypes.length === 0) {
    return null;
  }

  if (!expanded) {
    return (
      <div className="mb-4 flex items-center justify-between border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
          Create a new approval
        </span>
        <Button variant="ghost" onClick={() => setExpanded(true)}>
          + New Approval
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
          New Approval
        </h3>
        <Button variant="ghost" onClick={() => setExpanded(false)} disabled={pending}>
          Close
        </Button>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <FormField label="Policy Type" htmlFor="policyType">
          <Select
            id="policyType"
            name="policyType"
            value={policyType}
            onChange={(event) =>
              setPolicyType(event.target.value as "ROLLOUT" | "DEPOSIT_REQUEST" | "")
            }
            disabled={pending}
            required
          >
            <option value="">Select policy type…</option>
            {allowedPolicyTypes.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </Select>
        </FormField>

        {policyType === "ROLLOUT" ? (
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Cluster" htmlFor="clusterId">
              <Select
                id="clusterId"
                name="clusterId"
                value={clusterId}
                onChange={(event) => setClusterId(event.target.value)}
                disabled={pending}
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
              <Select id="hostId" name="hostId" disabled={pending || !clusterId} required>
                <option value="">Select host…</option>
                {filteredHosts.map((host) => (
                  <option key={host.id} value={host.id}>
                    {host.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Automation Operation" htmlFor="automationOperation">
              <Select
                id="automationOperation"
                name="automationOperation"
                disabled={pending}
                required
              >
                <option value="">Select operation…</option>
                {rolloutOperations.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        ) : null}

        {policyType === "DEPOSIT_REQUEST" ? (
          <FormField label="Deposit Request" htmlFor="depositRequestId">
            <Select id="depositRequestId" name="depositRequestId" disabled={pending} required>
              <option value="">Select deposit request…</option>
              {deposits.map((deposit) => (
                <option key={deposit.id} value={deposit.id}>
                  {deposit.requestNumber}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={pending || !policyType}>
            {pending ? "Creating…" : "Create Approval"}
          </Button>
        </div>

        {state.status === "error" ? <FormAlert tone="error">{state.message}</FormAlert> : null}
        {state.status === "success" ? (
          <FormAlert tone="success">{state.message}</FormAlert>
        ) : null}
      </form>
    </div>
  );
}
