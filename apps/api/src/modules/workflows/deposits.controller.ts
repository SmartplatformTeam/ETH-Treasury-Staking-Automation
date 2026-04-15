import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ApprovalStatus, DepositExecutionStatus } from "@eth-staking/db";

import { RequirePermissions } from "../auth/auth.decorators";
import { WorkflowsService } from "./workflows.service";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

function parseApprovalStatus(rawValue?: string) {
  if (!rawValue) {
    return undefined;
  }

  const normalizedValue = rawValue.trim().toUpperCase();

  if (Object.values(ApprovalStatus).includes(normalizedValue as ApprovalStatus)) {
    return normalizedValue as ApprovalStatus;
  }

  throw new BadRequestException(
    `Invalid approvalStatus '${rawValue}'. Use one of: ${Object.values(ApprovalStatus).join(", ")}.`
  );
}

function parseExecutionStatus(rawValue?: string) {
  if (!rawValue) {
    return undefined;
  }

  const normalizedValue = rawValue.trim().toUpperCase();

  if (Object.values(DepositExecutionStatus).includes(normalizedValue as DepositExecutionStatus)) {
    return normalizedValue as DepositExecutionStatus;
  }

  throw new BadRequestException(
    `Invalid executionStatus '${rawValue}'. Use one of: ${Object.values(DepositExecutionStatus).join(", ")}.`
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

@ApiTags("deposits")
@Controller("deposits")
@RequirePermissions("deposits:read")
export class DepositsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: "List deposit requests and linked approval/export state." })
  @ApiQuery({
    name: "approvalStatus",
    required: false,
    description: `Filter by approval status (${Object.values(ApprovalStatus).join(", ")}).`
  })
  @ApiQuery({
    name: "executionStatus",
    required: false,
    description: `Filter by execution status (${Object.values(DepositExecutionStatus).join(", ")}).`
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: `Maximum rows to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`
  })
  listDeposits(
    @Query("approvalStatus") approvalStatusRaw?: string,
    @Query("executionStatus") executionStatusRaw?: string,
    @Query("limit") limitRaw?: string
  ) {
    const approvalStatus = parseApprovalStatus(approvalStatusRaw);
    const executionStatus = parseExecutionStatus(executionStatusRaw);

    return this.workflowsService.listDeposits({
      ...(approvalStatus ? { approvalStatus } : {}),
      ...(executionStatus ? { executionStatus } : {}),
      limit: parseLimit(limitRaw)
    });
  }
}
