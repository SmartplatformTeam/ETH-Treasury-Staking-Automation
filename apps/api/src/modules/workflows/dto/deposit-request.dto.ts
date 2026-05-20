import { BadRequestException } from "@nestjs/common";

import { Network } from "@eth-staking/db";

const HEX_RE = /^[0-9a-fA-F]+$/;

export type CreateDepositRequestDto = {
  network: Network;
  ownerEntity: string;
  clusterId: string;
  treasuryAccountId: string;
  validatorCount: number;
  pubkey: string;
  withdrawalCredentials: string;
  signature: string;
  depositDataRoot: string;
  depositDataObjectKey?: string;
};

export type MarkSubmittedDto = {
  safeTxHash: string;
};

function readString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestException(`Field '${key}' is required and must be a non-empty string.`);
  }
  return value.trim();
}

function readOptionalString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new BadRequestException(`Field '${key}' must be a string when provided.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseHexField(value: string, key: string, bytes: number) {
  const stripped = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (stripped.length !== bytes * 2 || !HEX_RE.test(stripped)) {
    throw new BadRequestException(
      `Field '${key}' must be a 0x-prefixed hex string of ${bytes} bytes (${bytes * 2} hex chars).`
    );
  }
  return `0x${stripped.toLowerCase()}`;
}

function parseNetwork(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!Object.values(Network).includes(normalized as Network)) {
    throw new BadRequestException(
      `Invalid network '${value}'. Use one of: ${Object.values(Network).join(", ")}.`
    );
  }
  return normalized as Network;
}

export function parseCreateDepositRequestDto(rawValue: unknown): CreateDepositRequestDto {
  if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
    throw new BadRequestException("Request body must be an object.");
  }
  const input = rawValue as Record<string, unknown>;

  const validatorCountRaw = input.validatorCount;
  if (typeof validatorCountRaw !== "number" || !Number.isInteger(validatorCountRaw) || validatorCountRaw < 1) {
    throw new BadRequestException("Field 'validatorCount' must be a positive integer.");
  }
  if (validatorCountRaw !== 1) {
    throw new BadRequestException(
      "Phase 2-7 supports only single-validator deposits (validatorCount=1)."
    );
  }

  return {
    network: parseNetwork(readString(input, "network")),
    ownerEntity: readString(input, "ownerEntity"),
    clusterId: readString(input, "clusterId"),
    treasuryAccountId: readString(input, "treasuryAccountId"),
    validatorCount: validatorCountRaw,
    pubkey: parseHexField(readString(input, "pubkey"), "pubkey", 48),
    withdrawalCredentials: parseHexField(
      readString(input, "withdrawalCredentials"),
      "withdrawalCredentials",
      32
    ),
    signature: parseHexField(readString(input, "signature"), "signature", 96),
    depositDataRoot: parseHexField(
      readString(input, "depositDataRoot"),
      "depositDataRoot",
      32
    ),
    ...(() => {
      const key = readOptionalString(input, "depositDataObjectKey");
      return key ? { depositDataObjectKey: key } : {};
    })()
  };
}

export type ExportSafePayloadDto = {
  nonce: string;
};

export function parseExportSafePayloadDto(rawValue: unknown): ExportSafePayloadDto {
  if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
    throw new BadRequestException("Request body must be an object.");
  }
  const input = rawValue as Record<string, unknown>;
  const nonceRaw = input.nonce;
  if (typeof nonceRaw !== "string" || nonceRaw.trim().length === 0) {
    throw new BadRequestException("Field 'nonce' is required (copy from Safe wallet UI).");
  }
  const trimmed = nonceRaw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new BadRequestException("Field 'nonce' must be a decimal integer string.");
  }
  return { nonce: trimmed };
}

export function parseMarkSubmittedDto(rawValue: unknown): MarkSubmittedDto {
  if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
    throw new BadRequestException("Request body must be an object.");
  }
  const input = rawValue as Record<string, unknown>;
  const hashRaw = input.safeTxHash;
  if (typeof hashRaw !== "string") {
    throw new BadRequestException("Field 'safeTxHash' is required.");
  }
  const stripped = hashRaw.trim().startsWith("0x")
    ? hashRaw.trim().slice(2)
    : hashRaw.trim();
  if (stripped.length !== 64 || !HEX_RE.test(stripped)) {
    throw new BadRequestException(
      "Field 'safeTxHash' must be a 0x-prefixed 32-byte hex string."
    );
  }
  return { safeTxHash: `0x${stripped.toLowerCase()}` };
}
