import { z } from "zod";

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/eth_staking_automation?schema=public"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(1).default("change-me"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
  WEB3SIGNER_BASE_URL: z.string().url().default("http://localhost:9000"),
  KMS_PROVIDER: z.string().min(1).default("aws"),
  KMS_KEY_ID: z.string().min(1).default("example-kms-key"),
  OBOL_NETWORK: z.string().min(1).default("mainnet"),
  CDVN_BASELINE_VERSION: z.string().min(1).default("v1.6.0"),
  CDVN_OVERLAY_PROFILE: z.string().min(1).default("web3signer"),
  SAFE_ADDRESS: z.string().min(1).default("0x0000000000000000000000000000000000000000"),
  SAFE_TX_SERVICE_URL: z
    .string()
    .url()
    .default("https://safe-transaction-mainnet.safe.global"),
  S3_ENDPOINT: z.string().url().default("http://localhost:9001"),
  S3_BUCKET: z.string().min(1).default("eth-staking-artifacts"),
  S3_ACCESS_KEY: z.string().min(1).default("minio"),
  S3_SECRET_KEY: z.string().min(1).default("miniosecret"),
  SLACK_WEBHOOK_URL: z
    .string()
    .url()
    .default("https://hooks.slack.com/services/example/example/example"),
  ENCRYPTION_KEY: z.string().min(1).default("change-me")
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export function loadRuntimeEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  return runtimeEnvSchema.parse(source);
}
