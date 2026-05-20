import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";

import {
  ApprovalPolicyType,
  ApprovalStatus,
  AutomationOperation,
  DepositExecutionStatus,
  DepositValidationStatus,
  Network,
  type Prisma,
  SafeProposalStatus,
  prisma
} from "@eth-staking/db";
import {
  buildSafeTxPayload,
  encodeDepositCalldata,
  ETH_32_WEI,
  getNetworkConfig,
  type AuthSession
} from "@eth-staking/domain";

import type { CreateApprovalDto } from "./dto/create-approval.dto";
import type {
  CreateDepositRequestDto,
  ExportSafePayloadDto,
  MarkSubmittedDto
} from "./dto/deposit-request.dto";

function isDecidableStatus(status: ApprovalStatus) {
  return status === ApprovalStatus.REQUESTED || status === ApprovalStatus.IN_REVIEW;
}

type ApprovalRecord = {
  id: string;
  resourceType: string;
  resourceId: string;
  policyType: ApprovalPolicyType;
  currentStep: number;
  finalStatus: ApprovalStatus;
  clusterId: string | null;
  hostId: string | null;
  automationOperation: AutomationOperation | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy: { id: string; email: string; name: string; role: string };
  approvedBy: { id: string; email: string; name: string; role: string } | null;
  rejectedBy: { id: string; email: string; name: string; role: string } | null;
  depositRequest: {
    id: string;
    requestNumber: string;
    approvalStatus: ApprovalStatus;
    executionStatus: DepositExecutionStatus;
  } | null;
};

function toApprovalResponse(approval: ApprovalRecord) {
  return {
    id: approval.id,
    resourceType: approval.resourceType,
    resourceId: approval.resourceId,
    policyType: approval.policyType,
    currentStep: approval.currentStep,
    finalStatus: approval.finalStatus,
    clusterId: approval.clusterId,
    hostId: approval.hostId,
    automationOperation: approval.automationOperation,
    requestedBy: approval.requestedBy,
    approvedBy: approval.approvedBy,
    rejectedBy: approval.rejectedBy,
    depositRequest: approval.depositRequest,
    createdAt: approval.createdAt,
    updatedAt: approval.updatedAt
  };
}

const approvalSelect = {
  id: true,
  resourceType: true,
  resourceId: true,
  policyType: true,
  currentStep: true,
  finalStatus: true,
  clusterId: true,
  hostId: true,
  automationOperation: true,
  createdAt: true,
  updatedAt: true,
  requestedBy: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  },
  approvedBy: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  },
  rejectedBy: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  },
  depositRequest: {
    select: {
      id: true,
      requestNumber: true,
      approvalStatus: true,
      executionStatus: true
    }
  }
} as const;

type ListApprovalsOptions = {
  status?: ApprovalStatus;
  policyType?: ApprovalPolicyType;
  clusterId?: string;
  hostId?: string;
  automationOperation?: AutomationOperation;
  limit: number;
};

type ListDepositsOptions = {
  approvalStatus?: ApprovalStatus;
  executionStatus?: DepositExecutionStatus;
  limit: number;
};

type ListAuditLogsOptions = {
  actionType?: string;
  resourceType?: string;
  limit: number;
};

@Injectable()
export class WorkflowsService {
  async listApprovals(options: ListApprovalsOptions) {
    const where: Prisma.ApprovalWhereInput = {
      ...(options.status ? { finalStatus: options.status } : {}),
      ...(options.policyType ? { policyType: options.policyType } : {}),
      ...(options.clusterId ? { clusterId: options.clusterId } : {}),
      ...(options.hostId ? { hostId: options.hostId } : {}),
      ...(options.automationOperation
        ? { automationOperation: options.automationOperation }
        : {})
    };
    const [total, approvals] = await Promise.all([
      prisma.approval.count({ where }),
      prisma.approval.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit,
        select: approvalSelect
      })
    ]);

    return {
      total,
      items: approvals.map((approval) => toApprovalResponse(approval))
    };
  }

  async getApproval(approvalId: string) {
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      select: approvalSelect
    });

    if (!approval) {
      throw new NotFoundException(`Approval '${approvalId}' was not found.`);
    }

    return toApprovalResponse(approval);
  }

  async createApproval(dto: CreateApprovalDto, session: AuthSession) {
    const actor = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true }
    });

    if (!actor) {
      throw new UnauthorizedException("Authenticated user was not found in the directory.");
    }

    const createData = await this.resolveCreateApprovalData(dto, actor.id);

    const created = await prisma.$transaction(async (tx) => {
      const newApproval = await tx.approval.create({
        data: createData,
        select: approvalSelect
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: "APPROVAL_REQUESTED",
          resourceType: "Approval",
          resourceId: newApproval.id,
          diff: {
            policyType: newApproval.policyType,
            resourceType: newApproval.resourceType,
            resourceId: newApproval.resourceId,
            clusterId: createData.clusterId ?? null,
            hostId: createData.hostId ?? null,
            automationOperation: createData.automationOperation ?? null,
            depositRequestId: createData.depositRequestId ?? null
          }
        }
      });

      return newApproval;
    });

    return toApprovalResponse(created);
  }

  private async resolveCreateApprovalData(dto: CreateApprovalDto, actorId: string) {
    if (dto.policyType === ApprovalPolicyType.ROLLOUT) {
      const [cluster, host] = await Promise.all([
        prisma.cluster.findUnique({ where: { id: dto.clusterId }, select: { id: true, name: true } }),
        prisma.operatorHost.findUnique({
          where: { id: dto.hostId },
          select: { id: true, name: true, clusterId: true }
        })
      ]);

      if (!cluster) {
        throw new NotFoundException(`Cluster '${dto.clusterId}' was not found.`);
      }

      if (!host) {
        throw new NotFoundException(`Operator host '${dto.hostId}' was not found.`);
      }

      if (host.clusterId !== cluster.id) {
        throw new BadRequestException(
          "Operator host does not belong to the specified cluster."
        );
      }

      return {
        resourceType: "AutomationRollout",
        resourceId: `${cluster.name}:${host.name}:${dto.automationOperation}`,
        policyType: ApprovalPolicyType.ROLLOUT,
        currentStep: 1,
        finalStatus: ApprovalStatus.REQUESTED,
        requestedById: actorId,
        clusterId: cluster.id,
        hostId: host.id,
        automationOperation: dto.automationOperation
      } satisfies Prisma.ApprovalUncheckedCreateInput;
    }

    const depositRequest = await prisma.depositRequest.findUnique({
      where: { id: dto.depositRequestId },
      select: { id: true, requestNumber: true }
    });

    if (!depositRequest) {
      throw new NotFoundException(
        `Deposit request '${dto.depositRequestId}' was not found.`
      );
    }

    return {
      resourceType: "DepositRequest",
      resourceId: depositRequest.id,
      policyType: ApprovalPolicyType.DEPOSIT_REQUEST,
      currentStep: 1,
      finalStatus: ApprovalStatus.REQUESTED,
      requestedById: actorId,
      depositRequestId: depositRequest.id
    } satisfies Prisma.ApprovalUncheckedCreateInput;
  }

  async approveApproval(approvalId: string, session: AuthSession) {
    const { actor, approval } = await this.loadActorAndApprovalForDecision(approvalId, session);

    return this.transitionApproval({
      approvalId,
      actor,
      previousStatus: approval.finalStatus,
      policyType: approval.policyType,
      automationOperation: approval.automationOperation,
      nextStatus: ApprovalStatus.APPROVED,
      actionType: "APPROVAL_APPROVED",
      data: {
        finalStatus: ApprovalStatus.APPROVED,
        approvedById: actor.id,
        rejectedById: null
      },
      diffExtras: {}
    });
  }

  async rejectApproval(approvalId: string, session: AuthSession, reason: string) {
    const { actor, approval } = await this.loadActorAndApprovalForDecision(approvalId, session);

    return this.transitionApproval({
      approvalId,
      actor,
      previousStatus: approval.finalStatus,
      policyType: approval.policyType,
      automationOperation: approval.automationOperation,
      nextStatus: ApprovalStatus.REJECTED,
      actionType: "APPROVAL_REJECTED",
      data: {
        finalStatus: ApprovalStatus.REJECTED,
        rejectedById: actor.id,
        approvedById: null
      },
      diffExtras: { reason }
    });
  }

  private async loadActorAndApprovalForDecision(approvalId: string, session: AuthSession) {
    const actor = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true }
    });

    if (!actor) {
      throw new UnauthorizedException("Authenticated user was not found in the directory.");
    }

    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      select: {
        id: true,
        requestedById: true,
        finalStatus: true,
        policyType: true,
        automationOperation: true
      }
    });

    if (!approval) {
      throw new NotFoundException(`Approval '${approvalId}' was not found.`);
    }

    if (approval.requestedById === actor.id) {
      throw new ForbiddenException(
        "Requester cannot decide their own approval (4-eyes principle)."
      );
    }

    if (!isDecidableStatus(approval.finalStatus)) {
      throw new ConflictException(
        `Approval is already in terminal state '${approval.finalStatus}' and cannot be decided again.`
      );
    }

    return { actor, approval };
  }

  private async transitionApproval(params: {
    approvalId: string;
    actor: { id: string };
    previousStatus: ApprovalStatus;
    policyType: ApprovalPolicyType;
    automationOperation: string | null;
    nextStatus: ApprovalStatus;
    actionType: "APPROVAL_APPROVED" | "APPROVAL_REJECTED";
    data: Prisma.ApprovalUncheckedUpdateManyInput;
    diffExtras: Prisma.InputJsonObject;
  }) {
    const decided = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.approval.updateMany({
        where: {
          id: params.approvalId,
          finalStatus: { in: [ApprovalStatus.REQUESTED, ApprovalStatus.IN_REVIEW] }
        },
        data: params.data
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          "Approval was decided by someone else before this request completed."
        );
      }

      await tx.auditLog.create({
        data: {
          actorId: params.actor.id,
          actionType: params.actionType,
          resourceType: "Approval",
          resourceId: params.approvalId,
          diff: {
            previousStatus: params.previousStatus,
            nextStatus: params.nextStatus,
            policyType: params.policyType,
            automationOperation: params.automationOperation,
            ...params.diffExtras
          }
        }
      });

      return tx.approval.findUniqueOrThrow({
        where: { id: params.approvalId },
        select: approvalSelect
      });
    });

    return toApprovalResponse(decided);
  }

  async listDeposits(options: ListDepositsOptions) {
    const where = {
      ...(options.approvalStatus ? { approvalStatus: options.approvalStatus } : {}),
      ...(options.executionStatus ? { executionStatus: options.executionStatus } : {})
    };
    const [total, deposits] = await Promise.all([
      prisma.depositRequest.count({ where }),
      prisma.depositRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit,
        select: {
          id: true,
          requestNumber: true,
          network: true,
          ownerEntity: true,
          validatorCount: true,
          validationStatus: true,
          approvalStatus: true,
          executionStatus: true,
          exportedPayloadObjectKey: true,
          depositDataObjectKey: true,
          createdAt: true,
          updatedAt: true,
          requestedBy: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          cluster: {
            select: {
              id: true,
              name: true
            }
          },
          treasuryAccount: {
            select: {
              id: true,
              label: true,
              safeAddress: true,
              chainId: true
            }
          },
          safeProposal: {
            select: {
              id: true,
              proposalNumber: true,
              status: true
            }
          },
          approvals: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              policyType: true,
              finalStatus: true
            }
          }
        }
      })
    ]);

    return {
      total,
      items: deposits.map((deposit) => ({
        id: deposit.id,
        requestNumber: deposit.requestNumber,
        network: deposit.network,
        ownerEntity: deposit.ownerEntity,
        validatorCount: deposit.validatorCount,
        validationStatus: deposit.validationStatus,
        approvalStatus: deposit.approvalStatus,
        executionStatus: deposit.executionStatus,
        exportedPayloadObjectKey: deposit.exportedPayloadObjectKey,
        depositDataObjectKey: deposit.depositDataObjectKey,
        requestedBy: deposit.requestedBy,
        cluster: deposit.cluster,
        treasuryAccount: deposit.treasuryAccount,
        safeProposal: deposit.safeProposal,
        latestApproval: deposit.approvals[0] ?? null,
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt
      }))
    };
  }

  async listAuditLogs(options: ListAuditLogsOptions) {
    const where = {
      ...(options.actionType ? { actionType: options.actionType } : {}),
      ...(options.resourceType ? { resourceType: options.resourceType } : {})
    };
    const [total, auditLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit,
        select: {
          id: true,
          actionType: true,
          resourceType: true,
          resourceId: true,
          diff: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      })
    ]);

    return {
      total,
      items: auditLogs.map((auditLog) => ({
        id: auditLog.id,
        actionType: auditLog.actionType,
        resourceType: auditLog.resourceType,
        resourceId: auditLog.resourceId,
        diff: auditLog.diff,
        actor: auditLog.actor,
        createdAt: auditLog.createdAt
      }))
    };
  }

  async getDepositRequest(id: string) {
    const deposit = await prisma.depositRequest.findUnique({
      where: { id },
      select: depositRequestSelect
    });
    if (!deposit) {
      throw new NotFoundException(`Deposit request '${id}' was not found.`);
    }
    return toDepositRequestResponse(deposit);
  }

  async createDepositRequest(dto: CreateDepositRequestDto, session: AuthSession) {
    const actor = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true }
    });
    if (!actor) {
      throw new UnauthorizedException("Authenticated user was not found in the directory.");
    }

    const [cluster, treasury] = await Promise.all([
      prisma.cluster.findUnique({
        where: { id: dto.clusterId },
        select: { id: true, name: true, network: true }
      }),
      prisma.treasuryAccount.findUnique({
        where: { id: dto.treasuryAccountId },
        select: { id: true, label: true, safeAddress: true, chainId: true, network: true }
      })
    ]);
    if (!cluster) {
      throw new NotFoundException(`Cluster '${dto.clusterId}' was not found.`);
    }
    if (!treasury) {
      throw new NotFoundException(`Treasury account '${dto.treasuryAccountId}' was not found.`);
    }
    if (cluster.network !== dto.network) {
      throw new BadRequestException(
        `Network mismatch: cluster '${cluster.name}' is on ${cluster.network} but request is for ${dto.network}.`
      );
    }
    if (treasury.network !== dto.network) {
      throw new BadRequestException(
        `Network mismatch: treasury '${treasury.label}' is on ${treasury.network} but request is for ${dto.network}.`
      );
    }

    const networkCfg = getNetworkConfig(dto.network as never);
    if (treasury.chainId !== networkCfg.chainId) {
      throw new BadRequestException(
        `Treasury chainId ${treasury.chainId} does not match expected chainId ${networkCfg.chainId} for ${dto.network}.`
      );
    }

    const requestNumber = `deposit-request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const created = await prisma.$transaction(async (tx) => {
      const deposit = await tx.depositRequest.create({
        data: {
          requestNumber,
          network: dto.network,
          ownerEntity: dto.ownerEntity,
          validatorCount: dto.validatorCount,
          depositDataObjectKey: dto.depositDataObjectKey ?? `inline:${requestNumber}`,
          validationStatus: DepositValidationStatus.VALID,
          approvalStatus: ApprovalStatus.REQUESTED,
          executionStatus: DepositExecutionStatus.DRAFT,
          requestedById: actor.id,
          clusterId: cluster.id,
          treasuryAccountId: treasury.id
        }
      });

      const approval = await tx.approval.create({
        data: {
          resourceType: "DepositRequest",
          resourceId: deposit.id,
          policyType: ApprovalPolicyType.DEPOSIT_REQUEST,
          currentStep: 1,
          finalStatus: ApprovalStatus.REQUESTED,
          requestedById: actor.id,
          depositRequestId: deposit.id
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: "DEPOSIT_REQUEST_CREATED",
          resourceType: "DepositRequest",
          resourceId: deposit.id,
          diff: {
            requestNumber: deposit.requestNumber,
            network: deposit.network,
            ownerEntity: deposit.ownerEntity,
            validatorCount: deposit.validatorCount,
            clusterId: deposit.clusterId,
            treasuryAccountId: deposit.treasuryAccountId,
            pubkey: dto.pubkey,
            withdrawalCredentials: dto.withdrawalCredentials,
            depositDataRoot: dto.depositDataRoot,
            approvalId: approval.id
          }
        }
      });

      return tx.depositRequest.findUniqueOrThrow({
        where: { id: deposit.id },
        select: depositRequestSelect
      });
    });

    return toDepositRequestResponse(created);
  }

  async exportSafePayload(
    depositRequestId: string,
    dto: ExportSafePayloadDto,
    session: AuthSession
  ) {
    const actor = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true }
    });
    if (!actor) {
      throw new UnauthorizedException("Authenticated user was not found in the directory.");
    }

    const deposit = await prisma.depositRequest.findUnique({
      where: { id: depositRequestId },
      select: {
        id: true,
        requestNumber: true,
        network: true,
        executionStatus: true,
        approvalStatus: true,
        treasuryAccountId: true,
        treasuryAccount: {
          select: { id: true, label: true, safeAddress: true, chainId: true, network: true }
        },
        safeProposalId: true,
        approvals: {
          orderBy: { createdAt: "desc" },
          where: { policyType: ApprovalPolicyType.DEPOSIT_REQUEST },
          take: 1,
          select: { id: true, finalStatus: true }
        }
      }
    });
    if (!deposit) {
      throw new NotFoundException(`Deposit request '${depositRequestId}' was not found.`);
    }
    if (deposit.executionStatus !== DepositExecutionStatus.DRAFT) {
      throw new ConflictException(
        `Deposit request is in executionStatus '${deposit.executionStatus}' and cannot be exported.`
      );
    }
    const linkedApproval = deposit.approvals[0];
    if (!linkedApproval || linkedApproval.finalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        "Linked DEPOSIT_REQUEST approval must be APPROVED before exporting Safe payload."
      );
    }
    if (deposit.safeProposalId) {
      throw new ConflictException(
        "Deposit already has a SafeProposal linked. Cancel and recreate to redo."
      );
    }
    if (!deposit.treasuryAccount || !deposit.treasuryAccountId) {
      throw new ConflictException(
        "Deposit request has no linked treasury account. Recreate the request."
      );
    }
    const treasuryAccountId = deposit.treasuryAccountId;
    const treasuryAccount = deposit.treasuryAccount;

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        actionType: "DEPOSIT_REQUEST_CREATED",
        resourceType: "DepositRequest",
        resourceId: deposit.id
      },
      select: { diff: true }
    });
    if (!auditEntry || typeof auditEntry.diff !== "object" || auditEntry.diff === null) {
      throw new ConflictException(
        "Original deposit data (pubkey/wc/signature/root) was not found in audit log."
      );
    }
    const diff = auditEntry.diff as Record<string, unknown>;
    const pubkey = diff.pubkey;
    const withdrawalCredentials = diff.withdrawalCredentials;
    const depositDataRoot = diff.depositDataRoot;
    const signature = (diff as { signature?: unknown }).signature ?? null;

    if (
      typeof pubkey !== "string" ||
      typeof withdrawalCredentials !== "string" ||
      typeof depositDataRoot !== "string"
    ) {
      throw new ConflictException(
        "Deposit data audit entry is missing required fields. Recreate the deposit request."
      );
    }
    if (typeof signature !== "string") {
      throw new ConflictException(
        "Deposit data audit entry is missing the signature field. Recreate the deposit request."
      );
    }

    const networkCfg = getNetworkConfig(deposit.network as never);
    const calldata = encodeDepositCalldata({
      pubkey,
      withdrawalCredentials,
      signature,
      depositDataRoot
    });

    const safeAddress = treasuryAccount.safeAddress;
    const payload = buildSafeTxPayload({
      chainId: networkCfg.chainId,
      safeAddress,
      to: networkCfg.depositContract,
      value: ETH_32_WEI,
      data: calldata,
      operation: 0,
      nonce: dto.nonce
    });

    const proposalNumber = `safe-${deposit.network.toLowerCase()}-${Date.now().toString(36)}`;

    const updated = await prisma.$transaction(async (tx) => {
      const proposal = await tx.safeProposal.create({
        data: {
          proposalNumber,
          treasuryAccountId,
          status: SafeProposalStatus.EXPORTED,
          description: `Deposit ${deposit.requestNumber} → ${networkCfg.depositContract}`,
          exportedById: actor.id,
          chainId: networkCfg.chainId,
          to: networkCfg.depositContract,
          value: ETH_32_WEI,
          data: calldata,
          operation: 0,
          nonce: dto.nonce,
          payloadJson: payload as unknown as Prisma.InputJsonValue
        }
      });

      await tx.depositRequest.update({
        where: { id: deposit.id },
        data: {
          safeProposalId: proposal.id,
          executionStatus: DepositExecutionStatus.EXPORTED,
          exportedPayloadObjectKey: `inline:${proposal.proposalNumber}`
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: "SAFE_PAYLOAD_EXPORTED",
          resourceType: "DepositRequest",
          resourceId: deposit.id,
          diff: {
            safeProposalId: proposal.id,
            proposalNumber: proposal.proposalNumber,
            chainId: networkCfg.chainId,
            to: networkCfg.depositContract,
            value: ETH_32_WEI,
            nonce: dto.nonce
          }
        }
      });

      return tx.depositRequest.findUniqueOrThrow({
        where: { id: deposit.id },
        select: depositRequestSelect
      });
    });

    return toDepositRequestResponse(updated);
  }

  async markDepositSubmitted(
    depositRequestId: string,
    dto: MarkSubmittedDto,
    session: AuthSession
  ) {
    const actor = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true }
    });
    if (!actor) {
      throw new UnauthorizedException("Authenticated user was not found in the directory.");
    }

    const deposit = await prisma.depositRequest.findUnique({
      where: { id: depositRequestId },
      select: {
        id: true,
        executionStatus: true,
        safeProposalId: true,
        safeProposal: { select: { id: true, status: true } }
      }
    });
    if (!deposit) {
      throw new NotFoundException(`Deposit request '${depositRequestId}' was not found.`);
    }
    if (deposit.executionStatus !== DepositExecutionStatus.EXPORTED) {
      throw new ConflictException(
        `Deposit request is in executionStatus '${deposit.executionStatus}' and cannot be marked submitted.`
      );
    }
    if (!deposit.safeProposal) {
      throw new ConflictException("Deposit request has no linked SafeProposal.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.safeProposal.update({
        where: { id: deposit.safeProposal!.id },
        data: { status: SafeProposalStatus.QUEUED, safeTxHash: dto.safeTxHash }
      });
      await tx.depositRequest.update({
        where: { id: deposit.id },
        data: { executionStatus: DepositExecutionStatus.SUBMITTED }
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: "SAFE_PROPOSAL_SUBMITTED",
          resourceType: "DepositRequest",
          resourceId: deposit.id,
          diff: {
            safeProposalId: deposit.safeProposal!.id,
            safeTxHash: dto.safeTxHash
          }
        }
      });
      return tx.depositRequest.findUniqueOrThrow({
        where: { id: deposit.id },
        select: depositRequestSelect
      });
    });

    return toDepositRequestResponse(updated);
  }

  async cancelDepositRequest(depositRequestId: string, session: AuthSession) {
    const actor = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true }
    });
    if (!actor) {
      throw new UnauthorizedException("Authenticated user was not found in the directory.");
    }

    const deposit = await prisma.depositRequest.findUnique({
      where: { id: depositRequestId },
      select: { id: true, executionStatus: true, safeProposalId: true }
    });
    if (!deposit) {
      throw new NotFoundException(`Deposit request '${depositRequestId}' was not found.`);
    }
    if (
      deposit.executionStatus !== DepositExecutionStatus.DRAFT &&
      deposit.executionStatus !== DepositExecutionStatus.EXPORTED
    ) {
      throw new ConflictException(
        `Deposit request is in executionStatus '${deposit.executionStatus}' and cannot be cancelled.`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.depositRequest.update({
        where: { id: deposit.id },
        data: { executionStatus: DepositExecutionStatus.CANCELLED }
      });
      if (deposit.safeProposalId) {
        await tx.safeProposal.update({
          where: { id: deposit.safeProposalId },
          data: { status: SafeProposalStatus.CANCELLED }
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: "DEPOSIT_REQUEST_CANCELLED",
          resourceType: "DepositRequest",
          resourceId: deposit.id,
          diff: { previousStatus: deposit.executionStatus }
        }
      });
      return tx.depositRequest.findUniqueOrThrow({
        where: { id: deposit.id },
        select: depositRequestSelect
      });
    });

    return toDepositRequestResponse(updated);
  }
}

const depositRequestSelect = {
  id: true,
  requestNumber: true,
  network: true,
  ownerEntity: true,
  validatorCount: true,
  validationStatus: true,
  approvalStatus: true,
  executionStatus: true,
  exportedPayloadObjectKey: true,
  depositDataObjectKey: true,
  createdAt: true,
  updatedAt: true,
  requestedBy: { select: { id: true, email: true, name: true } },
  cluster: { select: { id: true, name: true } },
  treasuryAccount: {
    select: { id: true, label: true, safeAddress: true, chainId: true, network: true }
  },
  safeProposal: {
    select: {
      id: true,
      proposalNumber: true,
      status: true,
      chainId: true,
      to: true,
      value: true,
      data: true,
      operation: true,
      nonce: true,
      safeTxHash: true,
      payloadJson: true,
      createdAt: true,
      updatedAt: true
    }
  },
  approvals: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { id: true, policyType: true, finalStatus: true }
  }
} as const;

type DepositRequestRecord = Prisma.DepositRequestGetPayload<{ select: typeof depositRequestSelect }>;

function toDepositRequestResponse(deposit: DepositRequestRecord) {
  return {
    id: deposit.id,
    requestNumber: deposit.requestNumber,
    network: deposit.network,
    ownerEntity: deposit.ownerEntity,
    validatorCount: deposit.validatorCount,
    validationStatus: deposit.validationStatus,
    approvalStatus: deposit.approvalStatus,
    executionStatus: deposit.executionStatus,
    exportedPayloadObjectKey: deposit.exportedPayloadObjectKey,
    depositDataObjectKey: deposit.depositDataObjectKey,
    requestedBy: deposit.requestedBy,
    cluster: deposit.cluster,
    treasuryAccount: deposit.treasuryAccount,
    safeProposal: deposit.safeProposal,
    latestApproval: deposit.approvals[0] ?? null,
    createdAt: deposit.createdAt,
    updatedAt: deposit.updatedAt
  };
}
