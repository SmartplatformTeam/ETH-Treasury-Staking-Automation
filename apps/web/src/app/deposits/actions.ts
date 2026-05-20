"use server";

import { revalidatePath } from "next/cache";

import { ApiError, postApiJson } from "../../lib/api-client";

import type { DepositActionState } from "./action-state";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toErrorState(error: unknown, fallback: string): DepositActionState {
  if (error instanceof ApiError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof Error && error.message) {
    return { status: "error", message: error.message };
  }
  return { status: "error", message: fallback };
}

function revalidateDepositPaths(depositId?: string) {
  revalidatePath("/deposits");
  if (depositId) {
    revalidatePath(`/deposits/${depositId}`);
  }
}

export async function createDepositAction(
  _previous: DepositActionState,
  formData: FormData
): Promise<DepositActionState> {
  const payload = {
    network: readString(formData, "network"),
    ownerEntity: readString(formData, "ownerEntity"),
    clusterId: readString(formData, "clusterId"),
    treasuryAccountId: readString(formData, "treasuryAccountId"),
    validatorCount: 1,
    pubkey: readString(formData, "pubkey"),
    withdrawalCredentials: readString(formData, "withdrawalCredentials"),
    signature: readString(formData, "signature"),
    depositDataRoot: readString(formData, "depositDataRoot")
  };

  try {
    const created = await postApiJson<{ id: string }>("/deposits", payload);
    revalidateDepositPaths(created.id);
    return {
      status: "success",
      message: `Deposit request ${created.id} created.`,
      depositId: created.id
    };
  } catch (error) {
    return toErrorState(error, "Failed to create deposit request.");
  }
}

export async function exportDepositAction(
  depositId: string,
  _previous: DepositActionState,
  formData: FormData
): Promise<DepositActionState> {
  const nonce = readString(formData, "nonce");
  try {
    await postApiJson<{ id: string }>(`/deposits/${depositId}/export`, { nonce });
    revalidateDepositPaths(depositId);
    return { status: "success", message: "Safe payload exported.", depositId };
  } catch (error) {
    return toErrorState(error, "Failed to export Safe payload.");
  }
}

export async function markSubmittedAction(
  depositId: string,
  _previous: DepositActionState,
  formData: FormData
): Promise<DepositActionState> {
  const safeTxHash = readString(formData, "safeTxHash");
  try {
    await postApiJson<{ id: string }>(`/deposits/${depositId}/mark-submitted`, { safeTxHash });
    revalidateDepositPaths(depositId);
    return { status: "success", message: "Marked as submitted.", depositId };
  } catch (error) {
    return toErrorState(error, "Failed to mark deposit submitted.");
  }
}

export async function cancelDepositAction(
  depositId: string,
  _previous: DepositActionState
): Promise<DepositActionState> {
  try {
    await postApiJson<{ id: string }>(`/deposits/${depositId}/cancel`, {});
    revalidateDepositPaths(depositId);
    return { status: "success", message: "Deposit request cancelled.", depositId };
  } catch (error) {
    return toErrorState(error, "Failed to cancel deposit request.");
  }
}
