import { BadRequestException } from "@nestjs/common";

import { ApprovalPolicyType, AutomationOperation } from "@eth-staking/db";

const supportedPolicyTypes = new Set<ApprovalPolicyType>([
  ApprovalPolicyType.ROLLOUT,
  ApprovalPolicyType.DEPOSIT_REQUEST
]);

const rolloutOperations = new Set<AutomationOperation>([
  AutomationOperation.ROLLOUT_EXECUTE,
  AutomationOperation.STAGE_ARTIFACTS_EXECUTE,
  AutomationOperation.COMPOSE_EXECUTE,
  AutomationOperation.FULL_OPERATOR_MVP
]);

export type CreateRolloutApprovalDto = {
  policyType: typeof ApprovalPolicyType.ROLLOUT;
  clusterId: string;
  hostId: string;
  automationOperation: AutomationOperation;
};

export type CreateDepositApprovalDto = {
  policyType: typeof ApprovalPolicyType.DEPOSIT_REQUEST;
  depositRequestId: string;
};

export type CreateApprovalDto = CreateRolloutApprovalDto | CreateDepositApprovalDto;

function requireString(input: Record<string, unknown>, key: string) {
  const value = input[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`Field '${key}' is required and must be a non-empty string.`);
  }

  return value.trim();
}

function parsePolicyType(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    throw new BadRequestException("Field 'policyType' is required.");
  }

  const normalized = rawValue.trim().toUpperCase();

  if (!Object.values(ApprovalPolicyType).includes(normalized as ApprovalPolicyType)) {
    throw new BadRequestException(
      `Invalid policyType '${rawValue}'. Use one of: ${Object.values(ApprovalPolicyType).join(", ")}.`
    );
  }

  const policyType = normalized as ApprovalPolicyType;

  if (!supportedPolicyTypes.has(policyType)) {
    throw new BadRequestException(
      `policyType '${policyType}' creation is not yet supported. Use one of: ${[...supportedPolicyTypes].join(", ")}.`
    );
  }

  return policyType;
}

function parseAutomationOperation(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    throw new BadRequestException("Field 'automationOperation' is required for ROLLOUT policy.");
  }

  const normalized = rawValue.trim().toUpperCase();

  if (!Object.values(AutomationOperation).includes(normalized as AutomationOperation)) {
    throw new BadRequestException(
      `Invalid automationOperation '${rawValue}'. Use one of: ${Object.values(AutomationOperation).join(", ")}.`
    );
  }

  const operation = normalized as AutomationOperation;

  if (!rolloutOperations.has(operation)) {
    throw new BadRequestException(
      `automationOperation '${operation}' is not gated by ROLLOUT approval. Use one of: ${[...rolloutOperations].join(", ")}.`
    );
  }

  return operation;
}

export function parseCreateApprovalDto(rawValue: unknown): CreateApprovalDto {
  if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
    throw new BadRequestException("Request body must be an object.");
  }

  const input = rawValue as Record<string, unknown>;
  const policyType = parsePolicyType(input.policyType);

  if (policyType === ApprovalPolicyType.ROLLOUT) {
    return {
      policyType: ApprovalPolicyType.ROLLOUT,
      clusterId: requireString(input, "clusterId"),
      hostId: requireString(input, "hostId"),
      automationOperation: parseAutomationOperation(input.automationOperation)
    };
  }

  return {
    policyType: ApprovalPolicyType.DEPOSIT_REQUEST,
    depositRequestId: requireString(input, "depositRequestId")
  };
}
