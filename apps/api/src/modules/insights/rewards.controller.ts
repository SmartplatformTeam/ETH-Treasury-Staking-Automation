import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../auth/auth.decorators";
import { InsightsService } from "./insights.service";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 120;

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

@ApiTags("rewards")
@Controller("rewards")
@RequirePermissions("rewards:read")
export class RewardsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  @ApiOperation({ summary: "List reward ledger summaries grouped by period and strategy." })
  @ApiQuery({
    name: "limit",
    required: false,
    description: `Maximum rows to return (default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}).`
  })
  listRewards(@Query("limit") limitRaw?: string) {
    return this.insightsService.listRewards({
      limit: parseLimit(limitRaw)
    });
  }
}
