import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../auth/auth.decorators";
import { InsightsService } from "./insights.service";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

function parseSeverity(rawValue?: string) {
  if (!rawValue) {
    return undefined;
  }

  const normalizedValue = rawValue.trim().toUpperCase();

  if (normalizedValue === "CRITICAL" || normalizedValue === "WARNING") {
    return normalizedValue;
  }

  throw new BadRequestException("Invalid severity. Use one of: CRITICAL, WARNING.");
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

@ApiTags("alerts")
@Controller("alerts")
@RequirePermissions("alerts:read")
export class AlertsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  @ApiOperation({ summary: "List active alerts derived from runtime health degradation." })
  @ApiQuery({
    name: "severity",
    required: false,
    description: "Filter by severity (CRITICAL or WARNING)."
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: `Maximum rows to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`
  })
  listAlerts(@Query("severity") severityRaw?: string, @Query("limit") limitRaw?: string) {
    const severity = parseSeverity(severityRaw);

    return this.insightsService.listAlerts({
      ...(severity ? { severity } : {}),
      limit: parseLimit(limitRaw)
    });
  }
}
