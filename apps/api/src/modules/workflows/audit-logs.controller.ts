import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../auth/auth.decorators";
import { WorkflowsService } from "./workflows.service";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

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

@ApiTags("audit")
@Controller("audit-logs")
@RequirePermissions("audit:read")
export class AuditLogsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: "List audit log events with actor and resource context." })
  @ApiQuery({
    name: "actionType",
    required: false,
    description: "Filter by action type (exact match)."
  })
  @ApiQuery({
    name: "resourceType",
    required: false,
    description: "Filter by resource type (exact match)."
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: `Maximum rows to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`
  })
  listAuditLogs(
    @Query("actionType") actionType?: string,
    @Query("resourceType") resourceType?: string,
    @Query("limit") limitRaw?: string
  ) {
    const normalizedActionType = actionType?.trim() || "";
    const normalizedResourceType = resourceType?.trim() || "";

    return this.workflowsService.listAuditLogs({
      ...(normalizedActionType ? { actionType: normalizedActionType } : {}),
      ...(normalizedResourceType ? { resourceType: normalizedResourceType } : {}),
      limit: parseLimit(limitRaw)
    });
  }
}
