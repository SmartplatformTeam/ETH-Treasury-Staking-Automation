import { loadRuntimeEnv } from "@eth-staking/config";
import { createLogger } from "@eth-staking/observability";

import { BeaconClient } from "./clients/beacon";
import { runBeaconSync } from "./jobs/beacon-sync";
import { runHealthEvaluation } from "./jobs/health-evaluator";

async function bootstrap() {
  const env = loadRuntimeEnv();
  const logger = createLogger({ service: "worker" });

  logger.info("worker_booted", {
    concurrency: env.WORKER_CONCURRENCY,
    baselineVersion: env.CDVN_BASELINE_VERSION,
    overlayProfile: env.CDVN_OVERLAY_PROFILE,
    beaconBaseUrl: env.BEACON_BASE_URL,
    beaconIntervalMs: env.BEACON_SYNC_INTERVAL_MS,
    healthIntervalMs: env.HEALTH_SYNC_INTERVAL_MS,
  });

  const beaconClient = new BeaconClient(env.BEACON_BASE_URL);

  const beaconTick = async () => {
    try {
      const summary = await runBeaconSync({ beaconClient, logger });
      logger.info("beacon_sync_tick", summary);
    } catch (err) {
      logger.error("beacon_sync_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const healthTick = async () => {
    try {
      const summary = await runHealthEvaluation({ beaconClient, logger });
      logger.info("health_evaluation_tick", summary);
    } catch (err) {
      logger.error("health_evaluation_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  await beaconTick();
  await healthTick();

  setInterval(() => {
    void beaconTick();
  }, env.BEACON_SYNC_INTERVAL_MS);

  setInterval(() => {
    void healthTick();
  }, env.HEALTH_SYNC_INTERVAL_MS);
}

void bootstrap();
