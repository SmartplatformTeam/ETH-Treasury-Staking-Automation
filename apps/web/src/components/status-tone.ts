import type { StatusTone } from "@eth-staking/domain";

export function statusToneFromLabel(value: string): StatusTone {
  const label = value.toLowerCase();

  if (label.includes("critical") || label.includes("slashed") || label.includes("failed")) {
    return "critical";
  }

  if (label.includes("warning") || label.includes("pending") || label.includes("review")) {
    return "warning";
  }

  if (label.includes("degraded") || label.includes("planning")) {
    return "degraded";
  }

  if (label.includes("healthy") || label.includes("active") || label.includes("approved")) {
    return "healthy";
  }

  return "neutral";
}
