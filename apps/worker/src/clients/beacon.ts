export type BeaconValidatorState = {
  index: number;
  balanceGwei: bigint;
  status: string;
  pubkey: string;
  effectiveBalanceGwei: bigint;
  withdrawalCredentials: string;
  slashed: boolean;
  activationEligibilityEpoch: bigint | null;
  activationEpoch: bigint | null;
  exitEpoch: bigint | null;
  withdrawableEpoch: bigint | null;
};

const FAR_FUTURE_EPOCH = "18446744073709551615";

function parseEpoch(value: string): bigint | null {
  return value === FAR_FUTURE_EPOCH ? null : BigInt(value);
}

type BeaconValidatorResponseData = {
  index: string;
  balance: string;
  status: string;
  validator: {
    pubkey: string;
    withdrawal_credentials: string;
    effective_balance: string;
    slashed: boolean;
    activation_eligibility_epoch: string;
    activation_epoch: string;
    exit_epoch: string;
    withdrawable_epoch: string;
  };
};

function parseBeaconValidator(data: BeaconValidatorResponseData): BeaconValidatorState {
  return {
    index: Number.parseInt(data.index, 10),
    balanceGwei: BigInt(data.balance),
    status: data.status,
    pubkey: data.validator.pubkey,
    effectiveBalanceGwei: BigInt(data.validator.effective_balance),
    withdrawalCredentials: data.validator.withdrawal_credentials,
    slashed: data.validator.slashed,
    activationEligibilityEpoch: parseEpoch(data.validator.activation_eligibility_epoch),
    activationEpoch: parseEpoch(data.validator.activation_epoch),
    exitEpoch: parseEpoch(data.validator.exit_epoch),
    withdrawableEpoch: parseEpoch(data.validator.withdrawable_epoch),
  };
}

export type BeaconNodeHealth =
  | { reachable: true; status: 200 | 206 | 503; ready: boolean; syncing: boolean }
  | { reachable: false; error: string };

export type BeaconNodeSyncing = {
  reachable: boolean;
  headSlot: bigint | null;
  syncDistance: bigint | null;
  isSyncing: boolean | null;
  isOptimistic: boolean | null;
  isElOffline: boolean | null;
};

type BeaconSyncingResponse = {
  data: {
    head_slot: string;
    sync_distance: string;
    is_syncing: boolean;
    is_optimistic?: boolean;
    el_offline?: boolean;
  };
};

export class BeaconClient {
  constructor(
    private readonly baseUrl: string,
    private readonly requestTimeoutMs = 10_000,
  ) {}

  async getNodeHealth(): Promise<BeaconNodeHealth> {
    const url = new URL("/eth/v1/node/health", this.baseUrl);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(this.requestTimeoutMs) });
      const status = res.status as 200 | 206 | 503;
      if (status === 200 || status === 206 || status === 503) {
        return {
          reachable: true,
          status,
          ready: status === 200,
          syncing: status === 206,
        };
      }
      return { reachable: false, error: `Unexpected status ${res.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      return { reachable: false, error: message };
    }
  }

  async getNodeSyncing(): Promise<BeaconNodeSyncing> {
    const url = new URL("/eth/v1/node/syncing", this.baseUrl);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(this.requestTimeoutMs) });
      if (!res.ok) {
        return {
          reachable: false,
          headSlot: null,
          syncDistance: null,
          isSyncing: null,
          isOptimistic: null,
          isElOffline: null,
        };
      }
      const json = (await res.json()) as BeaconSyncingResponse;
      return {
        reachable: true,
        headSlot: BigInt(json.data.head_slot),
        syncDistance: BigInt(json.data.sync_distance),
        isSyncing: json.data.is_syncing,
        isOptimistic: typeof json.data.is_optimistic === "boolean" ? json.data.is_optimistic : null,
        isElOffline: typeof json.data.el_offline === "boolean" ? json.data.el_offline : null,
      };
    } catch {
      return {
        reachable: false,
        headSlot: null,
        syncDistance: null,
        isSyncing: null,
        isOptimistic: null,
        isElOffline: null,
      };
    }
  }

  async getValidator(stateId: string, validatorId: string): Promise<BeaconValidatorState | null> {
    const url = new URL(
      `/eth/v1/beacon/states/${encodeURIComponent(stateId)}/validators/${encodeURIComponent(validatorId)}`,
      this.baseUrl,
    );
    const res = await fetch(url, { signal: AbortSignal.timeout(this.requestTimeoutMs) });

    if (res.status === 404 || res.status === 400) {
      return null;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Beacon ${res.status} for ${validatorId}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { data: BeaconValidatorResponseData };
    return parseBeaconValidator(json.data);
  }
}
