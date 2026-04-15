import { Injectable } from "@nestjs/common";

import {
  ApprovalPolicyType,
  ApprovalStatus,
  DepositExecutionStatus,
  prisma
} from "@eth-staking/db";

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
        select: {
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
        }
      })
    ]);

    return {
      total,
      items: approvals.map((approval) => ({
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
      }))
    };
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
