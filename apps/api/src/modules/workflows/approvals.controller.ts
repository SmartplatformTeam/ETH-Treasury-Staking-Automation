import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ApprovalPolicyType, ApprovalStatus } from "@eth-staking/db";

import { RequirePermissions } from "../auth/auth.decorators";
import { WorkflowsService } from "./workflows.service";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

function parseStatus(rawValue?: string) {
  if (!rawValue) {
    return undefined;
  }

  const normalizedValue = rawValue.trim().toUpperCase();

  if (Object.values(ApprovalStatus).includes(normalizedValue as ApprovalStatus)) {
    return normalizedValue as ApprovalStatus;
  }

  throw new BadRequestException(
    `Invalid status '${rawValue}'. Use one of: ${Object.values(ApprovalStatus).join(", ")}.`
  );
}

function parsePolicyType(rawValue?: string) {
  if (!rawValue) {
    return undefined;
  }

  const normalizedValue = rawValue.trim().toUpperCase();

  if (Object.values(ApprovalPolicyType).includes(normalizedValue as ApprovalPolicyType)) {
    return normalizedValue as ApprovalPolicyType;
  }

  throw new BadRequestException(
    `Invalid policyType '${rawValue}'. Use one of: ${Object.values(ApprovalPolicyType).join(", ")}.`
  );
}

function parseLimit(rawValue?: string) {
  if (!rawValue) {
    return DEFAULT_LIMIT;
  }

  const parsedLimit = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    throw new BadRequestException("Query parameter 'limit' must be a positive integer.");
  }

  return Math.min(parsedLimit, MAX_LIMIT);
}

@ApiTags("approvals")
@Controller("approvals")
@RequirePermissions("approvals:read")
export class ApprovalsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: "List approval workflow entries for risky operations." })
  @ApiQuery({
    name: "status",
    required: false,
    description: `Filter by approval status (${Object.values(ApprovalStatus).join(", ")}).`
  })
  @ApiQuery({
    name: "policyType",
    required: false,
    description: `Filter by policy type (${Object.values(ApprovalPolicyType).join(", ")}).`
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: `Maximum rows to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`
  })
  listApprovals(
    @Query("status") statusRaw?: string,
    @Query("policyType") policyTypeRaw?: string,
    @Query("limit") limitRaw?: string
  ) {
    const status = parseStatus(statusRaw);
    const policyType = parsePolicyType(policyTypeRaw);

    return this.workflowsService.listApprovals({
      ...(status ? { status } : {}),
      ...(policyType ? { policyType } : {}),
      limit: parseLimit(limitRaw)
    });
  }
}
