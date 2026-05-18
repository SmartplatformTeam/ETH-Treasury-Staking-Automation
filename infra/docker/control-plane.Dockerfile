FROM node:20-bookworm-slim

ARG PNPM_VERSION=10.0.0
ARG API_BASE_URL=http://localhost:4000

ENV API_BASE_URL=${API_BASE_URL}
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/eth_staking_automation?schema=public

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl ansible openssh-client \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm build

ENV NODE_ENV=production
