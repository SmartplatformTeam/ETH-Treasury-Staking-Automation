import { BadRequestException } from "@nestjs/common";

const REJECT_REASON_MAX_LENGTH = 1000;
const CONTROL_CHAR_PATTERN = /[\x00-\x1F\x7F]+/g;

export type RejectApprovalDto = {
  reason: string;
};

function stripControlChars(value: string) {
  return value.replace(CONTROL_CHAR_PATTERN, " ");
}

export function parseRejectApprovalDto(rawValue: unknown): RejectApprovalDto {
  if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) {
    throw new BadRequestException("Request body must be an object.");
  }

  const input = rawValue as Record<string, unknown>;
  const rawReason = input.reason;

  if (typeof rawReason !== "string") {
    throw new BadRequestException("Field 'reason' must be a string.");
  }

  const trimmed = stripControlChars(rawReason).trim();

  if (trimmed.length === 0) {
    throw new BadRequestException("Field 'reason' is required and must be a non-empty string.");
  }

  if (trimmed.length > REJECT_REASON_MAX_LENGTH) {
    throw new BadRequestException(
      `Field 'reason' must be at most ${REJECT_REASON_MAX_LENGTH} characters.`,
    );
  }

  return { reason: trimmed };
}
