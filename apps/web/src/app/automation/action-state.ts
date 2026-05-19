export type AutomationActionState =
  | { status: "idle" }
  | { status: "success"; runId: string }
  | { status: "error"; message: string };

export const automationActionIdleState: AutomationActionState = { status: "idle" };
