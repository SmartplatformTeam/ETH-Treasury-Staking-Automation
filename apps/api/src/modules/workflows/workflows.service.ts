import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";

import {
  ApprovalPolicyType,
  ApprovalStatus,
  DepositExecutionStatus,
  type Prisma,
  prisma
} from "@eth-staking/db";
import type { AuthSession } from "@eth-staking/domain";

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
    const where = {
      ...(options.status ? { finalStatus: options.status } : {}),
      ...(options.policyType ? { policyType: options.policyType } : {})
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
}
