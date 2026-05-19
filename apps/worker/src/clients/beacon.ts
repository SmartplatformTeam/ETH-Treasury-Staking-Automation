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

export class BeaconClient {
  constructor(
    private readonly baseUrl: string,
    private readonly requestTimeoutMs = 10_000,
  ) {}

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
