# Repo Bootstrap

이 문서는 greenfield 기준의 초기 bootstrap 설계 문서다.
현재 구현 상태와 runtime automation 진행 상황은 `docs/repo-guide.md`, `docs/cdvn-runtime-handoff.md`를 source of truth로 본다.

## 레포 목표

이 레포는 문서 저장소가 아니라 실제 서비스 구현을 바로 시작할 수 있는 monorepo로 구성한다.

## 추천 구조

```text
eth-treasury-staking-automation/
  apps/
    web/
    api/
    worker/
  packages/
    db/
    domain/
    ui/
    config/
    observability/
    client-sdk/
  docs/
  infra/
  scripts/
  .github/
  AGENTS.md
  README.md
  package.json
  pnpm-workspace.yaml
  turbo.json
```

추가적으로 `infra/` 아래에는 4대 bare-metal 서버 inventory, bootstrap script, rollout playbook, Obol/Web3Signer/Safe 연동 예시를 포함하는 것을 권장한다.

예시:

```text
infra/
  obol-cdvn/
    baseline/
      VERSION
      upstream/
    overlays/
      web3signer/
      observability/
    inventory/
    scripts/
```

## 기술 스택 권장안

### 패키지 매니저

- pnpm

### 모노레포 도구

- Turborepo

### 프론트엔드

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### 백엔드

- NestJS
- Prisma
- PostgreSQL
- Redis
- BullMQ

### DVT / Signer

- Obol / Charon
- Web3Signer
- KMS
- Obol `charon-distributed-validator-node` baseline

### Treasury Execution

- Safe SDK 또는 Safe transaction service

### 인프라 자동화

- Ansible 또는 SSH 기반 idempotent rollout
- Docker Compose 기반 CDVN rollout

### 인증

- NextAuth 또는 Auth.js
- 사내 SSO가 있으면 OIDC 확장 고려

## 초기 개발 순서

### 단계 1

- monorepo 초기화
- lint, format, typecheck 설정
- shared tsconfig 설정
- env loader 설정
- Prisma 초기 schema 작성
- CDVN upstream baseline pinning 전략 정의
- bare-metal inventory manifest 초안

### 단계 2

- web 앱 기본 레이아웃
- api 앱 health endpoint
- auth stub
- RBAC enum 도입
- Safe / signer / Obol 환경 설정 모델 초안
- `infra/obol-cdvn` baseline mirror와 overlay 폴더 생성

### 단계 3

- validator, node, cluster, signer 스키마 작성
- DKG ceremony, baselineVersion, overlayVersion 필드 반영
- seed data
- 목록 API 및 테이블 UI

### 단계 4

- worker 및 queue 도입
- heartbeat ingestion
- alert evaluation
- CDVN baseline render 및 bare-metal rollout config render
- Obol / Web3Signer health sync

### 단계 5

- deposit request 도메인
- approval 도메인
- Safe proposal export 도메인
- audit log 도메인

### 단계 6

- reward ledger 배치
- 대시보드 연결

## 환경 분리

다음 환경을 명시적으로 분리한다.

- local
- dev
- staging
- prod

환경마다 다음을 분리한다.

- DB
- Redis
- object storage bucket
- alert destination
- signer export target
- KMS key namespace
- Safe address / chain config
- Obol cluster namespace
- CDVN baseline version
- overlay patch set

## 필수 초기 환경변수 예시

```bash
NODE_ENV=development
DATABASE_URL=
REDIS_URL=
APP_BASE_URL=
AUTH_SECRET=
WEB3SIGNER_BASE_URL=
KMS_PROVIDER=
KMS_KEY_ID=
OBOL_NETWORK=
CDVN_BASELINE_VERSION=
CDVN_OVERLAY_PROFILE=
SAFE_ADDRESS=
SAFE_TX_SERVICE_URL=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
SLACK_WEBHOOK_URL=
ENCRYPTION_KEY=
```

## 브랜치 전략

- `main` 은 배포 가능한 상태 유지
- 기능 개발은 짧은 feature branch 사용
- schema 변경은 migration과 함께 제출
- approval flow 변경은 반드시 문서 동반

## 품질 게이트

모든 PR은 아래를 통과해야 한다.

- lint
- typecheck
- unit test
- prisma format and validate
- build

추가적으로 도메인 변경이 approval, deposit, signer binding, DVT, Safe 관련이면 아래도 필수다.

- audit log 영향 검토
- RBAC 영향 검토
- slash risk 영향 검토
- 위험도 설명 문서 갱신

## 권장 첫 이슈 목록

- monorepo scaffold
- cdvn baseline mirror and overlay layout
- auth and role model
- Prisma base schema
- obol cluster and signer inventory schema
- validator inventory list page
- bare-metal host inventory scaffold
- node heartbeat ingestion endpoint
- alert model and evaluator
- deposit request creation form
- safe account model and proposal export
- approval queue page
- reward ledger schema and batch skeleton
- audit log middleware
