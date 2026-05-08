import type {
  AutomationOperation,
  AutomationRunStatus,
  AutomationRunStream,
} from "@eth-staking/db";

export type AutomationRunEventResponseDto = {
  id: string;
  sequence: number;
  stream: AutomationRunStream;
  message: string;
  redacted: boolean;
  createdAt: Date;
};

export type AutomationRunResponseDto = {
  runId: string;
  status: AutomationRunStatus;
  operation: AutomationOperation;
  clusterId: string | null;
  hostId: string | null;
  approvalId: string | null;
  playbook: string;
  inventoryRef: string;
  dryRun: boolean;
  startedAt: Date | null;
  completedAt: Date | null;
  exitCode: number | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  events?: AutomationRunEventResponseDto[];
};
