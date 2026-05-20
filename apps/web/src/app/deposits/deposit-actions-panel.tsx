"use client";

import { useActionState } from "react";

import { Button, FormAlert, FormField, Input } from "@eth-staking/ui";

import { depositActionIdleState, type DepositActionState } from "./action-state";
import {
  cancelDepositAction,
  exportDepositAction,
  markSubmittedAction
} from "./actions";

type DepositActionsPanelProps = {
  depositId: string;
  executionStatus: string;
  approvalStatus: string;
  hasSafeProposal: boolean;
};

export function DepositActionsPanel({
  depositId,
  executionStatus,
  approvalStatus,
  hasSafeProposal
}: DepositActionsPanelProps) {
  const canExport = executionStatus === "DRAFT" && approvalStatus === "APPROVED" && !hasSafeProposal;
  const canMarkSubmitted = executionStatus === "EXPORTED";
  const canCancel = executionStatus === "DRAFT" || executionStatus === "EXPORTED";

  const [exportState, exportAction, exporting] = useActionState(
    (previous: DepositActionState, formData: FormData) =>
      exportDepositAction(depositId, previous, formData),
    depositActionIdleState
  );

  const [markState, markAction, markPending] = useActionState(
    (previous: DepositActionState, formData: FormData) =>
      markSubmittedAction(depositId, previous, formData),
    depositActionIdleState
  );

  const [cancelState, cancelAction, cancelPending] = useActionState(
    (previous: DepositActionState) => cancelDepositAction(depositId, previous),
    depositActionIdleState
  );

  return (
    <div className="flex flex-col gap-6">
      {canExport ? (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
            Export Safe Payload
          </p>
          <form action={exportAction} className="flex flex-col gap-3">
            <FormField
              label="Safe Wallet Nonce"
              htmlFor="nonce"
              helper="Copy the current nonce from the Safe Web UI (decimal integer)."
            >
              <Input
                id="nonce"
                name="nonce"
                placeholder="e.g. 42"
                inputMode="numeric"
                pattern="[0-9]+"
                disabled={exporting}
                required
              />
            </FormField>
            <Button type="submit" variant="primary" disabled={exporting}>
              {exporting ? "Exporting…" : "Export Safe Payload"}
            </Button>
          </form>
          {exportState.status === "error" ? (
            <FormAlert tone="error">{exportState.message}</FormAlert>
          ) : null}
          {exportState.status === "success" ? (
            <FormAlert tone="success">{exportState.message}</FormAlert>
          ) : null}
        </div>
      ) : null}

      {canMarkSubmitted ? (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
            Mark Submitted
          </p>
          <form action={markAction} className="flex flex-col gap-3">
            <FormField
              label="Safe Tx Hash"
              htmlFor="safeTxHash"
              helper="0x + 64 hex chars (the EIP-712 hash from Safe UI)."
            >
              <Input
                id="safeTxHash"
                name="safeTxHash"
                placeholder="0x..."
                disabled={markPending}
                required
              />
            </FormField>
            <Button type="submit" variant="primary" disabled={markPending}>
              {markPending ? "Marking…" : "Mark Submitted"}
            </Button>
          </form>
          {markState.status === "error" ? (
            <FormAlert tone="error">{markState.message}</FormAlert>
          ) : null}
          {markState.status === "success" ? (
            <FormAlert tone="success">{markState.message}</FormAlert>
          ) : null}
        </div>
      ) : null}

      {canCancel ? (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
            Cancel
          </p>
          <form action={cancelAction}>
            <Button type="submit" variant="danger" disabled={cancelPending}>
              {cancelPending ? "Cancelling…" : "Cancel Deposit Request"}
            </Button>
          </form>
          {cancelState.status === "error" ? (
            <FormAlert tone="error">{cancelState.message}</FormAlert>
          ) : null}
          {cancelState.status === "success" ? (
            <FormAlert tone="success">{cancelState.message}</FormAlert>
          ) : null}
        </div>
      ) : null}

      {!canExport && !canMarkSubmitted && !canCancel ? (
        <p className="text-xs font-light text-[var(--miro-slate)]">
          No actions available for this state (executionStatus={executionStatus},
          approvalStatus={approvalStatus}).
        </p>
      ) : null}
    </div>
  );
}
