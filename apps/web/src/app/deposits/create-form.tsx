"use client";

import { useActionState, useMemo, useState } from "react";

import { Button, FormAlert, FormField, Input, Select } from "@eth-staking/ui";

import { depositActionIdleState, type DepositActionState } from "./action-state";
import { createDepositAction } from "./actions";

import type { ClusterOption, TreasuryOption } from "../../lib/deposits";

type CreateDepositFormProps = {
  clusters: ClusterOption[];
  treasuries: TreasuryOption[];
};

const NETWORKS = ["MAINNET", "HOLESKY", "HOODI"] as const;

export function CreateDepositForm({ clusters, treasuries }: CreateDepositFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [network, setNetwork] = useState<string>("");

  const [state, action, pending] = useActionState(
    (previous: DepositActionState, formData: FormData) =>
      createDepositAction(previous, formData),
    depositActionIdleState
  );

  const filteredClusters = useMemo(
    () => clusters.filter((c) => !network || c.network === network),
    [clusters, network]
  );
  const filteredTreasuries = useMemo(
    () => treasuries.filter((t) => !network || t.network === network),
    [treasuries, network]
  );

  if (!expanded) {
    return (
      <div className="mb-4 flex items-center justify-between border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
          Create a new deposit request
        </span>
        <Button variant="ghost" onClick={() => setExpanded(true)}>
          + New Deposit Request
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-4 border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
          New Deposit Request (single validator)
        </h3>
        <Button variant="ghost" onClick={() => setExpanded(false)} disabled={pending}>
          Close
        </Button>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Network" htmlFor="network">
            <Select
              id="network"
              name="network"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              disabled={pending}
              required
            >
              <option value="">Select network…</option>
              {NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Owner Entity" htmlFor="ownerEntity">
            <Input
              id="ownerEntity"
              name="ownerEntity"
              placeholder="e.g. Treasury Alpha"
              disabled={pending}
              required
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Cluster" htmlFor="clusterId">
            <Select id="clusterId" name="clusterId" disabled={pending || !network} required>
              <option value="">Select cluster…</option>
              {filteredClusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Treasury Safe" htmlFor="treasuryAccountId">
            <Select
              id="treasuryAccountId"
              name="treasuryAccountId"
              disabled={pending || !network}
              required
            >
              <option value="">Select Safe…</option>
              {filteredTreasuries.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} · {t.safeAddress}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField
          label="Pubkey (48 bytes hex)"
          htmlFor="pubkey"
          helper="0x prefix + 96 hex chars"
        >
          <Input id="pubkey" name="pubkey" placeholder="0x..." disabled={pending} required />
        </FormField>
        <FormField
          label="Withdrawal Credentials (32 bytes hex)"
          htmlFor="withdrawalCredentials"
          helper="0x prefix + 64 hex chars"
        >
          <Input
            id="withdrawalCredentials"
            name="withdrawalCredentials"
            placeholder="0x..."
            disabled={pending}
            required
          />
        </FormField>
        <FormField
          label="Signature (96 bytes hex)"
          htmlFor="signature"
          helper="0x prefix + 192 hex chars"
        >
          <Input
            id="signature"
            name="signature"
            placeholder="0x..."
            disabled={pending}
            required
          />
        </FormField>
        <FormField
          label="Deposit Data Root (32 bytes hex)"
          htmlFor="depositDataRoot"
          helper="0x prefix + 64 hex chars"
        >
          <Input
            id="depositDataRoot"
            name="depositDataRoot"
            placeholder="0x..."
            disabled={pending}
            required
          />
        </FormField>

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Creating…" : "Create Deposit Request"}
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
