export type OperationOption = {
  value: string;
  label: string;
  mode: "admin prepare" | "read-only" | "dry-run" | "execute";
  dryRun: boolean;
};

export const operationOptions: readonly OperationOption[] = [
  { value: "BOOTSTRAP_HOST", label: "Bootstrap host", mode: "admin prepare", dryRun: false },
  { value: "VERIFY_BASELINE", label: "Verify baseline mirror", mode: "read-only", dryRun: false },
  { value: "RENDER_RUNTIME", label: "Render runtime", mode: "dry-run", dryRun: true },
  { value: "VERIFY_RUNTIME", label: "Verify runtime", mode: "dry-run", dryRun: true },
  { value: "ROLLOUT_DRY_RUN", label: "Rollout preview", mode: "dry-run", dryRun: true },
  { value: "ROLLOUT_EXECUTE", label: "Rollout execute", mode: "execute", dryRun: false },
  { value: "PREFLIGHT_HOST", label: "Host preflight", mode: "dry-run", dryRun: true },
  { value: "STAGE_ARTIFACTS_DRY_RUN", label: "Artifact stage preview", mode: "dry-run", dryRun: true },
  { value: "STAGE_ARTIFACTS_EXECUTE", label: "Artifact stage execute", mode: "execute", dryRun: false },
  { value: "DEPLOYED_VERIFY", label: "Deployed verify", mode: "dry-run", dryRun: true },
  { value: "COMPOSE_DRY_RUN", label: "Compose preview", mode: "dry-run", dryRun: true },
  { value: "COMPOSE_EXECUTE", label: "Compose execute", mode: "execute", dryRun: false },
  { value: "FULL_OPERATOR_MVP", label: "Full operator MVP", mode: "execute", dryRun: false },
  { value: "HEALTH_SYNC_DRY_RUN", label: "Health sync preview", mode: "dry-run", dryRun: true }
] as const;

export const executeOperations = new Set<string>([
  "ROLLOUT_EXECUTE",
  "STAGE_ARTIFACTS_EXECUTE",
  "COMPOSE_EXECUTE",
  "FULL_OPERATOR_MVP"
]);

export const operationToExpectedPolicy: Record<string, string> = {
  ROLLOUT_EXECUTE: "ROLLOUT",
  COMPOSE_EXECUTE: "ROLLOUT",
  FULL_OPERATOR_MVP: "ROLLOUT",
  STAGE_ARTIFACTS_EXECUTE: "CHARON_ARTIFACT_STAGE"
};

export function isExecuteOperation(operation: string): boolean {
  return executeOperations.has(operation);
}
