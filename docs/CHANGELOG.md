# Changelog

Phase 단위 사용자 시점 변경 history. 코드/Schema 디테일은 [docs/work-log/](work-log/) 의 plan/done 문서 참고.

## 컨벤션 (반드시 지킬 것)

- 각 phase done 시 본 파일 상단에 **한 단락** 추가:
  - 제목: `## Phase X-Y — YYYY-MM-DD — 한 줄 범위`
  - 본문: 운영자 시점 변경 1–3 bullet + 새 endpoint/페이지/env 1줄 + work-log/done 링크
- 사용자 시점 변경(페이지/명령/시나리오) 이 있으면 [operator-runbook.md](operator-runbook.md) 도 같이 갱신
- 코드/schema 디테일은 work-log 의 done 문서에 — 본 파일은 사용자 관점 요약만

---

## Phase 2-6 — 2026-05-19 — Beacon node health ingestion + NodeHealthSnapshot

- **운영자 시점**: `/alerts` 페이지가 fixture 가 아닌 실 health 상태 표시. lighthouse 의 `optimistic sync` 같은 상황이 WARNING 으로 1분 내 노출.
- **새로 도는 것**: worker 컨테이너에 `health_evaluation_tick` job 추가 (`HEALTH_SYNC_INTERVAL_MS=60000` 기본). Beacon `/eth/v1/node/health` + `/syncing` 폴링.
- **DB**: `NodeHealthSnapshot` 모델 신설 (시계열). Node + OperatorHost 의 `healthStatus` 가 자동 갱신.
- **부수 수정**: alerts/rewards 컨트롤러 DI 버그 (Phase 2-3 워크플로 컨트롤러와 동일 패턴) 같이 잡음.
- Detail: [work-log/2026-05-19-phase2-6-done.md](work-log/2026-05-19-phase2-6-done.md)

## Phase 2-5 — 2026-05-19 — Automation ↔ Approval 통합

- **운영자 시점**: `/automation` 페이지에서 execute op 선택 시 일치하는 APPROVED approval 이 자동으로 dropdown 에 채워짐. safe op 때는 approval 섹션 자체 숨김. 매칭 없으면 `/approvals?prefill=<base64>` 링크로 생성 폼 자동 채움.
- **권한별 분기**: INFRA_OPERATOR/ADMIN 만 `/automation` form 보임. 나머지 role 은 안내 메시지.
- **API**: `GET /v1/approvals` 에 `clusterId`, `hostId`, `automationOperation` 3 query 추가. 응답에 같은 필드 노출.
- Detail: [work-log/2026-05-19-phase2-5-done.md](work-log/2026-05-19-phase2-5-done.md)

## Phase 2-4 — 2026-05-19 — Approval UI 완성 (생성 + 상세 + 결정 버튼)

- **운영자 시점**: 운영자가 curl/Swagger 없이 Web UI 만으로 approval 을 만들고 결정 가능. `/approvals` 상단 inline 생성 form + `/approvals/[id]` 상세 페이지(audit trail + Approve/Reject 버튼).
- **새 API**: `POST /v1/approvals` (생성, ROLLOUT + DEPOSIT_REQUEST), `GET /v1/approvals/{id}` (상세).
- **권한 분기**: ROLLOUT 생성은 INFRA_OPERATOR/ADMIN, DEPOSIT_REQUEST 는 TREASURY_OPERATOR/ADMIN. 결정 버튼은 `approvals:decide` (APPROVER/ADMIN) 만.
- **부수 수정 (P2.3 hotfix 포함)**: `'use server'` 파일에서 async 함수만 export 가능 — `action-state.ts` 분리 패턴 일반화.
- Detail: [work-log/2026-05-19-phase2-4-done.md](work-log/2026-05-19-phase2-4-done.md)

## Phase 2-3 — 2026-05-19 — Approval Decide API + 사람 승인 체인 잠금

- **운영자 시점**: 위험 작업(ROLLOUT_EXECUTE 등) 이 사람 승인 없이 절대 안 돌아감. APPROVER 가 API/curl 로 approve/reject 호출. 자기가 만든 approval 은 자기가 못 누름(4-eyes).
- **새 API**: `POST /v1/approvals/{id}/approve`, `POST /v1/approvals/{id}/reject` (reason 필수).
- **AuditLog**: 결정 행위가 `APPROVAL_APPROVED` / `APPROVAL_REJECTED` 로 자동 기록.
- **부수 수정**: workflows 컨트롤러 DI 버그 발견 — `@Inject(Service)` 명시 패턴 도입.
- Detail: [work-log/2026-05-19-phase2-3-done.md](work-log/2026-05-19-phase2-3-done.md)

## Phase 2-2 — 2026-05-19 — Beacon API read 파이프라인 + BMW M 디자인

- **운영자 시점**: `/validators` 페이지가 fixture 가 아닌 Hoodi Beacon 실데이터(balance/status/epoch) 5분 주기로 갱신.
- **새로 도는 것**: worker `beacon_sync_tick` job (`BEACON_SYNC_INTERVAL_MS=300000`). 모든 validator pubkey 순회.
- **UI**: 전체 페이지 BMW M 디자인 톤(흑 캔버스, 1px hairline, uppercase, M tricolor) 일괄 적용.
- **DB**: `ValidatorBalanceSnapshot` 모델 신설(시계열). Validator 에 beacon 필드 9개 추가.
- Detail: [work-log/2026-05-19-phase2-2-done.md](work-log/2026-05-19-phase2-2-done.md)

## Phase 2-1 — 2026-05-18 — render → verify-runtime → rollout dry-run 풀 흐름

- **운영자 시점**: `/automation` 에서 `RENDER_RUNTIME`, `VERIFY_RUNTIME`, `ROLLOUT_DRY_RUN` 세 작업이 sandbox cluster(`team-sandbox-obol-a`) 에서 통과. 기존 obol 운영 컨테이너 무영향.
- **Architecture**: API 컨테이너 안 ansible 이 호스트 SSH 로 sandbox 호스트 접속. SSH key 자동 생성/등록 4 task 추가.
- **격리 경로**: `/opt/obol/team-sandbox-obol-a/`, `/var/lib/eth-treasury-operator-artifacts/team-sandbox-obol-a/`, `/secure/config/team-sandbox-obol-a/`.
- Detail: [work-log/2026-05-18-phase2-1-done.md](work-log/2026-05-18-phase2-1-done.md)

## Phase 1 — 2026-05-18 — Control Plane ↔ Ansible 첫 통과 loop

- **운영자 시점**: `/automation` 에서 `VERIFY_BASELINE` (read-only) 호출 가능. stdout/stderr 가 `AutomationRunEvent` 로 stream 되어 UI 에 표시.
- **Architecture**: API 컨테이너 안에서 `ansible-playbook` child process 실행 (single process, no queue).
- **잠긴 인터페이스**: run 상태 흐름 `QUEUED → RUNNING → SUCCEEDED/FAILED/CANCELLED`. safe vs execute tier 분기.
- Detail: [work-log/2026-05-18-phase1-done.md](work-log/2026-05-18-phase1-done.md)
