# Architecture

## 아키텍처 목표

이 시스템은 스테이킹 운영 플랫폼이면서 동시에 승인 통제 시스템이다. 따라서 일반적인 SaaS 백오피스 구조에 다음 요구가 추가된다.

- slash risk 구간 보호
- treasury approval flow
- infra observability
- validator lifecycle tracking

## 상위 구조

```text
[Web Admin]
    |
    v
[API Gateway / App API]
    |
    +--> [Auth & RBAC]
    +--> [Validator Service]
    +--> [Node Inventory Service]
    +--> [DVT Cluster Service]
    +--> [Signer Service]
    +--> [Health Service]
    +--> [Approval Service]
    +--> [Deposit Workflow Service]
    +--> [Treasury Execution Service]
    +--> [Reward Accounting Service]
    +--> [Audit Log Service]
    |
    +--> [PostgreSQL]
    +--> [Redis / Queue]
    +--> [Object Storage]
    +--> [Safe / OVM Account]
    +--> [Web3Signer]
    +--> [KMS]
    +--> [Obol / Charon]
    |
    +--> [Worker]
            +--> metrics ingestion
            +--> reward aggregation
            +--> alert evaluation
            +--> payload export jobs
            +--> bare-metal rollout jobs
            +--> external integrations
```

## 운영 토폴로지

- 4대 bare-metal operator host를 고정된 기본 토폴로지로 사용한다.
- 각 host는 Obol `charon-distributed-validator-node` baseline을 기준으로 EL, CL, VC, Charon, monitoring workload를 동일한 자동화 경로로 배포한다.
- validator client 서명은 Web3Signer를 통해 수행하고 key material 보호는 KMS가 담당한다.
- treasury execution account는 Safe multisig contract이며, 이 contract를 OVM account로 취급한다.

## CDVN Baseline 채택 원칙

- `charon-distributed-validator-node`는 operator runtime baseline으로 사용한다.
- 우리 시스템은 CDVN upstream을 재작성하지 않고 pinned baseline + overlay 방식으로 확장한다.
- DKG ceremony, add-validator, cluster-lock artifact 흐름은 Charon 표준 절차를 따른다.
- inventory, approval, audit, Safe export, reporting은 control plane에서 담당한다.

## 현재 CDVN Runtime Automation 상태

- baseline mirror는 `infra/obol-cdvn/baseline/upstream/` 아래에 `v1.9.5`로 pinning 되어 있다.
- overlay는 현재 `web3signer`, `observability` 두 가지가 분리되어 있다.
- inventory 예시는 cluster / host 단위 YAML로 분리되어 있다.
- `infra/obol-cdvn/scripts/render.sh`는 cluster/host inventory 기반 host-aware render를 수행한다.
- `stage-charon-artifacts.sh`, `verify-baseline.sh`, `verify.sh`, `rollout.sh`, `host-preflight.sh`, `rollout-exec.sh`, `drift-check.sh`, `health-sync.sh`가 runtime automation 진입점으로 추가되어 있다.
- 현재는 rendered runtime 검증, approved `.charon` artifact stage, rsync 기반 rollout, host preflight, remote compose execution까지 가능하고, rollback / control plane direct integration은 남아 있다.

## 서비스 경계

### Web Admin

역할

- 운영자 화면
- 승인자 화면
- 재무 리포트 화면
- 감사 로그 조회
- DVT cluster, signer, Safe 상태 조회

기술 방향

- Next.js
- App Router
- server actions는 제한적으로 사용
- 실질 비즈니스 로직은 API 레이어에 둔다

### API

역할

- 인증, 권한 검증
- 도메인 모델 접근
- 승인 프로세스 실행
- 외부 연동 API 제공
- DVT cluster inventory, signer registry, Safe proposal export

기술 방향

- NestJS 또는 Fastify 기반 TypeScript API
- OpenAPI 문서화
- Zod 또는 class-validator 기반 입력 검증

### Worker

역할

- 외부 메트릭 수집
- reward batch 계산
- 알림 발송
- approval action 후속 처리
- CDVN baseline render, bare-metal rollout, config render
- Obol / Charon 및 Web3Signer health sync

기술 방향

- BullMQ 또는 Temporal 중 하나 선택
- MVP는 BullMQ로 시작 가능

## 주요 도메인 모델

### Validator

- id
- publicKey
- index
- network
- status
- strategyType
- ownerEntity
- feeRecipient
- withdrawalTarget
- signerType
- clusterId
- nodeBindings
- createdAt
- archivedAt

### Node

- id
- role
- provider
- region
- hostName
- clientType
- clientVersion
- endpointMetadata
- healthStatus
- lastHeartbeatAt

### Cluster

- id
- type
- baselineVersion
- overlayVersion
- obolClusterId
- threshold
- operatorCount
- operatorHosts
- network
- charonEnrs
- relayMode
- signerMode

### Signer

- id
- type
- provider
- web3signerUrl
- kmsKeyRef
- keyAlias
- healthStatus
- lastSyncAt

### TreasuryAccount

- id
- type
- network
- safeAddress
- chainId
- label
- isOvmAccount

### DepositRequest

- id
- network
- ownerEntity
- validatorCount
- depositDataObjectKey
- validationStatus
- approvalStatus
- executionStatus
- exportedPayloadObjectKey

### Approval

- id
- resourceType
- resourceId
- policyType
- currentStep
- finalStatus
- requestedBy
- approvedBy
- rejectedBy

### RewardLedger

- id
- validatorId
- periodStart
- periodEnd
- consensusReward
- executionReward
- mevReward
- penalties
- infraCostAllocated
- netReward

### AuditLog

- id
- actorId
- actionType
- resourceType
- resourceId
- diff
- createdAt

## 데이터 흐름

### 노드 상태 수집

```text
Node / Metrics Endpoint
    -> Worker Ingestion
    -> Health Normalizer
    -> PostgreSQL snapshots
    -> Alert Evaluator
    -> Notification Router
```

### DVT 클러스터 배치

```text
Desired cluster topology
    -> CDVN baseline render
    -> overlay merge
    -> 4 bare-metal host rollout
    -> charon peer connect
    -> web3signer binding verify
    -> cluster health snapshot
```

### 신규 validator 요청

```text
Operator creates request
    -> deposit data upload
    -> validation job
    -> approval workflow created
    -> approver review
    -> DKG / add-validator ceremony tracked
    -> approved
    -> export Safe / signing payload
    -> Safe multisig review
    -> external execution tracked
```

### reward 집계

```text
Beacon / Execution / Internal sources
    -> batch collector
    -> normalization
    -> validator ledger
    -> strategy aggregation
    -> dashboard materialization
```

## 보안 원칙

### 키 관리

애플리케이션은 seed 또는 mnemonic을 저장하지 않는다.

가능한 구조

- 외부 signer 사용
- HSM 또는 별도 custody 시스템 사용
- export only payload 패턴 사용
- validator client signing key는 Web3Signer + KMS 조합으로만 보관

### 인프라 일관성

- 4대 bare-metal host는 동일한 자동화 경로와 동일한 baseline을 사용한다.
- 수동 snowflake 서버를 허용하지 않는다.
- baseline 변경은 upstream version pin 또는 overlay patch 단위로만 허용한다.

### 승인 정책

위험 작업은 approval policy를 거친다.

예시

- deposit request approval
- fee recipient bulk change
- signer registration
- node failover request
- DVT cluster membership change

### slash protection 관련

애플리케이션은 다음 안전 원칙을 강제해야 한다.

- 동일 validator에 대한 중복 활성화 금지
- failover action은 explicit approval 요구
- signer binding 변경 시 기존 binding 확인
- emergency 모드는 별도 권한 필요
- DVT operator reassignment는 approval과 pre-check를 모두 요구

## 저장소 선택

### PostgreSQL

용도

- 도메인 데이터 저장
- 승인 상태 저장
- 감사 로그 저장

### Redis

용도

- 큐
- rate limit
- 단기 상태 캐시

### Object Storage

용도

- deposit data 원본
- export payload
- 대량 리포트 파일

## 외부 연동 포인트

- beacon node APIs
- execution client APIs
- prometheus endpoints
- Obol APIs / Charon peers
- Slack
- email
- Web3Signer
- KMS provider
- Safe transaction builder or export layer
- DVT orchestration adapter
- CDVN upstream assets

## 권장 기술 스택

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand 또는 React Context 최소 사용

### Backend

- NestJS 또는 Fastify
- Prisma
- PostgreSQL
- Redis
- BullMQ

### Operator Runtime Baseline

- Obol `charon-distributed-validator-node`
- Docker Compose

### Observability

- OpenTelemetry
- structured logging
- Prometheus metrics
- Grafana

## 화면 구성

### Dashboard

- global fleet summary
- network summary
- critical alerts
- validator health summary
- reward summary

### Validators

- 목록
- 상세 패널
- performance timeline
- policy bindings

### Nodes

- host 상태
- client 상태
- region/provider 분포
- sync 상태

### Deposits

- request list
- validation 결과
- approval status
- export history

### Rewards

- period summary
- strategy summary
- validator detail
- cost adjusted net yield

### Audit

- actor 기준 필터
- resource 기준 필터
- action type 기준 필터

## MVP 구현 순서

아래 목록은 설계상 권장 순서다. 현재 레포에는 monorepo 초기화, auth/RBAC, core schema, inventory 조회 API/UI, CDVN baseline mirror/overlay, bare-metal rollout baseline이 이미 반영되어 있다.

- monorepo scaffold
- auth and RBAC
- core schema
- validator, node, cluster, signer inventory CRUD
- CDVN baseline mirror and overlay structure
- bare-metal host inventory and rollout baseline
- node inventory and heartbeat
- health ingestion
- alert center
- approval workflow
- deposit request flow and Safe export
- reward ledger batch
- audit trail polish

## 향후 확장

- multi-cluster orchestration
- signer policy hardening
- Safe module automation
- rollout policy engine
- restaking position tracking
