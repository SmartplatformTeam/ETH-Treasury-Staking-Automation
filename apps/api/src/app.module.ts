import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AuthController } from "./modules/auth/auth.controller";
import { AuthStubGuard } from "./modules/auth/auth.guard";
import { RbacGuard } from "./modules/auth/rbac.guard";
import { HealthController } from "./modules/health/health.controller";
import { InventoryController } from "./modules/inventory/inventory.controller";
import { InventoryService } from "./modules/inventory/inventory.service";
import { AlertsController } from "./modules/insights/alerts.controller";
import { InsightsService } from "./modules/insights/insights.service";
import { RewardsController } from "./modules/insights/rewards.controller";
import { ApprovalsController } from "./modules/workflows/approvals.controller";
import { AuditLogsController } from "./modules/workflows/audit-logs.controller";
import { DepositsController } from "./modules/workflows/deposits.controller";
import { WorkflowsService } from "./modules/workflows/workflows.service";

@Module({
  controllers: [
    HealthController,
    AuthController,
    InventoryController,
    AlertsController,
    RewardsController,
    ApprovalsController,
    DepositsController,
    AuditLogsController
  ],
  providers: [
    InventoryService,
    InsightsService,
    WorkflowsService,
    {
      provide: APP_GUARD,
      useClass: AuthStubGuard
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard
    }
  ]
})
export class AppModule {}
