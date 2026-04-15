import { loadRuntimeEnv } from "@eth-staking/config";
import { createLogger } from "@eth-staking/observability";

import { runHealthEvaluation } from "./jobs/health-evaluator";

async function bootstrap() {
  const env = loadRuntimeEnv();
  const logger = createLogger({ service: "worker" });

  logger.info("worker_booted", {
    concurrency: env.WORKER_CONCURRENCY,
    baselineVersion: env.CDVN_BASELINE_VERSION,
    overlayProfile: env.CDVN_OVERLAY_PROFILE
  });

  const preview = await runHealthEvaluation({
    clusterName: "mainnet-obol-a",
    triggeredAt: new Date().toISOString(),
    baselineVersion: env.CDVN_BASELINE_VERSION
  });

  logger.info("health_evaluator_preview", preview);
}

void bootstrap();
