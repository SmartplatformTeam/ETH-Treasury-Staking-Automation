# ETH Treasury Staking Automation

이 저장소는 ETH Treasury 사업자를 위한 스테이킹 자동화 플랫폼의 설계 문서와 현재 monorepo 구현 상태를 담고 있다.

핵심 목표는 다음과 같다.

- 스테이킹 운영 자동화
- Obol Network 기반 DVT 운영 표준화
- 신규 validator 생성 승인 워크플로우 표준화
- 모니터링, 알림, 정산, 리포팅 일원화
- Web3Signer + KMS 기반 validator signing key custody
- 4대 bare-metal operator 환경 자동화
- slash 위험 구간과 자금 집행 구간에 대한 승인형 반자동화
- Safe multisig OVM account 기반 execution 통제
- 향후 Solo, DVT, Pool, Restaking 전략을 동일한 운영 체계 아래에서 관리 가능한 구조 확보

## 문서 구성

- `CONTRIBUTING.md`
  - 공개 저장소 기여 방식, 문서 동기화 기준, public-safe contribution 원칙
- `SECURITY.md`
  - 보안 취약점 보고 방식과 secret / runtime artifact 공개 금지 정책
- `LICENSE`
  - 공개 저장소 배포와 기여를 위한 라이선스 파일
- `docs/reading-order.md`
  - 이 레포 문서를 어떤 순서로 읽으면 되는지 정리한 문서 읽기 안내서
- `AGENTS.md`
  - Harness Engineering, Codex, 구현 에이전트에게 전달할 작업 원칙과 제약
- `docs/product-spec.md`
  - 제품 목표, 사용자, 핵심 기능, 범위 정의
- `docs/repo-guide.md`
  - 이 레포가 실제로 무엇이고 지금 어디까지 구현됐는지 설명하는 안내서
- `docs/beginner-guide.md`
  - 초보자 기준으로 이 레포가 왜 존재하는지, 무엇을 하고, 어떻게 써야 하는지 설명하는 입문 문서
- `docs/system-diagrams.md`
  - 이 레포의 구조, runtime 배포 흐름, 승인 경계를 그림 중심으로 설명하는 다이어그램 문서
- `docs/dvt-cluster-walkthrough.md`
  - 운영자가 신규 DVT cluster를 준비해서 validating까지 올리는 실제 예시 시나리오 문서
- `docs/runtime-inventory-guide.md`
  - 실제 `cluster.yml`, `hosts.yml`를 어떤 기준으로 채워야 하는지 설명하는 inventory 준비 문서
- `docs/runtime-secrets-guide.md`
  - host secret 경로, JWT, cert/key/CA, `.charon` allowlist 경계를 설명하는 secret 준비 문서
- `docs/web3signer-kms-guide.md`
  - Web3Signer + KMS 실연동 전에 무엇을 확정해야 하는지 정리한 운영 문서
- `docs/approval-audit-guide.md`
  - artifact stage approval, rollout approval, audit 보관 방식을 설명하는 운영 문서
- `docs/observability-alerting-guide.md`
  - Prometheus/Loki/Tempo/health-sync/alert routing 운영 결정을 정리하는 문서
- `docs/bring-up-checklist.md`
  - 신규 cluster bring-up 때 실제로 체크해야 할 단계별 runbook
- `docs/publish-safety-checklist.md`
  - 이 레포를 공개 GitHub 저장소로 운영할 때 필요한 보안 경계와 공개 전 점검 체크리스트
- `docs/architecture.md`
  - 시스템 아키텍처, 서비스 경계, 데이터 흐름, 보안 원칙
- `docs/cdvn-baseline.md`
  - Obol CDVN baseline 채택 범위와 overlay 커스터마이징 원칙
- `docs/cdvn-artifact-staging.md`
  - approved DKG / `.charon` artifact를 rendered runtime에 stage 하는 절차와 안전 경계
- `docs/cdvn-runtime-handoff.md`
  - 현재 `infra/obol-cdvn` runtime automation 상태와 다음 작업 handoff
- `docs/repo-bootstrap.md`
  - 초기 레포 구조, 기술 스택, 개발 순서, 환경 분리 전략
- `docs/harness-bootstrap.md`
  - Harness Engineering으로 레포를 실제 생성할 때 바로 사용할 입력 가이드

## 현재 구현 상태

현재 레포는 초기 부트스트랩을 넘어서 핵심 조회 플로우와 CDVN runtime automation 진입점까지 반영된 상태다.

- `apps/web`
  - Next.js 기반 운영자 백오피스, Dashboard/Validators/Nodes/Clusters/Alerts/Deposits/Approvals/Rewards/Audit 화면
- `apps/api`
  - NestJS 기반 read API, auth stub + RBAC guard, OpenAPI 진입점
- `apps/worker`
  - health evaluation job 진입점
- `packages/db`
  - Prisma schema와 seed 데이터
- `packages/domain`
  - 도메인 타입과 운영 화면 fixture
- `packages/ui`
  - 운영 UI shell 컴포넌트
- `packages/config`
  - runtime env loader
- `packages/observability`
  - structured logger
- `infra/obol-cdvn`
  - `v1.9.5` pinned baseline mirror, `web3signer` / `observability` overlay, inventory 예시, `render/stage/verify/rollout/preflight/execute/drift-check/health-sync` 스크립트

자세한 현재 상태는 `docs/repo-guide.md`, runtime 세부 handoff는 `docs/cdvn-runtime-handoff.md`를 기준으로 본다.

## 빠른 시작

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

기본 진입점:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/v1/health`
- API docs: `http://localhost:4000/docs`
- API inventory: `http://localhost:4000/v1/inventory/validators` (nodes/clusters/signers 동일 prefix)
- API workflows: `http://localhost:4000/v1/approvals`, `http://localhost:4000/v1/deposits`, `http://localhost:4000/v1/audit-logs`
- API insights: `http://localhost:4000/v1/alerts`, `http://localhost:4000/v1/rewards`

Web이 다른 주소의 API를 사용해야 하면 `API_BASE_URL`을 설정한다. 기본값은 `http://localhost:4000`이다.

## 제품 한 줄 정의

ETH Treasury 운영자가 validator 생애주기, 노드 운영, 자산 승인, 리스크 통제, 정산 리포팅을 하나의 플랫폼에서 관리할 수 있게 하는 운영 시스템.

## 설계 원칙

- 운영 자동화와 자금 자동집행은 분리한다.
- 키 생성, 예치, 출금, slash 가능 구간은 승인 워크플로우를 반드시 거친다.
- 노드 장애는 자동 감지하고 대응하되, slash 가능 동작은 자동 실행하지 않는다.
- Obol CDVN은 runtime baseline으로 사용하고 커스텀은 overlay로 분리한다.
- signer key custody는 Web3Signer + KMS에 고정한다.
- 스테이킹 전략과 인프라 실행을 분리해 확장 가능성을 확보한다.
- 모든 민감 행위는 감사 로그와 실행 이력을 남긴다.

## 우선 구현 범위

- validator inventory
- node fleet inventory
- DVT cluster inventory and signer topology
- CDVN host baseline and DKG lifecycle tracking
- alerting and health evaluation
- reward accounting dashboard
- deposit request workflow
- approval queue
- Safe proposal export and execution tracking
- role-based access control

## 이후 확장 범위

- multi-cluster DVT lifecycle automation
- remote signer policy hardening
- Safe module / policy automation
- execution client / consensus client version rollout automation
- multi-chain staking treasury support
