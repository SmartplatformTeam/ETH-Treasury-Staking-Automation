import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import type { AuthSession } from "@eth-staking/domain";
import { CurrentSession, RequirePermissions } from "../auth/auth.decorators";
import { AutomationService } from "./automation.service";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function parseLimit(rawValue?: string) {
  if (!rawValue) {
    return DEFAULT_LIMIT;
  }

  const parsedLimit = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, MAX_LIMIT);
}

@ApiTags("automation")
@Controller("automation/runs")
@RequirePermissions("inventory:read")
export class AutomationController {
  constructor(@Inject(AutomationService) private readonly automationService: AutomationService) {}

  @Post()
  @ApiOperation({ summary: "Create an Ansible-backed automation run." })
  createRun(@Body() body: unknown, @CurrentSession() session: AuthSession) {
    return this.automationService.createRun(body, session);
  }

  @Get()
  @ApiOperation({ summary: "List recent automation runs." })
  @ApiQuery({
    name: "limit",
    required: false,
    description: `Maximum rows to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`,
  })
  listRuns(@Query("limit") limitRaw?: string) {
    return this.automationService.listRuns(parseLimit(limitRaw));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one automation run with redacted log events." })
  getRun(@Param("id") id: string) {
    return this.automationService.getRun(id);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Mark cancellation requested for an automation run." })
  cancelRun(@Param("id") id: string, @CurrentSession() session: AuthSession) {
    return this.automationService.cancelRun(id, session);
  }
}
