# Repository Guide

## 이 레포가 한마디로 뭐냐

이 레포는 단순한 ETH validator 운영 대시보드가 아니다.

목표는 다음 두 가지를 동시에 만족하는 운영 시스템이다.

- ETH staking 운영 자동화 플랫폼
- 승인 기반 자금 집행 통제 시스템

즉, "노드와 validator 상태를 보는 툴"이 아니라 아래를 하나로 묶는 control plane에 가깝다.

- validator inventory
- node / cluster / signer inventory
- health monitoring / alerting
- DKG / deposit request 추적
- approval workflow
- Safe export
- reward accounting
- audit log

## 왜 이런 구조로 만들었냐

이 프로젝트는 일반 SaaS 백오피스와 다르게 slash risk와 자금 이동 통제를 동시에 다뤄야 한다.

그래서 설계 원칙이 분명하다.

- 운영 자동화와 자금 실행은 분리한다.
- seed, mnemonic, raw signing key는 앱 DB에 저장하지 않는다.
- slash risk가 있는 동작은 자동 실행하지 않는다.
- 위험 작업은 approval workflow를 반드시 거친다.
- 모든 주요 액션은 audit log를 남긴다.

## 이 레포가 전제로 깔고 있는 운영 방식

- DVT는 Obol Network를 사용한다.
- operator runtime baseline은 Obol `charon-distributed-validator-node`를 따른다.
- validator signing path는 Web3Signer + KMS 조합을 사용한다.
- 인프라는 4대 bare-metal operator host를 기준으로 한다.
- treasury execution account는 Safe multisig contract이며, 이를 OVM account로 취급한다.

이 말은 곧, 이 레포가 Charon 자체를 다시 만드는 게 아니라 Charon 기반 운영을 감싸는 control plane을 만드는 방향이라는 뜻이다.

## 큰 그림

### 1. Runtime Layer

실제 staking node runtime이다.

- EL
- CL
- VC
- Charon
- Web3Signer
- monitoring stack

이 영역은 `infra/obol-cdvn` 아래에서 관리한다.

핵심 생각:

- upstream CDVN을 baseline으로 둔다.
- 우리 요구사항은 overlay로 덮는다.
- baseline 자체를 크게 포크하지 않는다.

### 2. Control Plane Layer

운영자가 보는 시스템이다.

- Web Admin
- API
- Worker
- DB

이 영역이 하는 일:

- inventory 저장
- approval 생성/변경
- DKG / deposit / Safe export 이력 추적
- health snapshot 정리
- reward ledger 계산
- audit log 기록

### 3. Human Approval Layer

자동화 금지 영역을 통제한다.

- deposit request 승인
- signer binding 변경
- rollout 승인
- Safe export 승인
- DKG / add-validator 관련 위험 단계 추적

## 현재 레포 구조

### `apps/web`

운영자 백오피스다.

현재 들어간 것:

- Dashboard
- Validators
- Nodes
- Clusters
- Alerts
- Deposits
- Approvals
- Rewards
- Audit

현재 상태:

- Dashboard/Inventory/Workflow/Insight 화면이 API 조회를 우선 사용한다.
- API 호출 실패 시에는 fixture fallback으로 화면 확인이 가능하다.
- API endpoint는 `API_BASE_URL`로 분리 가능하다. (기본 `http://localhost:4000`)
- 운영형 table/panel 중심 레이아웃을 유지한다.

### `apps/api`

NestJS 기반 API다.

현재 들어간 것:

- `/v1/health`
- `/v1/auth/session`
- `/v1/auth/rbac-matrix`
- `/v1/inventory/validators`
- `/v1/inventory/nodes`
- `/v1/inventory/clusters`
- `/v1/inventory/signers`
- `/v1/approvals`
- `/v1/deposits`
- `/v1/audit-logs`
- `/v1/alerts`
- `/v1/rewards`
- `/docs` OpenAPI 진입점

현재 상태:

- Prisma 기반 read API가 inventory/workflows/insights 범위까지 연결되어 있다.
- auth stub guard + RBAC guard가 글로벌로 적용되어 권한 없는 접근은 차단된다.
- 현재는 조회 중심이며 승인 결정/예치 실행 같은 쓰기 workflow는 아직 구현 중이다.

### `apps/worker`

비동기 작업 처리기다.

현재 들어간 것:

- health evaluation job skeleton

현재 상태:

- 실제 queue 연동은 아직 없음
- worker 프로세스와 job 진입점만 준비됨

### `packages/db`

Prisma schema와 seed가 있다.

현재 모델:

- User
- OperatorHost
- Cluster
- Node
- Signer
- Validator
- TreasuryAccount
- DepositRequest
- Approval
- SafeProposal
- DkgCeremony
- RewardLedger
- AuditLog

즉, 이 레포의 핵심 도메인 모델은 이미 대략 잡혀 있다.

### `packages/domain`

공통 타입과 fixture 데이터가 있다.

현재 역할:

- 웹 화면 mock 데이터 공급
- 공통 navigation / row 타입 정의

### `packages/ui`

운영 UI shell 컴포넌트다.

현재 역할:

- `Panel`
- `StatusBadge`
- `MetricStrip`
- `DataTable`

### `packages/config`

런타임 env loader다.

현재 역할:

- zod 기반 env parsing
- local placeholder 기본값 제공

### `packages/observability`

구조화 로그 유틸이다.

현재 역할:

- service 단위 JSON logger

### `infra/obol-cdvn`

CDVN runtime baseline / overlay / deployment automation 레이어다.

구성:

- `baseline/`
  - pinned upstream mirror
  - `VERSION`
- `overlays/web3signer/`
- `overlays/observability/`
- `inventory/`
- `scripts/`

현재 상태:

- Obol `charon-distributed-validator-node` baseline이 pinning 되어 있다.
- upstream mirror는 `infra/obol-cdvn/baseline/upstream/` 아래에 보관된다.
- `web3signer`, `observability` overlay가 분리되어 있다.
- cluster / host inventory 예시가 있다.
- host-aware `render.sh`가 있다.
- `render.sh`, `stage-charon-artifacts.sh`, `verify-baseline.sh`, `verify.sh`, `rollout.sh`, `host-preflight.sh`, `rollout-exec.sh`, `drift-check.sh`, `health-sync.sh`가 있다.
- 현재는 runtime 산출물 생성, approved `.charon` artifact stage, rsync 기반 rollout dry-run / execute, host preflight dry-run / execute, 원격 compose 실행 dry-run / execute까지 가능하다.
- 다만 rollback, 실운영 inventory 파일 분리, Web3Signer/KMS 실연동, control plane approval 연동은 아직 없다.

## 지금 구현된 수준을 현실적으로 말하면

이 레포는 "초기 부트스트랩 + 핵심 조회 플로우 + CDVN runtime automation 진입점"까지 온 상태다.

된 것:

- monorepo 구조 생성
- auth stub + RBAC 모델 연결
- validators / nodes / clusters / signers API
- approvals / deposits / audit-logs API
- alerts / rewards API
- web의 주요 운영 화면을 API 기반으로 연결
- Prisma schema + seed + 조회 모델 정리
- CDVN baseline pinning + upstream mirror 정리
- CDVN overlay 분리
- host-aware render / `.charon` artifact stage / verify / rollout / host preflight / rollout execute / drift-check / health-sync script 추가
- 기본 문서 체계 정리
- typecheck / build 통과

아직 안 된 것:

- queue / Redis
- health ingestion pipeline 실제 구현
- alert evaluator / ack workflow 확장
- approval 결정(approve/reject) write workflow
- deposit request create/validate/export workflow
- Safe proposal payload 생성/추적 write workflow
- CDVN 실운영 inventory 파일 분리
- Web3Signer/KMS 실연동 정보 반영
- rollback 전략
- health-sync / approval를 control plane API와 실제 연결
- shell script smoke test / CI 편입

즉, 지금은 "운영 가시성(read)까지는 연결됐고, 실행/승인(write) 자동화가 다음 단계"라고 보면 된다.

## 로컬에서 어떻게 시작하나

사전 조건:

- Node.js 20+
- pnpm 10+
- PostgreSQL (기본 `postgresql://postgres:postgres@localhost:5432/eth_staking_automation?schema=public`)

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

기본 진입점(개발 서버 실행 후):

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/v1/health`
- API docs: `http://localhost:4000/docs`
- API auth: `http://localhost:4000/v1/auth/session`
- API inventory: `http://localhost:4000/v1/inventory/validators`
- API workflows: `http://localhost:4000/v1/approvals`, `http://localhost:4000/v1/deposits`, `http://localhost:4000/v1/audit-logs`
- API insights: `http://localhost:4000/v1/alerts`, `http://localhost:4000/v1/rewards`

주의:

- `db:push`는 PostgreSQL이 있어야 한다.
- web은 API 실패 시 fixture fallback이 있으나, 정상 동작 검증은 DB+API를 함께 띄운 상태에서 진행한다.
- Prisma client는 `packages/db/src/generated/prisma`로 로컬 생성된다.
- 다른 API 주소를 붙일 때는 web 환경변수 `API_BASE_URL`을 사용한다.

권한 흐름까지 확인하려면:

```bash
curl -s http://localhost:4000/v1/auth/session | jq

curl -s \
  -H "x-eth-user-role: ADMIN" \
  http://localhost:4000/v1/auth/rbac-matrix | jq

curl -i -s \
  -H "x-eth-user-role: INFRA_OPERATOR" \
  http://localhost:4000/v1/rewards
```

마지막 호출은 권한 부족이면 `403`이 나와야 정상이다.

## 이 레포를 이해할 때 추천 읽기 순서

전체 문서 순서는 `docs/reading-order.md`를 기준으로 본다.

구현자 관점에서 바로 들어가려면 아래 순서가 실용적이다.

1. `docs/repo-guide.md`
2. `docs/architecture.md`
3. `docs/cdvn-baseline.md`
4. `docs/cdvn-artifact-staging.md`
5. `docs/cdvn-runtime-handoff.md`
6. `docs/repo-bootstrap.md`
7. `packages/db/prisma/schema.prisma`

## 중요한 오해 방지

### 이 레포는 staking client 자체인가

아니다.

Charon, EL, CL, Web3Signer 자체를 구현하는 레포가 아니다.
그 위에 붙는 운영 control plane 레포다.

### 이 레포가 deposit를 자동 실행하나

아니다.

이 레포는 request, approval, export, tracking까지를 담당한다.
direct execution은 기본 목표가 아니다.

### 이 레포가 키를 저장하나

아니다.

validator signing key raw material을 앱 DB에 저장하지 않는 것이 전제다.

### 지금 당장 운영 가능한가

아직 아니다.

현재는 production-grade 방향을 가진 초기 제품 상태다.
실제 운영에 쓰려면 실인증 연동, 승인/예치 write workflow 완성, queue 기반 health/alert 자동화, CDVN rollout execution / preflight / approval 연동, 운영 observability 고도화가 더 필요하다.

## 다음으로 뭘 구현하면 되나

우선순위는 이 순서가 맞다.

1. health ingestion pipeline + worker/Redis 연동
2. alert center 규칙/ack/write workflow 구현
3. approval decide(approve/reject) API + audit log write 강화
4. deposit request create/validate/export API 구현
5. Safe wallet proposal integration adapter 연결
6. `infra/obol-cdvn` 실운영화: 실제 `cluster.yml`, `hosts.yml` 분리, Web3Signer/KMS 실연동 값 정리, rollback / stop rule / required env policy 추가, `health-sync.sh`와 rollout approval의 control plane 연동

## 아주 짧은 결론

이 레포는 "Obol DVT + Web3Signer/KMS + Safe approval flow"를 운영하기 위한 ETH staking control plane 초기 제품이다.

지금은 운영용 제품의 뼈대까지는 만들어졌고, 실제 동작하는 업무 기능은 이제 채워 넣어야 한다.

