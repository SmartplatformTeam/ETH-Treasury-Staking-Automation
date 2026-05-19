"use server";

import { revalidatePath } from "next/cache";

import { ApiError, postApiJson } from "../../lib/api-client";

export type ApprovalActionState =
  | { status: "idle" }
  | { status: "success"; message: string; approvalId?: string }
  | { status: "error"; message: string };

const IDLE: ApprovalActionState = { status: "idle" };

function toErrorState(error: unknown, fallback: string): ApprovalActionState {
  if (error instanceof ApiError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof Error && error.message) {
    return { status: "error", message: error.message };
  }
  return { status: "error", message: fallback };
}

function revalidateApprovalPaths(approvalId?: string) {
  revalidatePath("/approvals");
  if (approvalId) {
    revalidatePath(`/approvals/${approvalId}`);
  }
}

export async function approveApprovalAction(
  approvalId: string,
  _previous: ApprovalActionState
): Promise<ApprovalActionState> {
  try {
    await postApiJson<{ id: string }>(`/approvals/${approvalId}/approve`, {});
    revalidateApprovalPaths(approvalId);
    return { status: "success", message: "Approval approved.", approvalId };
  } catch (error) {
    return toErrorState(error, "Failed to approve.");
  }
}

export async function rejectApprovalAction(
  approvalId: string,
  _previous: ApprovalActionState,
  formData: FormData
): Promise<ApprovalActionState> {
  const reason = formData.get("reason");
  const reasonValue = typeof reason === "string" ? reason : "";

  try {
    await postApiJson<{ id: string }>(`/approvals/${approvalId}/reject`, {
      reason: reasonValue
    });
    revalidateApprovalPaths(approvalId);
    return { status: "success", message: "Approval rejected.", approvalId };
  } catch (error) {
    return toErrorState(error, "Failed to reject.");
  }
}

type CreateApprovalPayload =
  | {
      policyType: "ROLLOUT";
      clusterId: string;
      hostId: string;
      automationOperation: string;
    }
  | {
      policyType: "DEPOSIT_REQUEST";
      depositRequestId: string;
    };

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createApprovalAction(
  _previous: ApprovalActionState,
  formData: FormData
): Promise<ApprovalActionState> {
  const policyType = readFormString(formData, "policyType");

  let payload: CreateApprovalPayload;
  if (policyType === "ROLLOUT") {
    payload = {
      policyType: "ROLLOUT",
      clusterId: readFormString(formData, "clusterId"),
      hostId: readFormString(formData, "hostId"),
      automationOperation: readFormString(formData, "automationOperation")
    };
  } else if (policyType === "DEPOSIT_REQUEST") {
    payload = {
      policyType: "DEPOSIT_REQUEST",
      depositRequestId: readFormString(formData, "depositRequestId")
    };
  } else {
    return { status: "error", message: "Select a policyType to create an approval." };
  }

  try {
    const created = await postApiJson<{ id: string }>(`/approvals`, payload);
    revalidateApprovalPaths(created.id);
    return {
      status: "success",
      message: `Approval ${created.id} created.`,
      approvalId: created.id
    };
  } catch (error) {
    return toErrorState(error, "Failed to create approval.");
  }
}

export { IDLE as approvalActionIdleState };
