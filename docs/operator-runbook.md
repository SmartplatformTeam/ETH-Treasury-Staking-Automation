# Operator Runbook

이 문서는 **현재 운영 중인 control plane 을 사용하는 사람**(operator + system administrator) 의 작업 절차를 담는다. 아키텍처 / 설계 배경은 [docs/README.md](README.md), 변경 history 는 [docs/CHANGELOG.md](CHANGELOG.md) 참조.

> 살아있는 문서 — 사용자 시점 변경이 발생하는 phase 마다 같이 갱신.

## 목차

- [1. 시스템 한눈에](#1-시스템-한눈에)
- [2. 역할과 권한](#2-역할과-권한)
- [3. 페이지별 사용법](#3-페이지별-사용법)
- [4. 주요 시나리오](#4-주요-시나리오)
- [5. API / curl](#5-api--curl)
- [6. 시스템 관리자 운용](#6-시스템-관리자-운용)
- [7. 트러블슈팅](#7-트러블슈팅)
- [8. 알려진 함정 / 코드 패턴](#8-알려진-함정--코드-패턴)

---

## 1. 시스템 한눈에

```
┌────────────────────────────────────────────────────────────┐
│  팀 서버 192.168.13.64 (smartplatform 계정)                 │
│  ──────────────────────────────────────────────────────────  │
│  Docker compose project: eth-staking-control-plane           │
│                                                              │
│   postgres  ─── 상태 저장                                    │
│   api       ─── NestJS, RBAC, /v1/* endpoint   :4000        │
│   worker    ─── 비콘 폴링 + health 평가                       │
│   web       ─── Next.js 운영자 화면              :3005        │
│                                                              │
│   (별도 운영 중, 자동화 무관)                                  │
│   node0~3-charon, vc-*, web3signer-*, lighthouse,           │
│   mev-boost, prometheus, grafana                            │
└────────────────────────────────────────────────────────────┘
```

| 접속 | URL |
|---|---|
| 운영자 화면 | http://192.168.13.64:3005 |
| API Swagger | http://192.168.13.64:4000/docs |
| API root | http://192.168.13.64:4000/v1 |

**격리 원칙** — 자동화는 `team-sandbox-obol-a` 클러스터 + `operator-sandbox-1` 호스트만 건드린다. 기존 obol 운영(node0~3, web3signer 등) 은 자동화 경로 밖.

---

## 2. 역할과 권한

| 역할 | stub email | 주요 능력 |
|---|---|---|
| **ADMIN** | admin@treasury.example | 모든 작업 |
| **INFRA_OPERATOR** | infra.operator@treasury.example | 자동화 실행, ROLLOUT 류 approval 생성. 결정 권한 없음 |
| **TREASURY_OPERATOR** | treasury.operator@treasury.example | DEPOSIT_REQUEST approval 생성, Safe export 준비 |
| **APPROVER** | approver.1@treasury.example | approval approve/reject 만 |
| **FINANCE_REVIEWER** | finance.reviewer@treasury.example | read-only (reward 포함) |
| **AUDITOR** | auditor@treasury.example | read-only (audit log 포함) |

### 인증 (stub)

production 진짜 인증 도입 전까지 stub mode. 다음 헤더로 누구든 흉내 가능:

```
x-eth-user-email: <stub email 또는 임의 이메일>
x-eth-user-role:  <UserRole — email 만 보내면 자동 매칭>
x-eth-user-name:  <표시 이름 (선택)>
```

Web UI 는 브라우저 헤더 주입을 위해 별도 도구가 필요(예: `ModHeader` 익스텐션, 또는 reverse-proxy). curl 은 헤더로 직접.

### 4-eyes 원칙

- 같은 사람이 자기가 만든 approval 을 결정할 수 없음 (`requester == approver` 이면 403, **ADMIN 포함**)
- 이미 결정된 approval 은 다시 결정 불가 (409)
- Reject 시 사유 필수 (AuditLog.diff 에 기록)

---

## 3. 페이지별 사용법

### `/` 대시보드
- validator/노드/cluster/signer 요약 메트릭 + 최근 alert. 읽기만.

### `/inventory/clusters`, `/inventory/nodes`, `/inventory/signers`
- 인벤토리 목록. 검색/필터 없음. fixture 와 실데이터 섞여 있을 수 있음.

### `/validators`
- Hoodi network validator 실데이터. balance/effective balance/beacon status/마지막 sync 시각.
- 5분 주기 worker `beacon_sync_tick` 으로 갱신.

### `/automation` (INFRA_OPERATOR / ADMIN 만 form 보임)
**상단 form** — Run Automation
1. **Cluster** dropdown (sandbox / mainnet)
2. **Operator Host** dropdown (cascade — 선택한 cluster 소속만)
3. **Operation** dropdown — safe / execute / dry-run 별 라벨
4. (execute op 일 때만) **Matching Approval** dropdown:
   - 이미 APPROVED 된 같은 cluster+host+operation approval 만 채워짐
   - 매칭 없으면 inline 안내 + `→ Create one in /approvals (form prefilled)` 링크
5. **[RUN]** 버튼

**하단 패널** — Recent Runs / Run Detail
- 25개 최근 run 목록 (status badge). 행 클릭 → 같은 페이지 우측에 stdout/stderr 이벤트.

**Operation 의미 빠른 참조**:
- `VERIFY_BASELINE`, `RENDER_RUNTIME`, `VERIFY_RUNTIME`, `ROLLOUT_DRY_RUN`, `STAGE_ARTIFACTS_DRY_RUN`, `COMPOSE_DRY_RUN`, `PREFLIGHT_HOST`, `DEPLOYED_VERIFY`, `HEALTH_SYNC_DRY_RUN` → **safe**, approval 불필요
- `ROLLOUT_EXECUTE`, `STAGE_ARTIFACTS_EXECUTE`, `COMPOSE_EXECUTE`, `FULL_OPERATOR_MVP` → **execute**, ROLLOUT 또는 CHARON_ARTIFACT_STAGE policy approval 필수
- `BOOTSTRAP_HOST` → admin prepare (dryRun=false 지만 approval 불필요)

### `/approvals`
**상단 inline 생성 form** (권한 있는 role 만 트리거 보임)
- `policyType` 선택 → 조건부 필드
  - ROLLOUT: cluster + host + operation (cascade)
  - DEPOSIT_REQUEST: deposit request 선택
- `[CREATE APPROVAL]` → 새 approval REQUESTED 상태로 생성

**Approval Queue** 테이블
- resource / policy / status / requested by / decided by
- 행 클릭 → `/approvals/[id]` 상세

### `/approvals/[id]`
- 메타: resource, policy, status, requester, cluster/host/operation, 시각
- (APPROVER / ADMIN 만) **Decision** 패널: `[APPROVE]` 버튼 + reject reason textarea + `[REJECT]` 버튼
- **Audit Trail** — 이 approval 관련 audit log 만

### `/deposits` (TREASURY_OPERATOR / ADMIN 만 form 보임)
**상단 inline 생성 form** — network 선택 → cluster/treasury cascade → pubkey/wc/sig/root hex paste → `[Create Deposit Request]` → 자동 approval 동반 생성
**테이블** — request / policy / status / requestedBy / exportTarget. 행 클릭 → `/deposits/[id]`

### `/deposits/[id]`
- 메타: requestNumber, network, owner, validation/approval/execution status, cluster, treasury safe, safe proposal, safeTxHash
- (TREASURY_OPERATOR/ADMIN) **Actions** 패널: 상태별 `[Export Safe Payload]` / `[Mark Submitted]` / `[Cancel]`
- **Safe Tx Payload** 패널 — payload JSON `<pre>` (복사해서 Safe UI 에 import)
- **Audit Trail** — DEPOSIT_REQUEST_CREATED / SAFE_PAYLOAD_EXPORTED / SAFE_PROPOSAL_SUBMITTED 이력

### `/alerts`
- 실 unhealthy Node/OperatorHost/Signer 합성 표시 (`severity: WARNING|CRITICAL`)
- worker health-evaluator 가 1분 주기로 healthStatus 갱신
- 모든 게 HEALTHY 면 fixture fallback (P2.6 이후 거의 안 보임)

### `/audit`
- 전체 AuditLog (`APPROVAL_APPROVED`, `AUTOMATION_RUN_CREATED`, …)

### `/rewards`
- 월간 reward ledger (현재 fixture)

---

## 4. 주요 시나리오

### 4.1 일상 점검 (운영자, 매일)
1. `/` 대시보드 → 메트릭 + 최근 alert 훑기
2. `/alerts` → WARNING/CRITICAL 항목 클릭해 어떤 Node/Host 인지 확인
3. `/validators` → Hoodi validator 의 lastSyncedAt 가 5분 내인지

### 4.2 sandbox rollout 한 사이클 (INFRA_OPERATOR → APPROVER → INFRA_OPERATOR)

```
[1] INFRA_OPERATOR 로 /automation 진입
    → Cluster=team-sandbox-obol-a, Host=operator-sandbox-1, Op=ROLLOUT_DRY_RUN
    → [RUN] → SUCCEEDED 확인. 변경 예정 파일 목록을 Run Detail 에서 확인.

[2] 같은 화면에서 Op=ROLLOUT_EXECUTE 로 변경
    → "Matching Approval" 박스: "No APPROVED ROLLOUT approval matches..."
    → "→ Create one in /approvals (form prefilled)" 링크 클릭

[3] /approvals 자동 expand + 값 채워진 폼
    → [CREATE APPROVAL] → REQUESTED 행 생성, /approvals 페이지 복귀

[4] (APPROVER 로 전환) /approvals 의 REQUESTED 행 클릭
    → /approvals/[id] 상세 페이지
    → 내용 확인 후 [APPROVE]
    → status → APPROVED, AUDIT TRAIL 에 APPROVAL_APPROVED 한 줄 추가

[5] (INFRA_OPERATOR 로 복귀) /automation 새로고침
    → Matching Approval dropdown 에 새 항목 등장
    → 선택 → [RUN] → run QUEUED → RUNNING → SUCCEEDED
    → Run Detail 에서 rsync 결과 확인
```

### 4.3 approval reject (APPROVER)
1. `/approvals` 목록 → REQUESTED 행 클릭
2. `/approvals/[id]` 에서 reject reason textarea 채움 (필수)
3. `[REJECT]` → REJECTED 처리. `/audit` 에 `APPROVAL_REJECTED` 가 reason JSON 포함해 기록.

### 4.4 자금 집행 한 사이클 (TREASURY_OPERATOR → APPROVER → TREASURY_OPERATOR + Safe UI)

```
[1] TREASURY_OPERATOR /deposits → [+ New Deposit Request]
    network=HOODI, ownerEntity, cluster=sandbox, treasury=sandbox safe
    pubkey/wc/signature/deposit_data_root 4개 hex paste
    [Create Deposit Request]
    → 새 deposit row + 자동 DEPOSIT_REQUEST approval REQUESTED 생성

[2] APPROVER /approvals → REQUESTED 행 클릭 → /approvals/[id]
    [APPROVE] → APPROVED, AUDIT TRAIL APPROVAL_APPROVED

[3] TREASURY_OPERATOR /deposits/[id]
    "Safe Wallet Nonce" 입력 (Safe Web UI 에서 현재 nonce 확인 후)
    [Export Safe Payload]
    → SafeProposal 생성, payload JSON 페이지에 표시

[4] (사람 작업) Safe Web UI 열기 → Safe Tx Service "import JSON" 사용
    → 다운로드한 payload paste → 멀티시그 서명자들이 차례로 서명 → 실행

[5] TREASURY_OPERATOR /deposits/[id]
    Safe Web UI 에서 받은 safeTxHash 입력
    [Mark Submitted]
    → executionStatus=SUBMITTED, SafeProposal.status=QUEUED

[6] (validator activation 자동 감지는 follow-up — 운영자가 수동 monitor)
```

### 4.5 알림 발생 시 (운영자)
1. `/alerts` 에서 WARNING/CRITICAL 본문 확인. 예: "node health degraded — team-sandbox-obol-a/lighthouse"
2. **확인 채널**:
   - 팀 서버의 lighthouse 컨테이너 상태 (옆 docker ps)
   - Beacon /eth/v1/node/syncing 의 sync_distance / is_optimistic
3. 일시적이면 1–2 cycle 대기. 지속되면 admin 에게 ping.

---

## 5. API / curl

### 5.1 Swagger 로 모든 endpoint 확인
- http://192.168.13.64:4000/docs

### 5.2 자주 쓰는 호출

```bash
HOST=http://192.168.13.64:4000
EMAIL=admin@treasury.example

# 클러스터/호스트 id 확인
curl -s -H "x-eth-user-email: $EMAIL" $HOST/v1/inventory/clusters | jq '.items[] | {id,name}'
curl -s -H "x-eth-user-email: $EMAIL" $HOST/v1/inventory/hosts    | jq '.items[] | {id,name,clusterId}'

# approval 목록 (필터)
curl -s -H "x-eth-user-email: $EMAIL" \
  "$HOST/v1/approvals?status=APPROVED&policyType=ROLLOUT&clusterId=...&hostId=...&automationOperation=ROLLOUT_EXECUTE"

# approval 생성 (ROLLOUT, INFRA_OPERATOR)
curl -s -X POST -H "x-eth-user-email: infra.operator@treasury.example" \
  -H "Content-Type: application/json" \
  -d '{"policyType":"ROLLOUT","clusterId":"...","hostId":"...","automationOperation":"ROLLOUT_EXECUTE"}' \
  $HOST/v1/approvals

# approve (APPROVER)
curl -s -X POST -H "x-eth-user-email: approver.1@treasury.example" \
  $HOST/v1/approvals/<id>/approve

# reject (APPROVER, reason 필수)
curl -s -X POST -H "x-eth-user-email: approver.1@treasury.example" \
  -H "Content-Type: application/json" \
  -d '{"reason":"sandbox rollout not needed this week"}' \
  $HOST/v1/approvals/<id>/reject

# 자동화 run 생성 (INFRA_OPERATOR, execute → approvalId 필수)
curl -s -X POST -H "x-eth-user-email: infra.operator@treasury.example" \
  -H "Content-Type: application/json" \
  -d '{"operation":"ROLLOUT_EXECUTE","clusterId":"...","hostId":"...","dryRun":false,"approvalId":"...","extraVars":{"cluster_name":"team-sandbox-obol-a","host_name":"operator-sandbox-1"}}' \
  $HOST/v1/automation/runs

# run 취소
curl -s -X POST -H "x-eth-user-email: infra.operator@treasury.example" \
  $HOST/v1/automation/runs/<runId>/cancel

# audit log (filter 가능)
curl -s -H "x-eth-user-email: auditor@treasury.example" \
  "$HOST/v1/audit-logs?actionType=APPROVAL_APPROVED&resourceType=Approval&limit=10"
```

---

## 6. 시스템 관리자 운용

### 6.1 배포 (코드 변경 반영)

```bash
cd /Users/ethan/Desktop/eth-treasury-staking-automation/.claude/worktrees/strange-keller-a47fa3
export ANSIBLE_CONFIG=infra/ansible/ansible.cfg
ansible-playbook \
  -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  infra/ansible/playbooks/team-server-mvp.yml \
  --ask-become-pass
```

자동 실행되는 것:
- 도커 이미지 rebuild
- `prisma db push` (schema 변경 반영)
- `pnpm db:seed` (seed 적용 — sandbox approval fixture 도 재설정됨)
- 컨테이너 재시작 (api, worker, web)

### 6.2 SSH 접근
```bash
ssh smartplatform@192.168.13.64
```
SSH key 인증 (`~/.ssh/id_ed25519` → `team-server-admin`). 평문 password 사용 금지 (memory: 비밀번호 절대 평문 기록 금지).

### 6.3 DB 직접 조회

```bash
ssh smartplatform@192.168.13.64 \
  'docker exec eth-staking-control-plane-postgres-1 psql -U eth_staking_app -d eth_staking_automation -c "<SQL>"'
```

자주 쓰는 쿼리:
```sql
-- approval 전체
SELECT id, "resourceType", "policyType", "finalStatus", "automationOperation" FROM "Approval";

-- 최근 NodeHealthSnapshot
SELECT n.name, s."beaconHealth", s."syncDistance", s."capturedAt"
FROM "NodeHealthSnapshot" s JOIN "Node" n ON n.id=s."nodeId"
ORDER BY s."capturedAt" DESC LIMIT 10;

-- AutomationRun 상태
SELECT id, operation, status, "dryRun", "createdAt"
FROM "AutomationRun" ORDER BY "createdAt" DESC LIMIT 10;
```

### 6.4 컨테이너 재시작 (개별)

```bash
ssh smartplatform@192.168.13.64 'docker restart eth-staking-control-plane-api-1'
ssh smartplatform@192.168.13.64 'docker restart eth-staking-control-plane-worker-1'
ssh smartplatform@192.168.13.64 'docker restart eth-staking-control-plane-web-1'
```

### 6.5 컨테이너 로그

```bash
# 최근 60초
ssh smartplatform@192.168.13.64 'docker logs --since 60s eth-staking-control-plane-api-1'
ssh smartplatform@192.168.13.64 'docker logs --since 60s eth-staking-control-plane-worker-1'
ssh smartplatform@192.168.13.64 'docker logs --since 60s eth-staking-control-plane-web-1'

# 에러만
ssh smartplatform@192.168.13.64 \
  'docker logs --since 5m eth-staking-control-plane-worker-1 2>&1 | grep -iE "error|⨯"'
```

### 6.6 worker tick 확인
worker 로그에 매 1분/5분 다음 JSON 줄이 떠야 정상:
```
{"level":"info","message":"health_evaluation_tick","candidateNodes":1,"succeeded":1,"failed":0,"hostsUpdated":1}
{"level":"info","message":"beacon_sync_tick","total":...,"synced":...,"notFound":...,"failed":...}
```

---

## 7. 트러블슈팅

### 7.1 페이지가 fixture 데이터 표시
**증상**: `/alerts` 가 `execution client volume above 78%` 같은 placeholder.

**원인**: 1) 모든 Node/Host 가 HEALTHY 라 진짜 unhealthy 없음 (정상). 2) API 가 500 throw → web fallback. 3) worker 가 안 도는 중.

**확인**:
```bash
curl -s -H "x-eth-user-email: admin@treasury.example" http://192.168.13.64:4000/v1/alerts
# 200 + 빈 items[]  → 정상 (모두 HEALTHY)
# 500              → API 버그 (7.2 참조)
```

### 7.2 `/v1/<무엇이든>` 가 500

**증상**: API 가 모든 요청에 500 반환. web logs 에 아무 에러 없음.

**원인 1 — NestJS DI 버그** (Phase 2-3 / 2-6 에서 두 번 발생):
- 해당 컨트롤러의 `constructor(private readonly xxxService: XxxService) {}` 가 `@Inject(XxxService)` 없이 정의되어 있으면 tsup 빌드 결과의 `design:paramtypes` 가 비어서 DI 실패.

**확인**:
```bash
ssh smartplatform@192.168.13.64 \
  'docker logs eth-staking-control-plane-api-1 2>&1 | head -3'
# api_booted 만 있고 더 이상 없으면 NestJS 가 silent failed (logger:false 라)
```

**임시 hotfix** (개발 머신에서):
```bash
cd <worktree>
# 해당 controller 에 @Inject(Service) 추가
pnpm --filter @eth-staking/api build
scp apps/api/dist/main.js smartplatform@192.168.13.64:/tmp/main.js
ssh smartplatform@192.168.13.64 'docker cp /tmp/main.js eth-staking-control-plane-api-1:/app/apps/api/dist/main.js && docker restart eth-staking-control-plane-api-1'
```
영구 fix 는 [§8.2](#82-nestjs-di-는-항상-injectservice-명시) 참조.

**원인 2 — Prisma schema 미동기**:
배포가 실패해서 db push 가 안 된 경우. `psql \dt` 로 테이블 존재 확인.

### 7.3 `/approvals` 가 500 with `'use server'` 에러

**증상**: web log 에 `A "use server" file can only export async functions, found object`.

**원인**: server action 파일이 async 함수 외에 상수/타입 export.

**fix**: 상수는 별도 모듈 (예: `action-state.ts`). [§8.1](#81-use-server-파일은-async-함수만-export) 참조.

### 7.4 worker 가 안 돌고 있음

**증상**: `/alerts` 가 fixture, `/validators` 의 balance 가 오래된 값.

**확인**:
```bash
ssh smartplatform@192.168.13.64 'docker ps | grep worker'
# Up X minutes 인지 확인

ssh smartplatform@192.168.13.64 'docker logs --tail 30 eth-staking-control-plane-worker-1'
# 마지막 *_tick 시각 확인
```

**조치**: `docker restart eth-staking-control-plane-worker-1`

### 7.5 자동화 run 이 RUNNING 에서 멈춤

**원인**: ansible-playbook child process 가 죽었거나 응답 없음. Phase 1 에서 `STALE` marker 가 follow-up 으로 남아있음 (아직 미구현).

**조치**: `/automation` 에서 cancel 또는 직접 SQL update:
```sql
UPDATE "AutomationRun" SET status='CANCELLED' WHERE id='<runId>';
```

### 7.6 approval 생성/결정 후 페이지가 갱신 안 됨

**원인**: server action 의 `revalidatePath` 이 미동작 또는 브라우저 캐시.

**조치**: 페이지 새로고침 (Cmd+R / Ctrl+R).

---

## 8. 알려진 함정 / 코드 패턴

### 8.1 `'use server'` 파일은 async 함수만 export
Next.js 15 규칙. 상수/타입을 같은 파일에서 export 하면 production build 에서 `A "use server" file can only export async functions` throw.

**패턴**:
- `actions.ts` (`'use server'`) — async 함수만
- `action-state.ts` — 타입/상수
- client component 에서 둘 다 import

### 8.2 NestJS DI 는 항상 `@Inject(Service)` 명시
tsup/esbuild 가 `emitDecoratorMetadata` 를 emit 못해서 자동 DI 실패. 다음 두 패턴이 다르게 동작:

```ts
// BAD — tsup 빌드 후 this.xxxService === undefined → 500
constructor(private readonly xxxService: XxxService) {}

// GOOD
constructor(@Inject(XxxService) private readonly xxxService: XxxService) {}
```

**새 컨트롤러 / Service 추가 시 review checklist**:
- [ ] 모든 constructor 파라미터에 `@Inject(Service)` 명시
- [ ] curl 로 GET endpoint 가 200 응답하는지 확인 (web fallback 에 가려지지 않게)

### 8.3 배포 시 sandbox approval fixture 가 reset 됨
`pnpm db:seed` 의 `deleteMany` 가 sandbox cluster + ROLLOUT_EXECUTE policy 의 approval 을 매번 지움. 검증 중 만든 approval id 는 다음 배포 후 사라짐. 운영 데이터(실제 사용자가 만든 approval) 는 그 매칭 밖이라 보존됨.

### 8.4 격리 원칙
- 자동화 모든 경로는 `team-sandbox-obol-a` cluster + `operator-sandbox-1` host 안에서만.
- 기존 obol 운영 컨테이너(node0~3, web3signer, vc-*) 는 자동화로 절대 안 건드림.
- 새 EL/CL 절대 안 띄움 (팀 서버 I/O 보호).
- 자동화 작업 경로 prefix `/opt/obol/team-sandbox-obol-a/` outside 접근 금지.

### 8.5 `db push + db:seed` 가 매 배포마다 돌음
schema 변경 후 배포만 하면 자동 반영. 별도 마이그레이션 명령 불필요. 단점: 임시 데이터 변경이 reset.

### 8.6 권한 매트릭스 누락 review
새 endpoint 추가 시 어떤 role 이 호출하는지 `packages/domain/src/auth.ts:rolePermissionMatrix` 와 매칭 확인. P2.7 검증 중 TREASURY_OPERATOR 가 `audit:read` 누락된 것을 발견 — 자기 deposit 의 audit log 도 못 보던 상태였음. 새 detail 페이지가 audit 표시할 때마다 해당 role 매트릭스 review.

### 8.7 Web UI 권한 분기는 server-side, defense in depth
- `/approvals` 의 form, `/automation` 의 form, `/approvals/[id]` 의 Decision 패널은 모두 server component 단계에서 권한 체크 후 client component 마운트 여부 결정.
- UI 가 안 보여도 API 에 직접 POST 하면 server-side guard (`assertCreateAllowed`, `@RequirePermissions("approvals:decide")`) 가 다시 차단.

### 8.8 stub auth 는 dev/검증용 — 운영 진입 전 반드시 진짜 IdM 으로 교체
현재 인증은 HTTP 헤더 (`x-eth-user-email`, `x-eth-user-role`) 를 그대로 신뢰하는 stub. 브라우저는 `ModHeader` 익스텐션으로 역할 흉내. **이 상태로 운영 자금 흐름(Safe export 등) 절대 금지** — 헤더 위조 = role 위조. 운영 베어메탈 cutover 직전에 별도 phase (P-auth 묶음) 로 Keycloak (or 동등 IdM) self-host 도입 + `AuthStubGuard` → JWT/session guard 교체 + MFA(ADMIN/APPROVER) + 세션 만료 + AuditLog 에 IP/device/session id. `AuthSession` 인터페이스는 그대로 유지하면 P2.3~2.7 권한 분기 코드 무변경 통합 가능.

---

## 부록 — 자주 쓰는 명령 한 줄

```bash
# 배포
( cd <worktree> && export ANSIBLE_CONFIG=infra/ansible/ansible.cfg && \
  ansible-playbook -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  infra/ansible/playbooks/team-server-mvp.yml --ask-become-pass )

# 60초 동안의 모든 컨테이너 에러
for c in api worker web; do
  echo "=== $c ===" ; \
  ssh smartplatform@192.168.13.64 \
    "docker logs --since 60s eth-staking-control-plane-$c-1 2>&1 | grep -iE 'error|⨯' | tail -5" ;
done

# 모든 컨테이너 상태
ssh smartplatform@192.168.13.64 \
  'docker ps --format "table {{.Names}}\t{{.Status}}" | grep eth-staking'
```
