import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AuthController } from "./modules/auth/auth.controller";
import { AuthStubGuard } from "./modules/auth/auth.guard";
import { RbacGuard } from "./modules/auth/rbac.guard";
import { AutomationModule } from "./modules/automation/automation.module";
import { HealthController } from "./modules/health/health.controller";
import { AlertsController } from "./modules/insights/alerts.controller";
import { InsightsService } from "./modules/insights/insights.service";
import { RewardsController } from "./modules/insights/rewards.controller";
import { CdvnHealthSyncController } from "./modules/internal/cdvn-health-sync.controller";
import { CdvnHealthSyncService } from "./modules/internal/cdvn-health-sync.service";
import { InventoryController } from "./modules/inventory/inventory.controller";
import { InventoryService } from "./modules/inventory/inventory.service";
import { ApprovalsController } from "./modules/workflows/approvals.controller";
import { AuditLogsController } from "./modules/workflows/audit-logs.controller";
import { DepositsController } from "./modules/workflows/deposits.controller";
import { WorkflowsService } from "./modules/workflows/workflows.service";

@Module({
  imports: [AutomationModule],
  controllers: [
    HealthController,
    CdvnHealthSyncController,
    AuthController,
    InventoryController,
    AlertsController,
    RewardsController,
    ApprovalsController,
    DepositsController,
    AuditLogsController,
  ],
  providers: [
    InventoryService,
    InsightsService,
    WorkflowsService,
    CdvnHealthSyncService,
    {
      provide: APP_GUARD,
      useClass: AuthStubGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
})
export class AppModule {}
