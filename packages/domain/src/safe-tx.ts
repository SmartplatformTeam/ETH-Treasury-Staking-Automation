/**
 * Build a Safe Transaction Service v1-compatible JSON payload.
 *
 * Reference: https://docs.safe.global/safe-core-api/api
 *
 * Note: safeTxHash is intentionally left `null`. Computing the EIP-712 hash
 * requires keccak256 which we avoid adding as a dependency in this phase.
 * Safe Web UI recomputes the hash on import, so the proposal still works
 * end-to-end — the operator just has to confirm the hash visually after
 * importing.
 */

export type SafeTxInput = {
  chainId: number;
  safeAddress: string;
  to: string;
  /** wei as decimal string */
  value: string;
  /** 0x-prefixed hex calldata */
  data: string;
  /** Safe operation: 0 = CALL, 1 = DELEGATECALL */
  operation?: 0 | 1;
  /** Safe wallet nonce (decimal string) — operator copies from Safe UI */
  nonce: string;
  /** Optional Safe Tx Service fields, default 0 / zero address */
  safeTxGas?: string;
  baseGas?: string;
  gasPrice?: string;
  gasToken?: string;
  refundReceiver?: string;
};

export type SafeTxPayload = {
  safe: string;
  to: string;
  value: string;
  data: string;
  operation: 0 | 1;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: string;
  contractTransactionHash: string | null;
  chainId: number;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function buildSafeTxPayload(input: SafeTxInput): SafeTxPayload {
  return {
    safe: input.safeAddress,
    to: input.to,
    value: input.value,
    data: input.data,
    operation: input.operation ?? 0,
    safeTxGas: input.safeTxGas ?? "0",
    baseGas: input.baseGas ?? "0",
    gasPrice: input.gasPrice ?? "0",
    gasToken: input.gasToken ?? ZERO_ADDRESS,
    refundReceiver: input.refundReceiver ?? ZERO_ADDRESS,
    nonce: input.nonce,
    contractTransactionHash: null,
    chainId: input.chainId
  };
}

export { ZERO_ADDRESS };
