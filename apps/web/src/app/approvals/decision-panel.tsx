"use client";

import { useActionState } from "react";

import { Button, FormAlert, FormField, Textarea } from "@eth-staking/ui";

import { approvalActionIdleState, type ApprovalActionState } from "./action-state";
import { approveApprovalAction, rejectApprovalAction } from "./actions";

type DecisionPanelProps = {
  approvalId: string;
  finalStatus: string;
};

export function DecisionPanel({ approvalId, finalStatus }: DecisionPanelProps) {
  const [approveState, approveAction, approvePending] = useActionState(
    (previous: ApprovalActionState) => approveApprovalAction(approvalId, previous),
    approvalActionIdleState
  );

  const [rejectState, rejectAction, rejectPending] = useActionState(
    (previous: ApprovalActionState, formData: FormData) =>
      rejectApprovalAction(approvalId, previous, formData),
    approvalActionIdleState
  );

  const decided =
    finalStatus === "APPROVED" || finalStatus === "REJECTED" || finalStatus === "CANCELLED";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
          Approve
        </p>
        <form action={approveAction}>
          <Button variant="primary" type="submit" disabled={approvePending || decided}>
            {approvePending ? "Approving…" : "Approve"}
          </Button>
        </form>
        {approveState.status === "error" ? (
          <FormAlert tone="error">{approveState.message}</FormAlert>
        ) : null}
        {approveState.status === "success" ? (
          <FormAlert tone="success">{approveState.message}</FormAlert>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
          Reject
        </p>
        <form action={rejectAction} className="flex flex-col gap-3">
          <FormField label="Reason (required)" htmlFor="reject-reason">
            <Textarea
              id="reject-reason"
              name="reason"
              placeholder="Why is this approval being rejected?"
              maxLength={1000}
              required
              disabled={rejectPending || decided}
            />
          </FormField>
          <Button variant="danger" type="submit" disabled={rejectPending || decided}>
            {rejectPending ? "Rejecting…" : "Reject"}
          </Button>
        </form>
        {rejectState.status === "error" ? (
          <FormAlert tone="error">{rejectState.message}</FormAlert>
        ) : null}
        {rejectState.status === "success" ? (
          <FormAlert tone="success">{rejectState.message}</FormAlert>
        ) : null}
      </div>

      {decided ? (
        <p className="text-xs font-light text-[var(--miro-slate)]">
          This approval is already in a terminal state ({finalStatus}). Decision buttons are
          disabled.
        </p>
      ) : null}
    </div>
  );
}
