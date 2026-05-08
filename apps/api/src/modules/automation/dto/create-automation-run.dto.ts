import { BadRequestException } from "@nestjs/common";

import { AutomationOperation } from "@eth-staking/db";

export const executeAutomationOperations = new Set<AutomationOperation>([
  AutomationOperation.ROLLOUT_EXECUTE,
  AutomationOperation.STAGE_ARTIFACTS_EXECUTE,
  AutomationOperation.COMPOSE_EXECUTE,
  AutomationOperation.FULL_OPERATOR_MVP,
]);

export const dryRunAutomationOperations = new Set<AutomationOperation>([
  AutomationOperation.ROLLOUT_DRY_RUN,
  AutomationOperation.STAGE_ARTIFACTS_DRY_RUN,
  AutomationOperation.COMPOSE_DRY_RUN,
  AutomationOperation.HEALTH_SYNC_DRY_RUN,
]);

export const allowedExtraVarKeys = [
  "cluster_name",
  "host_name",
  "deployment_path",
  "secure_config_dir",
  "approval_file",
  "artifact_source_dir",
  "runtime_dir",
  "execute",
  "dry_run",
] as const;

export type AllowedExtraVarKey = (typeof allowedExtraVarKeys)[number];
export type AutomationExtraVarValue = string | boolean | number;
export type AutomationExtraVars = Partial<Record<AllowedExtraVarKey, AutomationExtraVarValue>>;

export type CreateAutomationRunDto = {
  operation: AutomationOperation;
  clusterId: string;
  hostId: string;
  dryRun: boolean;
  approvalId?: string;
  extraVars: AutomationExtraVars;
};

function readStringField(input: Record<string, unknown>, key: string, required = true) {
  const value = input[key];

  if (value === undefined || value === null) {
    if (required) {
      throw new BadRequestException(`Field '${key}' is required.`);
    }
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`Field '${key}' must be a non-empty string.`);
  }

  return value.trim();
}

function readRequiredStringField(input: Record<string, unknown>, key: string) {
  const value = readStringField(input, key);

  if (!value) {
    throw new BadRequestException(`Field '${key}' is required.`);
  }

  return value;
}

function readBooleanField(input: Record<string, unknown>, key: string) {
  const value = input[key];

  if (typeof value !== "boolean") {
    throw new BadRequestException(`Field '${key}' must be a boolean.`);
  }

  return value;
}

function parseOperation(value: string) {
  if (Object.values(AutomationOperation).includes(value as AutomationOperation)) {
    return value as AutomationOperation;
  }

  throw new BadRequestException(
    `Invalid operation '${value}'. Use one of: ${Object.values(AutomationOperation).join(", ")}.`,
  );
}

function validatePathValue(key: string, value: string) {
  if (!value.startsWith("/")) {
    throw new BadRequestException(`extraVars.${key} must be an absolute host-local path.`);
  }

  if (value.includes("..") || value.includes("\n") || value.includes("\0")) {
    throw new BadRequestException(`extraVars.${key} contains an unsafe path segment.`);
  }

  if (value.length > 512) {
    throw new BadRequestException(`extraVars.${key} is too long.`);
  }
}

function validateNameValue(key: string, value: string) {
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(value)) {
    throw new BadRequestException(
      `extraVars.${key} may contain only letters, numbers, dots, underscores, and dashes.`,
    );
  }
}

function parseExtraVars(rawValue: unknown): AutomationExtraVars {
  if (rawValue === undefined || rawValue === null) {
    return {};
  }

  if (typeof rawValue !== "object" || Array.isArray(rawValue)) {
    throw new BadRequestException("Field 'extraVars' must be an object when provided.");
  }

  const allowedKeys = new Set<string>(allowedExtraVarKeys);
  const pathKeys = new Set([
    "deployment_path",
    "secure_config_dir",
    "approval_file",
    "artifact_source_dir",
    "runtime_dir",
  ]);
  const nameKeys = new Set(["cluster_name", "host_name"]);
  const parsed: AutomationExtraVars = {};

  for (const [key, value] of Object.entries(rawValue as Record<string, unknown>)) {
    if (!allowedKeys.has(key)) {
      throw new BadRequestException(`extraVars.${key} is not allowed.`);
    }

    if (typeof value !== "string" && typeof value !== "boolean" && typeof value !== "number") {
      throw new BadRequestException(`extraVars.${key} must be a string, boolean, or number.`);
    }

    if (typeof value === "string") {
      if (pathKeys.has(key)) {
        validatePathValue(key, value);
      }

      if (nameKeys.has(key)) {
        validateNameValue(key, value);
      }
    }

    parsed[key as AllowedExtraVarKey] = value;
  }

  return parsed;
}

export function parseCreateAutomationRunDto(rawValue: unknown): CreateAutomationRunDto {
  if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
    throw new BadRequestException("Request body must be an object.");
  }

  const input = rawValue as Record<string, unknown>;
  const operation = parseOperation(readRequiredStringField(input, "operation"));
  const dryRun = readBooleanField(input, "dryRun");
  const approvalId = readStringField(input, "approvalId", false);

  if (executeAutomationOperations.has(operation)) {
    if (dryRun) {
      throw new BadRequestException("Execute operations must set dryRun=false.");
    }

    if (!approvalId) {
      throw new BadRequestException("approvalId is required for execute operations.");
    }
  }

  if (dryRunAutomationOperations.has(operation) && !dryRun) {
    throw new BadRequestException("Dry-run operations must set dryRun=true.");
  }

  return {
    operation,
    clusterId: readRequiredStringField(input, "clusterId"),
    hostId: readRequiredStringField(input, "hostId"),
    dryRun,
    ...(approvalId ? { approvalId } : {}),
    extraVars: parseExtraVars(input.extraVars),
  };
}
