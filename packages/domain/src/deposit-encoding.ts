/**
 * Encode calldata for the standard ETH deposit contract function:
 *   deposit(bytes pubkey, bytes withdrawal_credentials, bytes signature, bytes32 deposit_data_root)
 *
 * Function selector is keccak256("deposit(bytes,bytes,bytes,bytes32)")[:4] = 0x22895118.
 * We hardcode the selector rather than computing keccak here so this module stays
 * dependency-free; selector is a well-known constant of the deposit contract.
 *
 * Length contract:
 *   pubkey: 48 bytes (BLS12-381 G1 compressed)
 *   withdrawal_credentials: 32 bytes
 *   signature: 96 bytes (BLS12-381 G2 compressed)
 *   deposit_data_root: 32 bytes
 */

const DEPOSIT_FUNCTION_SELECTOR = "0x22895118";

export type DepositDataInputs = {
  pubkey: string; // 0x + 96 hex chars (48 bytes)
  withdrawalCredentials: string; // 0x + 64 hex chars (32 bytes)
  signature: string; // 0x + 192 hex chars (96 bytes)
  depositDataRoot: string; // 0x + 64 hex chars (32 bytes)
};

export type DepositDataValidationError = {
  field: keyof DepositDataInputs;
  message: string;
};

function strip0x(hex: string): string {
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
}

function isHex(value: string, expectedHexChars: number): boolean {
  if (value.length !== expectedHexChars) return false;
  return /^[0-9a-fA-F]+$/.test(value);
}

export function validateDepositDataInputs(
  inputs: DepositDataInputs
): DepositDataValidationError[] {
  const errors: DepositDataValidationError[] = [];
  const checks: { field: keyof DepositDataInputs; bytes: number }[] = [
    { field: "pubkey", bytes: 48 },
    { field: "withdrawalCredentials", bytes: 32 },
    { field: "signature", bytes: 96 },
    { field: "depositDataRoot", bytes: 32 }
  ];
  for (const { field, bytes } of checks) {
    const value = strip0x(inputs[field]);
    if (!isHex(value, bytes * 2)) {
      errors.push({
        field,
        message: `${field} must be a 0x-prefixed hex string of ${bytes} bytes (${bytes * 2} hex chars).`
      });
    }
  }
  return errors;
}

/**
 * Solidity ABI encode the call data for `deposit(...)`.
 *
 * Layout (after the 4-byte selector):
 *   [0x00] offset to pubkey (dynamic)                         = 0x80
 *   [0x20] withdrawal_credentials (32 bytes, static)
 *   [0x40] offset to signature (dynamic)                       = computed
 *   [0x60] deposit_data_root (32 bytes, static)
 *   [0x80] pubkey length (32) + padded data
 *   [...] signature length (32) + padded data
 *
 * Bytes types are encoded as: 32-byte length + data padded to multiple of 32 bytes.
 */
export function encodeDepositCalldata(inputs: DepositDataInputs): string {
  const errors = validateDepositDataInputs(inputs);
  if (errors.length > 0) {
    throw new Error(
      `Invalid deposit data: ${errors.map((e) => `${e.field}=${e.message}`).join("; ")}`
    );
  }

  const pubkey = strip0x(inputs.pubkey).toLowerCase();
  const wc = strip0x(inputs.withdrawalCredentials).toLowerCase();
  const sig = strip0x(inputs.signature).toLowerCase();
  const root = strip0x(inputs.depositDataRoot).toLowerCase();

  const word = (hex: string) => hex.padStart(64, "0");
  const padBytes = (hex: string) => {
    const padding = (64 - (hex.length % 64)) % 64;
    return hex + "0".repeat(padding);
  };

  // Static head: 4 words = 0x80 bytes
  // offset to pubkey = 0x80
  // wc word
  // offset to signature = 0x80 + (32 + padded pubkey bytes)
  const pubkeyBytesLen = pubkey.length / 2; // 48
  const pubkeyPaddedHexLen = padBytes(pubkey).length; // 128
  const offsetPubkey = 0x80; // = 128 bytes
  const offsetSignature =
    offsetPubkey + 32 /* length word */ + pubkeyPaddedHexLen / 2; // bytes
  const head = [
    word(offsetPubkey.toString(16)),
    wc,
    word(offsetSignature.toString(16)),
    root
  ].join("");

  // Dynamic tail: pubkey length + padded data, signature length + padded data
  const pubkeyTail = word(pubkeyBytesLen.toString(16)) + padBytes(pubkey);
  const sigBytesLen = sig.length / 2; // 96
  const sigTail = word(sigBytesLen.toString(16)) + padBytes(sig);

  const encoded = DEPOSIT_FUNCTION_SELECTOR + head + pubkeyTail + sigTail;
  return encoded;
}

export { DEPOSIT_FUNCTION_SELECTOR };
