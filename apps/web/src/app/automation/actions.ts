"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApiError } from "../../lib/api-client";
import { createAutomationRun } from "../../lib/automation";

import type { AutomationActionState } from "./action-state";

import { operationOptions, executeOperations } from "./operations";

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function startAutomationRunAction(
  _previous: AutomationActionState,
  formData: FormData
): Promise<AutomationActionState> {
  const operation = readFormString(formData, "operation");
  const clusterId = readFormString(formData, "clusterId");
  const hostId = readFormString(formData, "hostId");
  const approvalId = readFormString(formData, "approvalId");

  if (!operation || !clusterId || !hostId) {
    return { status: "error", message: "Select cluster, host, and operation to start a run." };
  }

  const option = operationOptions.find((item) => item.value === operation);
  if (!option) {
    return { status: "error", message: `Unknown operation '${operation}'.` };
  }

  const isExecute = executeOperations.has(operation);

  if (isExecute && !approvalId) {
    return {
      status: "error",
      message: "An approved approval id is required for execute operations."
    };
  }

  const dryRun = option.dryRun;

  let run: Awaited<ReturnType<typeof createAutomationRun>>;
  try {
    run = await createAutomationRun({
      operation,
      clusterId,
      hostId,
      dryRun,
      ...(approvalId ? { approvalId } : {})
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Automation run failed to start." };
  }

  revalidatePath("/automation");
  redirect(`/automation?runId=${run.runId}`);
}
