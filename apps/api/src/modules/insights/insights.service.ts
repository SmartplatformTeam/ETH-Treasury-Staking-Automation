import { Injectable } from "@nestjs/common";

import { HealthStatus, prisma, type StrategyType } from "@eth-staking/db";

type ListAlertsOptions = {
  severity?: "CRITICAL" | "WARNING";
  limit: number;
};

type ListRewardsOptions = {
  limit: number;
};

type AlertItem = {
  id: string;
  source: string;
  severity: "CRITICAL" | "WARNING";
  summary: string;
  acknowledged: boolean;
  detectedAt: Date;
};

type RewardAccumulator = {
  period: string;
  strategy: StrategyType;
  consensusReward: number;
  executionReward: number;
  netReward: number;
  validatorCount: number;
};

@Injectable()
export class InsightsService {
  async listAlerts(options: ListAlertsOptions) {
    const unhealthyStatusFilter = {
      in: [HealthStatus.CRITICAL, HealthStatus.DEGRADED, HealthStatus.UNKNOWN]
    };
    const [nodes, signers, hosts] = await Promise.all([
      prisma.node.findMany({
        where: { healthStatus: unhealthyStatusFilter },
        select: {
          id: true,
          name: true,
          healthStatus: true,
          lastHeartbeatAt: true,
          updatedAt: true
        }
      }),
      prisma.signer.findMany({
        where: { healthStatus: unhealthyStatusFilter },
        select: {
          id: true,
          name: true,
          healthStatus: true,
          updatedAt: true
        }
      }),
      prisma.operatorHost.findMany({
        where: { healthStatus: unhealthyStatusFilter },
        select: {
          id: true,
          name: true,
          address: true,
          healthStatus: true,
          updatedAt: true
        }
      })
    ]);

    const alerts: AlertItem[] = [
      ...nodes.map((node) => ({
        id: `node:${node.id}`,
        source: node.name,
        severity: this.mapSeverity(node.healthStatus),
        summary:
          node.healthStatus === HealthStatus.UNKNOWN
            ? "node health unknown; heartbeat verification required"
            : `node health ${node.healthStatus.toLowerCase()}`,
        acknowledged: false,
        detectedAt: node.lastHeartbeatAt ?? node.updatedAt
      })),
      ...signers.map((signer) => ({
        id: `signer:${signer.id}`,
        source: signer.name,
        severity: this.mapSeverity(signer.healthStatus),
        summary:
          signer.healthStatus === HealthStatus.UNKNOWN
            ? "signer health unknown; connectivity check required"
            : `signer health ${signer.healthStatus.toLowerCase()}`,
        acknowledged: false,
        detectedAt: signer.updatedAt
      })),
      ...hosts.map((host) => ({
        id: `host:${host.id}`,
        source: `${host.name} (${host.address})`,
        severity: this.mapSeverity(host.healthStatus),
        summary:
          host.healthStatus === HealthStatus.UNKNOWN
            ? "host health unknown; baseline drift check required"
            : `host health ${host.healthStatus.toLowerCase()}`,
        acknowledged: false,
        detectedAt: host.updatedAt
      }))
    ];

    const filteredAlerts = options.severity
      ? alerts.filter((alert) => alert.severity === options.severity)
      : alerts;
    const sortedAlerts = filteredAlerts.sort((left, right) => {
      const severityScore = this.getSeverityRank(right.severity) - this.getSeverityRank(left.severity);

      if (severityScore !== 0) {
        return severityScore;
      }

      return right.detectedAt.getTime() - left.detectedAt.getTime();
    });

    return {
      total: sortedAlerts.length,
      items: sortedAlerts.slice(0, options.limit).map((alert) => ({
        id: alert.id,
        source: alert.source,
        severity: alert.severity,
        summary: alert.summary,
        acknowledged: alert.acknowledged,
        detectedAt: alert.detectedAt
      }))
    };
  }

  async listRewards(options: ListRewardsOptions) {
    const ledgers = await prisma.rewardLedger.findMany({
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      include: {
        validator: {
          select: {
            strategyType: true
          }
        }
      }
    });
    const groupedRewards = new Map<string, RewardAccumulator>();

    for (const ledger of ledgers) {
      const period = ledger.periodStart.toISOString().slice(0, 7);
      const strategy = ledger.validator.strategyType;
      const key = `${period}:${strategy}`;
      const existing = groupedRewards.get(key);

      if (existing) {
        existing.consensusReward += Number(ledger.consensusReward);
        existing.executionReward += Number(ledger.executionReward);
        existing.netReward += Number(ledger.netReward);
        existing.validatorCount += 1;
        continue;
      }

      groupedRewards.set(key, {
        period,
        strategy,
        consensusReward: Number(ledger.consensusReward),
        executionReward: Number(ledger.executionReward),
        netReward: Number(ledger.netReward),
        validatorCount: 1
      });
    }

    const items = [...groupedRewards.values()]
      .sort((left, right) => {
        if (left.period !== right.period) {
          return left.period < right.period ? 1 : -1;
        }

        return left.strategy.localeCompare(right.strategy);
      })
      .slice(0, options.limit)
      .map((entry) => {
        const assumedPrincipalEth = entry.validatorCount * 32;
        const annualizedApr = assumedPrincipalEth > 0 ? (entry.netReward * 12 * 100) / assumedPrincipalEth : 0;

        return {
          period: entry.period,
          strategy: entry.strategy,
          consensusReward: this.formatEth(entry.consensusReward),
          executionReward: this.formatEth(entry.executionReward),
          netApr: `${annualizedApr.toFixed(2)}%`,
          validatorCount: entry.validatorCount,
          netReward: this.formatEth(entry.netReward)
        };
      });

    return {
      total: items.length,
      items
    };
  }

  private mapSeverity(status: HealthStatus): "CRITICAL" | "WARNING" {
    return status === HealthStatus.CRITICAL ? "CRITICAL" : "WARNING";
  }

  private getSeverityRank(severity: "CRITICAL" | "WARNING") {
    return severity === "CRITICAL" ? 2 : 1;
  }

  private formatEth(value: number) {
    return `${value.toFixed(2)} ETH`;
  }
}
