import { Injectable } from "@nestjs/common";

import { HealthStatus, prisma } from "@eth-staking/db";

type ListValidatorOptions = {
  includeArchived: boolean;
};

@Injectable()
export class InventoryService {
  async listValidators(options: ListValidatorOptions) {
    const validators = await prisma.validator.findMany({
      ...(options.includeArchived ? {} : { where: { archivedAt: null } }),
      orderBy: { createdAt: "desc" },
      include: {
        cluster: {
          select: {
            id: true,
            name: true
          }
        },
        signer: {
          select: {
            id: true,
            name: true,
            provider: true,
            healthStatus: true
          }
        },
        activeNode: {
          select: {
            id: true,
            name: true,
            healthStatus: true
          }
        }
      }
    });

    return {
      total: validators.length,
      items: validators.map((validator) => ({
        id: validator.id,
        publicKey: validator.publicKey,
        validatorIndex: validator.validatorIndex,
        network: validator.network,
        status: validator.status,
        strategyType: validator.strategyType,
        ownerEntity: validator.ownerEntity,
        feeRecipient: validator.feeRecipient,
        withdrawalTarget: validator.withdrawalTarget,
        signerType: validator.signerType,
        clusterId: validator.cluster?.id ?? null,
        clusterName: validator.cluster?.name ?? null,
        signer: validator.signer,
        activeNode: validator.activeNode,
        createdAt: validator.createdAt,
        archivedAt: validator.archivedAt
      }))
    };
  }

  async listNodes() {
    const nodes = await prisma.node.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        provider: true,
        region: true,
        hostName: true,
        clientType: true,
        clientVersion: true,
        endpointMetadata: true,
        healthStatus: true,
        lastHeartbeatAt: true,
        createdAt: true,
        updatedAt: true,
        cluster: {
          select: {
            id: true,
            name: true
          }
        },
        host: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    return {
      total: nodes.length,
      items: nodes.map((node) => ({
        id: node.id,
        name: node.name,
        role: node.role,
        provider: node.provider,
        region: node.region,
        hostName: node.hostName,
        clientType: node.clientType,
        clientVersion: node.clientVersion,
        endpointMetadata: node.endpointMetadata,
        healthStatus: node.healthStatus,
        lastHeartbeatAt: node.lastHeartbeatAt,
        clusterId: node.cluster?.id ?? null,
        clusterName: node.cluster?.name ?? null,
        host: node.host,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt
      }))
    };
  }

  async listClusters() {
    const clusters = await prisma.cluster.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        network: true,
        baselineVersion: true,
        overlayVersion: true,
        obolClusterId: true,
        threshold: true,
        operatorCount: true,
        relayMode: true,
        signerMode: true,
        charonEnrs: true,
        createdAt: true,
        updatedAt: true,
        hosts: {
          select: {
            healthStatus: true
          }
        },
        nodes: {
          select: {
            healthStatus: true
          }
        },
        signers: {
          select: {
            healthStatus: true
          }
        },
        _count: {
          select: {
            hosts: true,
            nodes: true,
            signers: true,
            validators: true
          }
        }
      }
    });

    return {
      total: clusters.length,
      items: clusters.map((cluster) => {
        const runtimeStatus = this.resolveClusterRuntimeStatus([
          ...cluster.hosts.map((host) => host.healthStatus),
          ...cluster.nodes.map((node) => node.healthStatus),
          ...cluster.signers.map((signer) => signer.healthStatus)
        ]);

        return {
          id: cluster.id,
          name: cluster.name,
          type: cluster.type,
          network: cluster.network,
          baselineVersion: cluster.baselineVersion,
          overlayVersion: cluster.overlayVersion,
          obolClusterId: cluster.obolClusterId,
          threshold: cluster.threshold,
          operatorCount: cluster.operatorCount,
          relayMode: cluster.relayMode,
          signerMode: cluster.signerMode,
          charonEnrs: cluster.charonEnrs,
          runtimeStatus,
          hostCount: cluster._count.hosts,
          nodeCount: cluster._count.nodes,
          signerCount: cluster._count.signers,
          validatorCount: cluster._count.validators,
          createdAt: cluster.createdAt,
          updatedAt: cluster.updatedAt
        };
      })
    };
  }

  async listSigners() {
    const signers = await prisma.signer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        provider: true,
        web3signerUrl: true,
        kmsKeyRef: true,
        keyAlias: true,
        healthStatus: true,
        createdAt: true,
        updatedAt: true,
        cluster: {
          select: {
            id: true,
            name: true
          }
        },
        host: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        _count: {
          select: {
            validators: true
          }
        }
      }
    });

    return {
      total: signers.length,
      items: signers.map((signer) => ({
        id: signer.id,
        name: signer.name,
        provider: signer.provider,
        web3signerUrl: signer.web3signerUrl,
        kmsKeyRef: signer.kmsKeyRef,
        keyAlias: signer.keyAlias,
        healthStatus: signer.healthStatus,
        clusterId: signer.cluster?.id ?? null,
        clusterName: signer.cluster?.name ?? null,
        host: signer.host,
        validatorCount: signer._count.validators,
        createdAt: signer.createdAt,
        updatedAt: signer.updatedAt
      }))
    };
  }

  private resolveClusterRuntimeStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.includes(HealthStatus.CRITICAL)) {
      return HealthStatus.CRITICAL;
    }

    if (statuses.includes(HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    if (statuses.includes(HealthStatus.HEALTHY)) {
      return HealthStatus.HEALTHY;
    }

    return HealthStatus.UNKNOWN;
  }
}
