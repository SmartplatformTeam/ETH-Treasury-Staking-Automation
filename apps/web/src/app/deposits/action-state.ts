export type DepositActionState =
  | { status: "idle" }
  | { status: "success"; message: string; depositId?: string }
  | { status: "error"; message: string };

export const depositActionIdleState: DepositActionState = { status: "idle" };
