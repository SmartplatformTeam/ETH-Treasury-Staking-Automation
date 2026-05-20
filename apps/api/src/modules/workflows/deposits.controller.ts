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

import { ApprovalStatus, DepositExecutionStatus } from "@eth-staking/db";
import type { AuthSession, UserRole } from "@eth-staking/domain";

import { CurrentSession, RequirePermissions } from "../auth/auth.decorators";
import {
  parseCreateDepositRequestDto,
  parseExportSafePayloadDto,
  parseMarkSubmittedDto
} from "./dto/deposit-request.dto";
import { WorkflowsService } from "./workflows.service";

const writeRoles = new Set<UserRole>(["ADMIN", "TREASURY_OPERATOR"]);

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
  constructor(
    @Inject(WorkflowsService) private readonly workflowsService: WorkflowsService
  ) {}

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

  @Get(":id")
  @ApiOperation({ summary: "Get a single deposit request with linked approval and Safe proposal." })
  @ApiParam({ name: "id", description: "DepositRequest id." })
  getDeposit(@Param("id") id: string) {
    return this.workflowsService.getDepositRequest(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Create a deposit request and auto-attach a DEPOSIT_REQUEST approval (TREASURY_OPERATOR/ADMIN)."
  })
  @ApiBody({
    schema: {
      type: "object",
      required: [
        "network",
        "ownerEntity",
        "clusterId",
        "treasuryAccountId",
        "validatorCount",
        "pubkey",
        "withdrawalCredentials",
        "signature",
        "depositDataRoot"
      ],
      properties: {
        network: { type: "string", enum: ["MAINNET", "HOLESKY", "HOODI"] },
        ownerEntity: { type: "string" },
        clusterId: { type: "string" },
        treasuryAccountId: { type: "string" },
        validatorCount: { type: "integer", example: 1 },
        pubkey: { type: "string", description: "0x + 96 hex chars" },
        withdrawalCredentials: { type: "string", description: "0x + 64 hex chars" },
        signature: { type: "string", description: "0x + 192 hex chars" },
        depositDataRoot: { type: "string", description: "0x + 64 hex chars" },
        depositDataObjectKey: { type: "string", description: "Optional. Reference to external object store." }
      }
    }
  })
  createDeposit(@Body() body: unknown, @CurrentSession() session: AuthSession) {
    if (!writeRoles.has(session.role)) {
      throw new ForbiddenException(`Role '${session.role}' cannot create deposit requests.`);
    }
    const dto = parseCreateDepositRequestDto(body);
    return this.workflowsService.createDepositRequest(dto, session);
  }

  @Post(":id/export")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Build Safe Tx payload from the linked deposit data and persist as SafeProposal (TREASURY_OPERATOR/ADMIN)."
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["nonce"],
      properties: {
        nonce: { type: "string", description: "Safe wallet nonce (decimal integer string). Copy from Safe UI." }
      }
    }
  })
  exportDeposit(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: AuthSession
  ) {
    if (!writeRoles.has(session.role)) {
      throw new ForbiddenException(`Role '${session.role}' cannot export Safe payloads.`);
    }
    const dto = parseExportSafePayloadDto(body);
    return this.workflowsService.exportSafePayload(id, dto, session);
  }

  @Post(":id/mark-submitted")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Mark the deposit request as submitted with the Safe transaction hash (TREASURY_OPERATOR/ADMIN)."
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["safeTxHash"],
      properties: {
        safeTxHash: { type: "string", description: "0x + 64 hex chars" }
      }
    }
  })
  markSubmitted(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: AuthSession
  ) {
    if (!writeRoles.has(session.role)) {
      throw new ForbiddenException(`Role '${session.role}' cannot mark deposits submitted.`);
    }
    const dto = parseMarkSubmittedDto(body);
    return this.workflowsService.markDepositSubmitted(id, dto, session);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cancel a deposit request (only DRAFT or EXPORTED). TREASURY_OPERATOR/ADMIN."
  })
  cancelDeposit(@Param("id") id: string, @CurrentSession() session: AuthSession) {
    if (!writeRoles.has(session.role)) {
      throw new ForbiddenException(`Role '${session.role}' cannot cancel deposit requests.`);
    }
    return this.workflowsService.cancelDepositRequest(id, session);
  }
}
