import { prisma } from "@eth-staking/db";
import type { Logger } from "@eth-staking/observability";

import { BeaconClient } from "../clients/beacon";

export type BeaconSyncSummary = {
  total: number;
  synced: number;
  notFound: number;
  failed: number;
};

export async function runBeaconSync(params: {
  beaconClient: BeaconClient;
  logger: Logger;
}): Promise<BeaconSyncSummary> {
  const { beaconClient, logger } = params;

  const validators = await prisma.validator.findMany({
    where: { archivedAt: null },
    select: { id: true, publicKey: true },
  });

  let synced = 0;
  let notFound = 0;
  let failed = 0;

  for (const v of validators) {
    try {
      const state = await beaconClient.getValidator("head", v.publicKey);

      if (!state) {
        notFound++;
        await prisma.validator.update({
          where: { id: v.id },
          data: { lastBeaconSyncAt: new Date() },
        });
        continue;
      }

      await prisma.$transaction([
        prisma.validator.update({
          where: { id: v.id },
          data: {
            validatorIndex: state.index,
            beaconStatus: state.status,
            balanceGwei: state.balanceGwei,
            effectiveBalanceGwei: state.effectiveBalanceGwei,
            activationEligibilityEpoch: state.activationEligibilityEpoch,
            activationEpoch: state.activationEpoch,
            exitEpoch: state.exitEpoch,
            withdrawableEpoch: state.withdrawableEpoch,
            withdrawalCredentials: state.withdrawalCredentials,
            slashed: state.slashed,
            lastBeaconSyncAt: new Date(),
          },
        }),
        prisma.validatorBalanceSnapshot.create({
          data: {
            validatorId: v.id,
            beaconStatus: state.status,
            balanceGwei: state.balanceGwei,
            effectiveBalanceGwei: state.effectiveBalanceGwei,
          },
        }),
      ]);

      synced++;
    } catch (err) {
      failed++;
      logger.error("beacon_sync_validator_failed", {
        validatorId: v.id,
        pubkeyPrefix: v.publicKey.slice(0, 12),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { total: validators.length, synced, notFound, failed };
}
