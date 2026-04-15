import type { AuthSession } from "@eth-staking/domain";

export type AuthenticatedHttpRequest = {
  headers: Record<string, string | string[] | undefined>;
  authSession?: AuthSession;
};
