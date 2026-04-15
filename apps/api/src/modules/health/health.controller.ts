import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public } from "../auth/auth.decorators";

@ApiTags("system")
@Controller("health")
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: "Health probe for the API process and future infrastructure checks." })
  getHealth() {
    return {
      ok: true,
      service: "api",
      timestamp: new Date().toISOString(),
      checks: {
        database: "pending",
        redis: "pending",
        cdvn: "pending"
      }
    };
  }
}
