import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { loadRuntimeEnv } from "@eth-staking/config";
import { createLogger } from "@eth-staking/observability";

import { AppModule } from "./app.module";

async function bootstrap() {
  const env = loadRuntimeEnv();
  const logger = createLogger({ service: "api" });
  const app = await NestFactory.create(AppModule, { logger: false });

  app.setGlobalPrefix("v1");
  app.enableCors();

  const openApiConfig = new DocumentBuilder()
    .setTitle("ETH Treasury Staking Automation API")
    .setDescription("Operator API for DVT control plane, approvals, and reporting.")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup("docs", app, document);

  await app.listen(env.API_PORT, "0.0.0.0");

  logger.info("api_booted", {
    port: env.API_PORT,
    nodeEnv: env.NODE_ENV,
    baselineVersion: env.CDVN_BASELINE_VERSION,
    openApiPath: "/docs"
  });
}

void bootstrap();
