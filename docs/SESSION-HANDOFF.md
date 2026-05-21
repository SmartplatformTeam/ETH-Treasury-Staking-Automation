# Session Handoff

> 이 문서는 **새 세션 진입 시 1분 안에 컨텍스트 복원** 을 위한 살아있는 페이지. phase done 마다 갱신.
> 마지막 갱신: **2026-05-20**

## 1. 한 줄 상태

Phase 2-7 (Safe Proposal Adapter, deposit Full UX) 완료 + `/docs` Web 뷰어 도입. 다음 후보 **Phase 2-8 Alert center** (Redis dedup/cooldown). 팀 서버 192.168.13.64 운영 중.

## 2. 작업 위치

```
worktree: /Users/ethan/Desktop/eth-treasury-staking-automation/.claude/worktrees/strange-keller-a47fa3
branch:   claude/strange-keller-a47fa3 (main 에 아직 merge 안 됨)
last commit: 4b7c96d  Document /docs route in CHANGELOG + runbook
```

ETH treasury control plane monorepo (apps/api NestJS, apps/web Next.js 15, apps/worker setInterval, packages/db Prisma, packages/domain). 자세한 구조는 [docs/operator-runbook.md §1](operator-runbook.md#1-시스템-한눈에) 참조.

## 3. 팀 서버 운영 상태 (검증 완료)

```
host:        192.168.13.64 (smartplatform 계정, SSH key 인증)
컨테이너:    eth-staking-control-plane-{api,worker,web,postgres}-1 + 기존 obol 운영 무영향
배포 commit: 4b7c96d (P2-7 + /docs route 까지 반영)
worker:      health-evaluator 1분 주기 + beacon-sync 5분 주기
sandbox:     team-sandbox-obol-a + operator-sandbox-1 + Hoodi treasury
운영 cluster: mainnet-obol-a (read-only inventory 표시)
```

| 접속 | URL |
|---|---|
| Web | http://192.168.13.64:3005 |
| Web Docs (NEW) | http://192.168.13.64:3005/docs |
| API | http://192.168.13.64:4000/v1 |
| Swagger | http://192.168.13.64:4000/docs |

## 4. 다음 세션 진입 시 첫 명령 (복사해서 그대로)

```bash
cd /Users/ethan/Desktop/eth-treasury-staking-automation/.claude/worktrees/strange-keller-a47fa3
git status
git log --oneline -10
head -60 docs/CHANGELOG.md
cat docs/SESSION-HANDOFF.md
```

→ 그 다음 어떤 phase 진행할지 §6 에서 골라서 plan 단계 (사전 조사 → 잠긴 결정 → step 분해) 들어가면 됨.

## 5. 완료된 Phase 한눈에

| Phase | 한 줄 | done 문서 |
|---|---|---|
| 1 | Control Plane ↔ Ansible verify-baseline loop | [link](work-log/2026-05-18-phase1-done.md) |
| 2-1 | render → verify-runtime → rollout dry-run | [link](work-log/2026-05-18-phase2-1-done.md) |
| 2-2 | Beacon API read 파이프라인 + BMW M 디자인 | [link](work-log/2026-05-19-phase2-2-done.md) |
| 2-3 | Approval Decide API + 4-eyes 잠금 | [link](work-log/2026-05-19-phase2-3-done.md) |
| 2-4 | Approval UI 완성 (생성/상세/결정) | [link](work-log/2026-05-19-phase2-4-done.md) |
| 2-5 | Automation ↔ Approval 통합 (dropdown + prefill) | [link](work-log/2026-05-19-phase2-5-done.md) |
| 2-6 | Beacon node health ingestion + NodeHealthSnapshot | [link](work-log/2026-05-19-phase2-6-done.md) |
| 2-7 | Safe Proposal Adapter (DepositRequest Full UX) | [link](work-log/2026-05-20-phase2-7-done.md) |
| (보조) | docs viewer (/docs route) | CHANGELOG 한 단락 |

자세한 변경: [docs/CHANGELOG.md](CHANGELOG.md). 사용법: [docs/operator-runbook.md](operator-runbook.md).

## 6. 다음 phase 후보 (우선순위)

### A. Phase 2-8 — Alert center (추천)
P2-6 의 NodeHealthSnapshot 시계열 위에 dedup/cooldown/threshold rule/recovery 감지. **Redis 도입 첫 phase** (P2-6 plan 에서 P2-7 로 미루었던 것). worker + Redis (BullMQ 또는 단순 redis client). Alert / HealthEvent 모델 신설 가능.

### B. Phase 2-9 — S3 / MinIO migration
P2-7 의 `SafeProposal.payloadJson` 컬럼을 S3 객체로 옮김. presigned URL. minio container 추가. payload 외에 audit log 첨부물 등 다른 파일도 같은 storage 로.

### C. Phase 2-10 — Validator activation 자동 감지
P2-2 의 beacon-sync worker 가 새로 active 된 validator 발견 시 → 매칭 DepositRequest 의 executionStatus 를 `SUBMITTED` → `COMPLETED` 자동 전이. 운영자가 매뉴얼 Mark Submitted 후 다음 단계 자동.

### D. Phase P-auth — Keycloak (or 동등) IdM 통합
운영 cutover **전 반드시 필요**. AuthStubGuard 교체 + 세션 만료 + MFA. AGENTS.md §1 우선순위 첫 번째 (인증과 RBAC) 의 두 번째 절반. 자세한 구상은 [operator-runbook.md §8.8](operator-runbook.md#88-stub-auth-는-dev검증용--운영-진입-전-반드시-진짜-idm-으로-교체).

### E. Phase 2-11+ — DKG ceremony 통합
deposit_data.json 의 생성 자체를 시스템 안에 가져옴 (현재 외부 도구 paste). Obol charon DKG 자동화.

**추천 순서**: A → C → B → D (운영 cutover 직전) → E.

## 7. 살아있는 follow-up (모든 phase done 의 보류 항목)

### API / 도메인
- [ ] safeTxHash 정확 EIP-712 계산 (`@noble/hashes` 도입, P2-7 비범위)
- [ ] BLS signature 실 검증 (deposit_data 의 signature 가 진짜 valid 인지)
- [ ] 배치 deposit (validatorCount > 1, 현재 ABI encoder 단일만)
- [ ] DepositRequest 의 file upload (현재 hex paste 만)
- [ ] Safe Tx Service API 직접 제출 (현재 사람이 Safe UI 에 수동 import)
- [ ] Approval cancel endpoint (REJECTED 와 의미 분리)
- [ ] 다단계 approval (`Approval.currentStep > 1`)
- [ ] Audit 의 IP/device/session 정보 (IdM 도입 시)
- [ ] alerts API `resourceId` filter 서버측 추가 (현재 클라이언트 filter)

### 운영 / 인프라
- [ ] **stub auth → 진짜 IdM (운영 cutover 전 반드시)**
- [ ] Charon prometheus metrics 폴링 (health 확장)
- [ ] Web3Signer health 폴링 + Signer.healthStatus 갱신
- [ ] node_exporter (disk/memory monitor)
- [ ] cluster 별 Beacon endpoint 분리 (현재 단일 URL)
- [ ] tsbuildinfo / 빌드 artifact git 추적 정리 (`.gitignore` 갱신)

### UI / UX
- [ ] /alerts 페이지 — severity 별 필터 + ack 흐름
- [ ] Run 상세 페이지에서 사용된 approval 로 backlink
- [ ] Notification (Slack/email) on approval requested / decided
- [ ] Deposit 페이지 → /approvals prefill 인코딩 활용 (해당 인코딩은 P2-5 에서 잠금)
- [ ] STAGE_ARTIFACTS_EXECUTE 호출 시 자기 자신 approval 4-eyes 검증 추가 시각 안내

### 알려진 코드 함정 (RUNBOOK §8 등재됨, 재발 방지)
- ✅ `'use server'` async export-only — `action-state.ts` 분리 패턴
- ✅ NestJS `@Inject(Service)` 명시 — tsup emitDecoratorMetadata 우회
- ✅ 권한 매트릭스 누락 review — 새 endpoint 시 role 체크
- ✅ 배포 시 sandbox approval fixture reset
- ✅ 격리 원칙 (sandbox 경로 outside 금지)
- ✅ `db push + db:seed` 매 배포 자동

## 8. 메모리 갱신 권장

사용자 `MEMORY.md` 에 "Phase 2-3 Approval write API 다음" 같은 메모가 있다면 다음으로 갱신 권장:

```
Project phase status — Phase 1, 2-1 ~ 2-7 + /docs viewer 완료.
배포 commit 4b7c96d. 다음 후보 P2-8 alert center.
worktree: .claude/worktrees/strange-keller-a47fa3
운영 진입 전 stub auth → IdM (P-auth) 필수.
```

## 9. AGENTS.md 4원칙 + §5 컨벤션 (다음 phase 진행 시)

1. **Think Before Coding** — 잠긴 결정 사용자 confirm 받기
2. **Simplicity First** — surgical, 새 추상화 보류
3. **Surgical Changes** — 기존 패턴 재사용 (action-state 분리, @Inject 명시, hasPermission 패턴)
4. **Goal-Driven** — step 별 verify 기준 명시
5. **Phase Documentation Convention** — phase done 시 `docs/work-log/<date>-phase<N>-done.md` + `docs/CHANGELOG.md` + (사용자 시점 변경이면) `docs/operator-runbook.md` 모두 갱신. 본 SESSION-HANDOFF.md 도 같이.

## 10. Quick reference (자주 쓰는 명령)

```bash
# 배포
( cd /Users/ethan/Desktop/eth-treasury-staking-automation/.claude/worktrees/strange-keller-a47fa3 && \
  export ANSIBLE_CONFIG=infra/ansible/ansible.cfg && \
  ansible-playbook -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  infra/ansible/playbooks/team-server-mvp.yml --ask-become-pass )

# 모든 컨테이너 60s 에러
for c in api worker web; do
  echo "=== $c ===" ; \
  ssh smartplatform@192.168.13.64 \
    "docker logs --since 60s eth-staking-control-plane-$c-1 2>&1 | grep -iE 'error|⨯' | tail -5" ;
done

# psql 한 번
ssh smartplatform@192.168.13.64 \
  'docker exec eth-staking-control-plane-postgres-1 psql -U eth_staking_app -d eth_staking_automation -c "<SQL>"'
```
