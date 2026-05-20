import { fetchApiJson } from "./api-client";

export type DepositDetail = {
  id: string;
  requestNumber: string;
  network: string;
  ownerEntity: string;
  validatorCount: number;
  validationStatus: string;
  approvalStatus: string;
  executionStatus: string;
  depositDataObjectKey: string | null;
  exportedPayloadObjectKey: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy: { id: string; email: string; name: string };
  cluster: { id: string; name: string } | null;
  treasuryAccount: {
    id: string;
    label: string;
    safeAddress: string;
    chainId: number;
    network: string;
  } | null;
  safeProposal:
    | {
        id: string;
        proposalNumber: string;
        status: string;
        chainId: number | null;
        to: string | null;
        value: string | null;
        data: string | null;
        operation: number;
        nonce: string | null;
        safeTxHash: string | null;
        payloadJson: unknown | null;
        createdAt: string;
        updatedAt: string;
      }
    | null;
  latestApproval: { id: string; policyType: string; finalStatus: string } | null;
};

export type ClusterOption = { id: string; name: string; network: string };
export type TreasuryOption = {
  id: string;
  label: string;
  safeAddress: string;
  chainId: number;
  network: string;
};

export async function loadDeposit(id: string): Promise<DepositDetail | null> {
  try {
    return await fetchApiJson<DepositDetail>(`/deposits/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function loadTreasuryOptions(): Promise<TreasuryOption[]> {
  try {
    const response = await fetchApiJson<{ items: TreasuryOption[] }>(
      "/inventory/treasury-accounts"
    );
    return response.items;
  } catch {
    return [];
  }
}

export async function loadDepositClusterOptions(): Promise<ClusterOption[]> {
  try {
    const response = await fetchApiJson<{
      items: { id: string; name: string; network: string }[];
    }>("/inventory/clusters");
    return response.items.map((item) => ({
      id: item.id,
      name: item.name,
      network: item.network
    }));
  } catch {
    return [];
  }
}
