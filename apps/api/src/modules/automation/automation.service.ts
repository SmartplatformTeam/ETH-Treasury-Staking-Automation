import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  ApprovalPolicyType,
  ApprovalStatus,
  AutomationOperation,
  AutomationRunStatus,
  AutomationRunStream,
  type Prisma,
  prisma,
} from "@eth-staking/db";
import type { AuthSession } from "@eth-staking/domain";

import { AutomationCommandBuilder } from "./automation-command-builder";
import { AutomationRunnerService } from "./automation-runner.service";
import type { AutomationRunResponseDto } from "./dto/automation-run-response.dto";
import {
  executeAutomationOperations,
  parseCreateAutomationRunDto,
} from "./dto/create-automation-run.dto";

const safeInfraOperations = new Set<AutomationOperation>([
  AutomationOperation.VERIFY_BASELINE,
  AutomationOperation.RENDER_RUNTIME,
  AutomationOperation.VERIFY_RUNTIME,
  AutomationOperation.ROLLOUT_DRY_RUN,
  AutomationOperation.PREFLIGHT_HOST,
  AutomationOperation.STAGE_ARTIFACTS_DRY_RUN,
  AutomationOperation.DEPLOYED_VERIFY,
  AutomationOperation.COMPOSE_DRY_RUN,
  AutomationOperation.HEALTH_SYNC_DRY_RUN,
]);

function toInventoryAlias(hostName: string) {
  return hostName.replace(/-/g, "_");
}

function expectedApprovalPolicy(operation: AutomationOperation) {
  if (operation === AutomationOperation.STAGE_ARTIFACTS_EXECUTE) {
    return ApprovalPolicyType.CHARON_ARTIFACT_STAGE;
  }

  return ApprovalPolicyType.ROLLOUT;
}

function toRunResponse(run: {
  id: string;
  status: AutomationRunStatus;
  operation: AutomationOperation;
  clusterId: string | null;
  hostId: string | null;
  approvalId: string | null;
  playbook: string;
  inventoryRef: string;
  dryRun: boolean;
  startedAt: Date | null;
  completedAt: Date | null;
  exitCode: number | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  events?: {
    id: string;
    sequence: number;
    stream: AutomationRunStream;
    message: string;
    redacted: boolean;
    createdAt: Date;
  }[];
}): AutomationRunResponseDto {
  return {
    runId: run.id,
    status: run.status,
    operation: run.operation,
    clusterId: run.clusterId,
    hostId: run.hostId,
    approvalId: run.approvalId,
    playbook: run.playbook,
    inventoryRef: run.inventoryRef,
    dryRun: run.dryRun,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    exitCode: run.exitCode,
    failureReason: run.failureReason,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    ...(run.events ? { events: run.events } : {}),
  };
}

@Injectable()
export class AutomationService {
  constructor(
    @Inject(AutomationCommandBuilder)
    private readonly commandBuilder: AutomationCommandBuilder,
    @Inject(AutomationRunnerService)
    private readonly runner: AutomationRunnerService,
  ) {}

  async listRuns(limit: number) {
    const [total, runs] = await Promise.all([
      prisma.automationRun.count(),
      prisma.automationRun.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    return {
      total,
      items: runs.map(toRunResponse),
    };
  }

  async getRun(runId: string) {
    const run = await prisma.automationRun.findUnique({
      where: { id: runId },
      include: {
        events: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!run) {
      throw new NotFoundException(`Automation run '${runId}' was not found.`);
    }

    return toRunResponse(run);
  }

  async createRun(rawBody: unknown, session: AuthSession) {
    const dto = parseCreateAutomationRunDto(rawBody);
    const [cluster, host] = await Promise.all([
      prisma.cluster.findUnique({
        where: { id: dto.clusterId },
        select: { id: true, name: true },
      }),
      prisma.operatorHost.findUnique({
        where: { id: dto.hostId },
        select: { id: true, name: true, clusterId: true },
      }),
    ]);

    if (!cluster) {
      throw new BadRequestException(`Cluster '${dto.clusterId}' was not found.`);
    }

    if (!host) {
      throw new BadRequestException(`Operator host '${dto.hostId}' was not found.`);
    }

    if (host.clusterId && host.clusterId !== cluster.id) {
      throw new BadRequestException("Operator host does not belong to the requested cluster.");
    }

    this.assertCreateAllowed(session, dto.operation);
    await this.validateApprovalIfRequired(dto.operation, dto.clusterId, dto.hostId, dto.approvalId);

    const requestedBy = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true },
    });
    const command = this.commandBuilder.build(
      dto.operation,
      {
        cluster_name: cluster.name,
        host_name: host.name,
        ...dto.extraVars,
      },
      toInventoryAlias(host.name),
    );
    const run = await prisma.automationRun.create({
      data: {
        operation: dto.operation,
        status: AutomationRunStatus.QUEUED,
        clusterId: dto.clusterId,
        hostId: dto.hostId,
        ...(dto.approvalId ? { approvalId: dto.approvalId } : {}),
        ...(requestedBy ? { requestedById: requestedBy.id } : {}),
        playbook: command.playbook,
        inventoryRef: command.inventoryRef,
        dryRun: dto.dryRun,
      },
    });

    await prisma.automationRunEvent.create({
      data: {
        runId: run.id,
        sequence: 1,
        stream: AutomationRunStream.SYSTEM,
        message: `Automation run queued by ${session.email}.`,
        redacted: false,
      },
    });
    await this.writeAuditLog(requestedBy?.id ?? null, "AUTOMATION_RUN_CREATED", run.id, {
      operation: dto.operation,
      clusterId: dto.clusterId,
      hostId: dto.hostId,
      dryRun: dto.dryRun,
    });

    void this.runner.start(run.id, command);

    return toRunResponse(run);
  }

  async cancelRun(runId: string, session: AuthSession) {
    if (session.role !== "ADMIN" && session.role !== "INFRA_OPERATOR") {
      throw new ForbiddenException(
        "Only ADMIN and INFRA_OPERATOR can request automation cancellation.",
      );
    }

    const run = await prisma.automationRun.findUnique({
      where: { id: runId },
      select: { id: true, status: true },
    });

    if (!run) {
      throw new NotFoundException(`Automation run '${runId}' was not found.`);
    }

    if (run.status !== AutomationRunStatus.QUEUED && run.status !== AutomationRunStatus.RUNNING) {
      throw new BadRequestException(
        "Only queued or running automation runs can be marked for cancellation.",
      );
    }

    const sequence = (await prisma.automationRunEvent.count({ where: { runId } })) + 1;
    const updatedRun = await prisma.automationRun.update({
      where: { id: runId },
      data: { status: AutomationRunStatus.CANCEL_REQUESTED },
    });
    await prisma.automationRunEvent.create({
      data: {
        runId,
        sequence,
        stream: AutomationRunStream.SYSTEM,
        message: `Cancellation requested by ${session.email}. Process kill is not implemented in the MVP.`,
        redacted: false,
      },
    });

    const requestedBy = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true },
    });
    await this.writeAuditLog(requestedBy?.id ?? null, "AUTOMATION_CANCEL_REQUESTED", runId, {
      previousStatus: run.status,
    });

    return toRunResponse(updatedRun);
  }

  private assertCreateAllowed(session: AuthSession, operation: AutomationOperation) {
    if (session.role === "ADMIN") {
      return;
    }

    if (session.role === "INFRA_OPERATOR") {
      if (safeInfraOperations.has(operation) || executeAutomationOperations.has(operation)) {
        return;
      }
    }

    throw new ForbiddenException(
      `Role '${session.role}' cannot create automation run '${operation}'.`,
    );
  }

  private async validateApprovalIfRequired(
    operation: AutomationOperation,
    clusterId: string,
    hostId: string,
    approvalId?: string,
  ) {
    if (!executeAutomationOperations.has(operation)) {
      return;
    }

    if (!approvalId) {
      throw new ForbiddenException("Execute operations require an approved approvalId.");
    }

    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      select: {
        id: true,
        finalStatus: true,
        policyType: true,
        clusterId: true,
        hostId: true,
        automationOperation: true,
      },
    });

    if (!approval) {
      throw new ForbiddenException(`Approval '${approvalId}' was not found.`);
    }

    if (approval.finalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException("Approval must be APPROVED before execute operations can run.");
    }

    if (approval.policyType !== expectedApprovalPolicy(operation)) {
      throw new ForbiddenException(
        "Approval policy does not match the requested automation operation.",
      );
    }

    if (approval.clusterId !== clusterId) {
      throw new ForbiddenException("Approval cluster does not match the requested cluster.");
    }

    if (approval.hostId !== hostId) {
      throw new ForbiddenException("Approval host does not match the requested host.");
    }

    if (approval.automationOperation !== operation) {
      throw new ForbiddenException("Approval operation does not match the requested operation.");
    }
  }

  private async writeAuditLog(
    actorId: string | null,
    actionType: string,
    resourceId: string,
    diff: Prisma.InputJsonObject,
  ) {
    await prisma.auditLog.create({
      data: {
        actorId,
        actionType,
        resourceType: "AutomationRun",
        resourceId,
        diff,
      },
    });
  }
}
