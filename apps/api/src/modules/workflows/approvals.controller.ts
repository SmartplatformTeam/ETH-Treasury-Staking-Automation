import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ApprovalPolicyType, ApprovalStatus } from "@eth-staking/db";
import type { AuthSession, UserRole } from "@eth-staking/domain";

import { CurrentSession, RequirePermissions } from "../auth/auth.decorators";
import { parseCreateApprovalDto } from "./dto/create-approval.dto";
import { parseRejectApprovalDto } from "./dto/decide-approval.dto";
import { WorkflowsService } from "./workflows.service";

const policyCreationRoles: Record<ApprovalPolicyType, ReadonlySet<UserRole>> = {
  ROLLOUT: new Set(["ADMIN", "INFRA_OPERATOR"]),
  DEPOSIT_REQUEST: new Set(["ADMIN", "TREASURY_OPERATOR"]),
  DKG_CEREMONY: new Set(["ADMIN"]),
  SAFE_PROPOSAL: new Set(["ADMIN", "TREASURY_OPERATOR"]),
  SIGNER_BINDING: new Set(["ADMIN", "INFRA_OPERATOR"]),
  CHARON_ARTIFACT_STAGE: new Set(["ADMIN", "INFRA_OPERATOR"])
};

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
  constructor(
    @Inject(WorkflowsService) private readonly workflowsService: WorkflowsService
  ) {}

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

  @Get(":id")
  @ApiOperation({ summary: "Get a single approval with requester/decider context." })
  @ApiParam({ name: "id", description: "Approval id (cuid)." })
  getApproval(@Param("id") approvalId: string) {
    return this.workflowsService.getApproval(approvalId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Create a new approval. Currently supports policyType=ROLLOUT (INFRA_OPERATOR/ADMIN) and DEPOSIT_REQUEST (TREASURY_OPERATOR/ADMIN)."
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["policyType"],
      properties: {
        policyType: { type: "string", enum: ["ROLLOUT", "DEPOSIT_REQUEST"] },
        clusterId: { type: "string" },
        hostId: { type: "string" },
        automationOperation: { type: "string" },
        depositRequestId: { type: "string" }
      }
    }
  })
  createApproval(@Body() body: unknown, @CurrentSession() session: AuthSession) {
    const dto = parseCreateApprovalDto(body);
    const allowedRoles = policyCreationRoles[dto.policyType];

    if (!allowedRoles.has(session.role)) {
      throw new ForbiddenException(
        `Role '${session.role}' cannot create approval with policyType '${dto.policyType}'.`
      );
    }

    return this.workflowsService.createApproval(dto, session);
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("approvals:decide")
  @ApiOperation({
    summary:
      "Approve a pending approval. Requires APPROVER or ADMIN role. Requester cannot self-approve."
  })
  @ApiParam({ name: "id", description: "Approval id (cuid)." })
  approveApproval(@Param("id") approvalId: string, @CurrentSession() session: AuthSession) {
    return this.workflowsService.approveApproval(approvalId, session);
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("approvals:decide")
  @ApiOperation({
    summary:
      "Reject a pending approval with a required reason. Requires APPROVER or ADMIN role. Requester cannot self-reject."
  })
  @ApiParam({ name: "id", description: "Approval id (cuid)." })
  @ApiBody({
    schema: {
      type: "object",
      required: ["reason"],
      properties: {
        reason: {
          type: "string",
          description: "Non-empty reason recorded in audit log."
        }
      }
    }
  })
  rejectApproval(
    @Param("id") approvalId: string,
    @Body() body: unknown,
    @CurrentSession() session: AuthSession
  ) {
    const dto = parseRejectApprovalDto(body);
    return this.workflowsService.rejectApproval(approvalId, session, dto.reason);
  }
}
