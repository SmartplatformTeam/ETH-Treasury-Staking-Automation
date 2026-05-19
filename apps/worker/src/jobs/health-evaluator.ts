import { HealthStatus, NodeRole, prisma } from "@eth-staking/db";
import type { Logger } from "@eth-staking/observability";

import {
  BeaconClient,
  type BeaconNodeHealth,
  type BeaconNodeSyncing,
} from "../clients/beacon";

export type HealthEvaluationSummary = {
  candidateNodes: number;
  succeeded: number;
  failed: number;
  hostsUpdated: number;
};

const SYNC_DISTANCE_DEGRADED_THRESHOLD = 32n;

const STATUS_SEVERITY: Record<HealthStatus, number> = {
  HEALTHY: 0,
  DEGRADED: 1,
  CRITICAL: 2,
  UNKNOWN: 3,
};

function deriveBeaconStatus(
  health: BeaconNodeHealth,
  syncing: BeaconNodeSyncing,
): HealthStatus {
  if (!health.reachable) {
    return HealthStatus.UNKNOWN;
  }
  if (health.status === 503) {
    return HealthStatus.CRITICAL;
  }
  if (health.status === 206) {
    return HealthStatus.DEGRADED;
  }
  if (
    syncing.reachable &&
    syncing.syncDistance !== null &&
    syncing.syncDistance > SYNC_DISTANCE_DEGRADED_THRESHOLD
  ) {
    return HealthStatus.DEGRADED;
  }
  if (syncing.reachable && syncing.isOptimistic === true) {
    return HealthStatus.DEGRADED;
  }
  if (syncing.reachable && syncing.isElOffline === true) {
    return HealthStatus.CRITICAL;
  }
  return HealthStatus.HEALTHY;
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.length === 0) return HealthStatus.UNKNOWN;
  return statuses.reduce((worst, current) =>
    STATUS_SEVERITY[current] > STATUS_SEVERITY[worst] ? current : worst,
  );
}

export async function runHealthEvaluation(params: {
  beaconClient: BeaconClient;
  logger: Logger;
}): Promise<HealthEvaluationSummary> {
  const { beaconClient, logger } = params;

  const candidateNodes = await prisma.node.findMany({
    where: { role: NodeRole.CONSENSUS },
    select: { id: true, name: true, hostId: true },
  });

  let succeeded = 0;
  let failed = 0;
  const touchedHostIds = new Set<string>();

  for (const node of candidateNodes) {
    try {
      const [health, syncing] = await Promise.all([
        beaconClient.getNodeHealth(),
        beaconClient.getNodeSyncing(),
      ]);
      const derived = deriveBeaconStatus(health, syncing);

      await prisma.$transaction([
        prisma.node.update({
          where: { id: node.id },
          data: {
            healthStatus: derived,
            ...(health.reachable ? { lastHeartbeatAt: new Date() } : {}),
          },
        }),
        prisma.nodeHealthSnapshot.create({
          data: {
            nodeId: node.id,
            beaconHealth: derived,
            isSyncing: syncing.isSyncing,
            isOptimistic: syncing.isOptimistic,
            isElOffline: syncing.isElOffline,
            headSlot: syncing.headSlot,
            syncDistance: syncing.syncDistance,
          },
        }),
      ]);

      if (node.hostId) {
        touchedHostIds.add(node.hostId);
      }
      succeeded++;
    } catch (err) {
      failed++;
      logger.error("health_evaluation_node_failed", {
        nodeId: node.id,
        nodeName: node.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let hostsUpdated = 0;
  for (const hostId of touchedHostIds) {
    try {
      const nodesOnHost = await prisma.node.findMany({
        where: { hostId },
        select: { healthStatus: true },
      });
      const next = worstStatus(nodesOnHost.map((n) => n.healthStatus));
      await prisma.operatorHost.update({
        where: { id: hostId },
        data: { healthStatus: next },
      });
      hostsUpdated++;
    } catch (err) {
      logger.error("health_evaluation_host_update_failed", {
        hostId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    candidateNodes: candidateNodes.length,
    succeeded,
    failed,
    hostsUpdated,
  };
}
