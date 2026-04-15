import {
  clusterRows as fallbackClusterRows,
  nodeRows as fallbackNodeRows,
  validatorRows as fallbackValidatorRows,
  type ClusterRow,
  type NodeRow,
  type ValidatorRow
} from "@eth-staking/domain";
import { fetchApiJson } from "./api-client";

export type SignerRow = {
  name: string;
  provider: string;
  endpoint: string;
  keyRef: string;
  cluster: string;
  host: string;
  validators: string;
  status: string;
};

type ValidatorInventoryItem = {
  publicKey: string;
  status: string;
  strategyType: string;
  ownerEntity: string;
  clusterName: string | null;
};

type NodeInventoryItem = {
  name: string;
  role: string;
  clientType: string;
  clientVersion: string;
  region: string;
  healthStatus: string;
  lastHeartbeatAt: string | null;
};

type ClusterInventoryItem = {
  name: string;
  baselineVersion: string;
  overlayVersion: string;
  threshold: number;
  operatorCount: number;
  signerMode: string | null;
  runtimeStatus: string;
};

type SignerInventoryItem = {
  name: string;
  provider: string;
  web3signerUrl: string;
  kmsKeyRef: string;
  clusterName: string | null;
  host: {
    name: string;
  } | null;
  validatorCount: number;
  healthStatus: string;
};

type InventoryResponse<Item> = {
  total: number;
  items: Item[];
};

type ValidatorInventoryResult = {
  total: number;
  activeCount: number;
  pendingCount: number;
  rows: ValidatorRow[];
};

type NodeInventoryResult = {
  total: number;
  rows: NodeRow[];
};

type ClusterInventoryResult = {
  total: number;
  healthyCount: number;
  rows: ClusterRow[];
};

type SignerInventoryResult = {
  total: number;
  rows: SignerRow[];
};

const fallbackSignerRows: SignerRow[] = [
  {
    name: "signer-mainnet-a-1",
    provider: "WEB3SIGNER",
    endpoint: "http://operator-1.internal:9000",
    keyRef: "kms://mainnet-a/operator-1",
    cluster: "mainnet-obol-a",
    host: "operator-1",
    validators: "1",
    status: "HEALTHY"
  }
];

async function fetchInventory<Item>(resource: string): Promise<InventoryResponse<Item>> {
  return fetchApiJson<InventoryResponse<Item>>(`/inventory/${resource}`);
}

function countByLabel(rows: { status: string }[], keyword: string) {
  return rows.filter((row) => row.status.toUpperCase().includes(keyword)).length;
}

function formatHeartbeat(value: string | null) {
  return value ?? "N/A";
}

export async function loadValidatorInventory(): Promise<ValidatorInventoryResult> {
  try {
    const response = await fetchInventory<ValidatorInventoryItem>("validators");
    const rows: ValidatorRow[] = response.items.map((item) => ({
      publicKey: item.publicKey,
      status: item.status,
      strategy: item.strategyType,
      cluster: item.clusterName ?? "unbound",
      ownerEntity: item.ownerEntity
    }));

    return {
      total: response.total,
      activeCount: countByLabel(rows, "ACTIVE"),
      pendingCount: countByLabel(rows, "PENDING"),
      rows
    };
  } catch {
    return {
      total: fallbackValidatorRows.length,
      activeCount: countByLabel(fallbackValidatorRows, "ACTIVE"),
      pendingCount: countByLabel(fallbackValidatorRows, "PENDING"),
      rows: fallbackValidatorRows
    };
  }
}

export async function loadNodeInventory(): Promise<NodeInventoryResult> {
  try {
    const response = await fetchInventory<NodeInventoryItem>("nodes");
    const rows: NodeRow[] = response.items.map((item) => ({
      name: item.name,
      role: item.role,
      client: `${item.clientType} ${item.clientVersion}`,
      region: item.region,
      status: item.healthStatus,
      lastHeartbeat: formatHeartbeat(item.lastHeartbeatAt)
    }));

    return {
      total: response.total,
      rows
    };
  } catch {
    return {
      total: fallbackNodeRows.length,
      rows: fallbackNodeRows
    };
  }
}

export async function loadClusterInventory(): Promise<ClusterInventoryResult> {
  try {
    const response = await fetchInventory<ClusterInventoryItem>("clusters");
    const rows: ClusterRow[] = response.items.map((item) => ({
      name: item.name,
      baselineVersion: item.baselineVersion,
      overlayVersion: item.overlayVersion,
      threshold: `${item.threshold} / ${item.operatorCount}`,
      signerPath: item.signerMode ? `${item.signerMode} + KMS` : "Web3Signer + KMS",
      status: item.runtimeStatus
    }));

    return {
      total: response.total,
      healthyCount: countByLabel(rows, "HEALTHY"),
      rows
    };
  } catch {
    return {
      total: fallbackClusterRows.length,
      healthyCount: countByLabel(fallbackClusterRows, "HEALTHY"),
      rows: fallbackClusterRows
    };
  }
}

export async function loadSignerInventory(): Promise<SignerInventoryResult> {
  try {
    const response = await fetchInventory<SignerInventoryItem>("signers");
    const rows: SignerRow[] = response.items.map((item) => ({
      name: item.name,
      provider: item.provider,
      endpoint: item.web3signerUrl,
      keyRef: item.kmsKeyRef,
      cluster: item.clusterName ?? "unbound",
      host: item.host?.name ?? "unbound",
      validators: String(item.validatorCount),
      status: item.healthStatus
    }));

    return {
      total: response.total,
      rows
    };
  } catch {
    return {
      total: fallbackSignerRows.length,
      rows: fallbackSignerRows
    };
  }
}
