import { Body, Controller, Headers, Inject, Post, UnauthorizedException } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import { loadRuntimeEnv } from "@eth-staking/config";

import { Public } from "../auth/auth.decorators";
import { CdvnHealthSyncService } from "./cdvn-health-sync.service";

const healthSyncTokenHeader = "x-control-plane-sync-token";

@ApiTags("internal")
@Controller("internal/cdvn")
export class CdvnHealthSyncController {
  constructor(
    @Inject(CdvnHealthSyncService)
    private readonly cdvnHealthSyncService: CdvnHealthSyncService,
  ) {}

  @Post("health-sync")
  @Public()
  @ApiOperation({ summary: "Accept CDVN health sync payloads from Ansible runtime jobs." })
  @ApiHeader({
    name: healthSyncTokenHeader,
    required: true,
    description: "Shared internal token configured as CDVN_HEALTH_SYNC_TOKEN.",
  })
  sync(@Headers(healthSyncTokenHeader) token: string | undefined, @Body() body: unknown) {
    const env = loadRuntimeEnv();

    if (
      !token ||
      token !== env.CDVN_HEALTH_SYNC_TOKEN ||
      (env.NODE_ENV === "production" && env.CDVN_HEALTH_SYNC_TOKEN === "change-me")
    ) {
      throw new UnauthorizedException("Invalid CDVN health sync token.");
    }

    return this.cdvnHealthSyncService.sync(body);
  }
}
