# Harness Engineering Bootstrap Prompt

아래 내용은 Harness Engineering 또는 구현 에이전트에게 그대로 전달할 수 있는 초기 부트스트랩 가이드다.
현재 구현 상태를 확인할 때는 이 문서보다 `docs/repo-guide.md`, `docs/cdvn-runtime-handoff.md`를 우선한다.

## 프로젝트 목적

ETH Treasury 운영을 위한 스테이킹 자동화 플랫폼 monorepo를 생성하라. 이 플랫폼은 Obol Network 기반 DVT 운영, Web3Signer + KMS 기반 signer custody, 4대 bare-metal 서버 자동화, Safe multisig OVM account 기반 approval workflow를 포함해야 한다. 또한 validator inventory, node health monitoring, alert center, deposit approval workflow, reward accounting dashboard, audit log 기능을 제공해야 한다.

Obol operator runtime은 `charon-distributed-validator-node`를 기준선으로 삼고, 커스텀은 overlay로 분리하라.

## 핵심 제약

- mnemonic, seed, validator private key raw data를 저장하지 말 것
- validator client signing key raw material은 Web3Signer + KMS 경로 밖에 저장하지 말 것
- deposit 실행은 자동 서명하지 말 것
- slash risk가 있는 동작은 자동 실행하지 말 것
- 모든 위험 작업은 approval workflow를 거치게 할 것
- 도메인 로직을 UI에 넣지 말 것
- TypeScript strict mode를 사용할 것
- monorepo 구조로 만들 것
- 4대 bare-metal 서버를 동일한 자동화 경로로 구성할 것
- Safe wallet 기반 multisig contract를 OVM account로 취급할 것
- upstream CDVN baseline을 재작성하지 말고 pinned baseline + overlay 전략을 사용할 것

## 요구 레포 구조

```text
apps/web
apps/api
apps/worker
packages/db
packages/domain
packages/ui
packages/config
packages/observability
docs
infra
```

## 기술 스택

- pnpm
- Turborepo
- Next.js
- NestJS
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Tailwind CSS
- Obol / Charon
- Web3Signer
- KMS
- Safe SDK 또는 transaction service
- Ansible 또는 동등한 bare-metal automation 도구
- Docker Compose 기반 CDVN runtime

## 1차 구현 범위

- 로그인 가능한 관리자 웹
- 역할 기반 접근 제어
- validator inventory 목록과 상세
- node inventory 목록과 상세
- Obol DVT cluster inventory
- Web3Signer signer inventory
- health 상태 ingestion
- alert center
- deposit request 생성
- approval queue
- Safe proposal export
- reward summary 화면
- audit log 화면
- 4개 bare-metal host baseline automation

## 도메인 우선순위

다음 도메인부터 구현하라.

- User
- Role
- Validator
- Node
- Cluster
- Signer
- TreasuryAccount
- DepositRequest
- Approval
- RewardLedger
- AuditLog

## 페이지 우선순위

- Dashboard
- Validators
- Nodes
- Clusters
- Alerts
- Deposits
- Approvals
- Rewards
- Audit

## API 우선순위

- auth
- validators
- nodes
- clusters
- signers
- health heartbeat
- alerts
- deposit requests
- approvals
- safe proposals
- rewards summary
- audit logs

## 구현 원칙

- Prisma schema를 먼저 작성하라.
- seed data로 로컬 데모가 가능해야 한다.
- web은 표 중심 운영 UI로 시작하라.
- API는 OpenAPI를 노출하라.
- worker는 health evaluation job skeleton을 포함하라.
- 공통 타입은 packages/domain으로 이동하라.
- 4대 bare-metal 서버 inventory와 config render를 `infra/` 아래에 정의하라.
- `infra/obol-cdvn` 아래에 baseline mirror, overlays, inventory, scripts를 둬라.
- Obol, Web3Signer, Safe 연동은 adapter 계층으로 분리하라.
- DKG와 add-validator는 Charon 표준 절차를 따르되 control plane에서 추적하라.
- Safe payload export까지만 자동화하고 direct execution은 하지 말라.

## 첫 커밋 범위

첫 커밋에는 아래를 포함하라.

- monorepo scaffold
- pnpm workspace
- turbo config
- web/api/worker 앱 생성
- shared package 기본 구조
- Prisma 초기 schema
- CDVN baseline mirror
- bare-metal inventory scaffold
- 기본 README
- `.env.example`

## 두 번째 커밋 범위

- auth stub
- RBAC model
- validator list API
- validator list UI
- node list API
- node list UI
- cluster and signer list API/UI
- baseline / overlay version inventory

## 세 번째 커밋 범위

- alert schema
- heartbeat endpoint
- worker queue
- alert evaluation skeleton
- bare-metal rollout skeleton
- CDVN render and overlay merge
- Obol / Web3Signer health sync

## 네 번째 커밋 범위

- deposit request schema
- approval workflow schema
- deposit request 생성 UI
- approval queue UI
- Safe proposal export
- audit log 기록

## 다섯 번째 커밋 범위

- reward ledger schema
- batch skeleton
- dashboard summary cards
- rewards page

## 완료 기준

로컬 환경에서 다음이 동작해야 한다.

- `pnpm install`
- `pnpm db:push` 또는 migration 적용
- `pnpm dev`
- seed data 기반 UI 렌더링
- validators, nodes, clusters, alerts, deposits, approvals, rewards 페이지 접근

## 구현 스타일

- 실무형 운영 UI
- 과한 장식 금지
- 데스크톱 우선
- 명확한 상태 배지
- 위험 작업 버튼은 confirmation step 포함
