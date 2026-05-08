import { BadRequestException, Injectable } from "@nestjs/common";

import { ClusterType, HealthStatus, Network, prisma } from "@eth-staking/db";

type CdvnHealthSyncBody = {
  clusterName?: unknown;
  hostName?: unknown;
  hostAddress?: unknown;
  network?: unknown;
  baselineRef?: unknown;
  overlayProfiles?: unknown;
  renderedAt?: unknown;
};

function requireText(body: CdvnHealthSyncBody, key: keyof CdvnHealthSyncBody) {
  const value = body[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`'${key}' is required.`);
  }

  return value.trim();
}

function parseNetwork(value: string): Network {
  const normalizedValue = value.trim().toUpperCase();

  if (normalizedValue === Network.MAINNET) {
    return Network.MAINNET;
  }

  if (normalizedValue === Network.HOLESKY) {
    return Network.HOLESKY;
  }

  if (normalizedValue === Network.HOODI) {
    return Network.HOODI;
  }

  throw new BadRequestException(`Unsupported network '${value}'.`);
}

@Injectable()
export class CdvnHealthSyncService {
  async sync(rawBody: unknown) {
    if (!rawBody || typeof rawBody !== "object") {
      throw new BadRequestException("Health sync payload must be an object.");
    }

    const body = rawBody as CdvnHealthSyncBody;
    const clusterName = requireText(body, "clusterName");
    const hostName = requireText(body, "hostName");
    const hostAddress = requireText(body, "hostAddress");
    const network = parseNetwork(requireText(body, "network"));
    const baselineVersion = requireText(body, "baselineRef");
    const overlayVersion = requireText(body, "overlayProfiles");
    const renderedAt = requireText(body, "renderedAt");

    const cluster = await prisma.cluster.upsert({
      where: { name: clusterName },
      update: {
        network,
        baselineVersion,
        overlayVersion,
      },
      create: {
        name: clusterName,
        type: ClusterType.OBOL_DVT,
        network,
        baselineVersion,
        overlayVersion,
        threshold: 3,
        operatorCount: 4,
        relayMode: "obol",
        signerMode: "web3signer",
      },
    });
    const host = await prisma.operatorHost.upsert({
      where: { name: hostName },
      update: {
        address: hostAddress,
        baselineVersion,
        overlayVersion,
        healthStatus: HealthStatus.HEALTHY,
        clusterId: cluster.id,
      },
      create: {
        name: hostName,
        address: hostAddress,
        region: "unknown",
        profile: "cdvn",
        baselineVersion,
        overlayVersion,
        healthStatus: HealthStatus.HEALTHY,
        clusterId: cluster.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actionType: "CDVN_HEALTH_SYNC",
        resourceType: "OperatorHost",
        resourceId: host.id,
        diff: {
          clusterName,
          hostName,
          network,
          baselineVersion,
          overlayVersion,
          renderedAt,
        },
      },
    });

    return {
      ok: true,
      clusterId: cluster.id,
      hostId: host.id,
      syncedAt: new Date(),
    };
  }
}
