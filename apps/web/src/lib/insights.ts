import {
  alertRows as fallbackAlertRows,
  rewardRows as fallbackRewardRows,
  type AlertRow,
  type RewardRow
} from "@eth-staking/domain";

import { fetchApiJson } from "./api-client";

type AlertApiItem = {
  source: string;
  severity: string;
  summary: string;
  acknowledged: boolean;
};

type RewardApiItem = {
  period: string;
  strategy: string;
  consensusReward: string;
  executionReward: string;
  netApr: string;
};

type ListResponse<Item> = {
  total: number;
  items: Item[];
};

type AlertsResult = {
  total: number;
  criticalCount: number;
  rows: AlertRow[];
};

type RewardsResult = {
  total: number;
  rows: RewardRow[];
};

function countCritical(rows: AlertRow[]) {
  return rows.filter((row) => row.severity.toUpperCase().includes("CRITICAL")).length;
}

export async function loadAlerts(): Promise<AlertsResult> {
  try {
    const response = await fetchApiJson<ListResponse<AlertApiItem>>("/alerts");
    const rows: AlertRow[] = response.items.map((item) => ({
      source: item.source,
      severity: item.severity,
      summary: item.summary,
      acknowledged: item.acknowledged ? "true" : "false"
    }));

    return {
      total: response.total,
      criticalCount: countCritical(rows),
      rows
    };
  } catch {
    return {
      total: fallbackAlertRows.length,
      criticalCount: countCritical(fallbackAlertRows),
      rows: fallbackAlertRows
    };
  }
}

export async function loadRewards(): Promise<RewardsResult> {
  try {
    const response = await fetchApiJson<ListResponse<RewardApiItem>>("/rewards");
    const rows: RewardRow[] = response.items.map((item) => ({
      period: item.period,
      strategy: item.strategy,
      consensusReward: item.consensusReward,
      executionReward: item.executionReward,
      netApr: item.netApr
    }));

    return {
      total: response.total,
      rows
    };
  } catch {
    return {
      total: fallbackRewardRows.length,
      rows: fallbackRewardRows
    };
  }
}
