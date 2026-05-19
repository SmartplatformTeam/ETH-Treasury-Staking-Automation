export type ApprovalActionState =
  | { status: "idle" }
  | { status: "success"; message: string; approvalId?: string }
  | { status: "error"; message: string };

export const approvalActionIdleState: ApprovalActionState = { status: "idle" };
