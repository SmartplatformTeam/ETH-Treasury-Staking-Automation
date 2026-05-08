import { Module } from "@nestjs/common";

import { AutomationCommandBuilder } from "./automation-command-builder";
import { AutomationRunnerService } from "./automation-runner.service";
import { AutomationController } from "./automation.controller";
import { AutomationService } from "./automation.service";

@Module({
  controllers: [AutomationController],
  providers: [AutomationService, AutomationRunnerService, AutomationCommandBuilder],
})
export class AutomationModule {}
