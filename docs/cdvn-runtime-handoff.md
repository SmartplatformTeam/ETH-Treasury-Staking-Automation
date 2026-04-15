# CDVN Runtime Handoff

작성일: 2026-04-15

후속 업데이트:

- `host-preflight.sh`를 추가해 bare-metal host 사전 점검 흐름을 dry-run / execute로 붙였다.
- `rollout-exec.sh`를 추가해 rollout 이후 `docker compose config/pull/up/ps` 실행 wrapper를 dry-run / execute로 붙였다.
- `stage-charon-artifacts.sh`를 추가해 approved `.charon` artifact를 allowlist 방식으로 runtime에 stage 하도록 붙였다.
- `beginner-guide.md`, `system-diagrams.md`, `dvt-cluster-walkthrough.md`를 추가해 초보자용 설명, 구조 다이어그램, 실제 운영 시나리오 문서를 정리했다.
- `runtime-inventory-guide.md`, `runtime-secrets-guide.md`, `web3signer-kms-guide.md`, `approval-audit-guide.md`, `observability-alerting-guide.md`, `bring-up-checklist.md`를 추가해 실운영 전 확정해야 할 세팅 문서를 정리했다.

## 목적

이번 작업의 목적은 `infra/obol-cdvn`을 단순 scaffold 상태에서 다음 수준으로 올리는 것이었다.

- pinned upstream baseline 보관
- overlay 경계 분리
- host-aware render
- verify / rollout / drift-check / health-sync 진입점 추가

즉, "문서만 있는 디렉토리"가 아니라 다음 에이전트가 바로 실제 runtime 배포 자동화를 이어서 구현할 수 있는 상태까지 만드는 것이 목표였다.

## 이번 작업에서 완료한 것

- Obol `charon-distributed-validator-node` upstream baseline을 `v1.9.5`로 pinning 했다.
- upstream 원본을 `infra/obol-cdvn/baseline/upstream/` 아래에 mirror 했다.
- secret 성격의 `jwt/jwt.hex`는 mirror에서 제외했다.
- baseline pinning metadata를 `infra/obol-cdvn/baseline/VERSION`에 기록했다.
- 루트 `.env.example`의 `CDVN_BASELINE_VERSION`을 `v1.9.5`로 맞췄다.
- inventory 예시를 cluster/host 단위로 확장했다.
- `web3signer` overlay를 추가했다.
- `observability` overlay를 추가했다.
- `render.sh`를 cluster/host inventory 기반 host-aware renderer로 확장했다.
- `stage-charon-artifacts.sh`를 추가해 approved `.charon` artifact allowlist stage를 붙였다.
- `verify-baseline.sh`, `verify.sh`, `rollout.sh`, `host-preflight.sh`, `rollout-exec.sh`, `drift-check.sh`, `health-sync.sh`를 추가했다.
- rollout approval 예시 파일을 추가했다.
- `.charon` artifact stage approval 예시 파일을 추가했다.
- 입문 문서, 다이어그램 문서, 실제 운영 walkthrough 문서를 추가했다.

## 핵심 파일

- baseline pinning
  - `infra/obol-cdvn/baseline/VERSION`
  - `infra/obol-cdvn/baseline/upstream/*`
- inventory
  - `infra/obol-cdvn/inventory/cluster.example.yml`
  - `infra/obol-cdvn/inventory/hosts.example.yml`
- web3signer overlay
  - `infra/obol-cdvn/overlays/web3signer/env.defaults`
  - `infra/obol-cdvn/overlays/web3signer/compose-vc.yml`
  - `infra/obol-cdvn/overlays/web3signer/lodestar/run.sh`
- observability overlay
  - `infra/obol-cdvn/overlays/observability/env.defaults`
  - `infra/obol-cdvn/overlays/observability/docker-compose.services.yml`
  - `infra/obol-cdvn/overlays/observability/prometheus/prometheus.yml.example.tpl`
- runtime scripts
  - `infra/obol-cdvn/scripts/lib.sh`
  - `infra/obol-cdvn/scripts/render.sh`
  - `infra/obol-cdvn/scripts/stage-charon-artifacts.sh`
  - `infra/obol-cdvn/scripts/verify-baseline.sh`
  - `infra/obol-cdvn/scripts/verify.sh`
  - `infra/obol-cdvn/scripts/rollout.sh`
  - `infra/obol-cdvn/scripts/drift-check.sh`
  - `infra/obol-cdvn/scripts/health-sync.sh`
  - `infra/obol-cdvn/scripts/rollout-approval.example.env`
  - `infra/obol-cdvn/scripts/charon-artifact-approval.example.env`
- docs
  - `docs/beginner-guide.md`
  - `docs/system-diagrams.md`
  - `docs/dvt-cluster-walkthrough.md`
  - `docs/cdvn-artifact-staging.md`
  - `docs/runtime-inventory-guide.md`
  - `docs/runtime-secrets-guide.md`
  - `docs/web3signer-kms-guide.md`
  - `docs/approval-audit-guide.md`
  - `docs/observability-alerting-guide.md`
  - `docs/bring-up-checklist.md`

## 구현 상세

### 1. Baseline

- upstream repo는 `ObolNetwork/charon-distributed-validator-node`
- pinned ref는 `v1.9.5`
- pinned commit은 `d8110b1945a5d4d9e21827d5cae94e837bbcb457`
- upstream compose, env sample, monitoring, helper script를 `baseline/upstream/`으로 mirror
- baseline 직접 수정 대신 overlay와 scripts로만 덮어쓰는 구조 유지

### 2. Inventory

`cluster.example.yml`에 아래 값을 추가했다.

- `overlayProfiles`
- `serviceOwner`
- `web3signerUrl`
- `web3signerMetricsTarget`
- `web3signerFetch`
- `web3signerFetchIntervalMs`
- `feeRecipientAddress`
- `healthSyncUrl`
- `deploymentRoot`
- `approvalPolicy`

`hosts.example.yml`에 아래 값을 추가했다.

- `monitoringPeer`
- `grafanaPort`
- `prometheusPort`
- `sshUser`
- `deploymentPath`

### 3. Web3Signer overlay

현재 overlay는 upstream 기본 validator client 흐름에 맞춰 `vc-lodestar` 기준으로 구현했다.

- `compose-vc.yml`이 upstream `compose-vc.yml`를 대체한다.
- `lodestar/run.sh`는 로컬 keystore import 대신 Lodestar external signer 플래그를 사용한다.
- `WEB3SIGNER_FETCH=true`일 때 Web3Signer에서 pubkey를 fetch하는 경로를 사용한다.
- `WEB3SIGNER_FETCH=false`일 때는 `WEB3SIGNER_PUBLIC_KEYS` 입력을 요구한다.

### 4. Observability overlay

- `docker-compose.services.yml`에 `cadvisor`, `node-exporter`, `tempo`, `loki`와 charon tracing/logging env override를 추가했다.
- Prometheus template에 `charon`, `mev-boost`, `lodestar`, `web3signer`, `node-exporter`, `cadvisor` scrape target을 넣었다.
- host별 `WEB3SIGNER_METRICS_TARGET`, `VC_PORT_METRICS` 값이 render 시 반영되도록 만들었다.

### 5. Scripts

`render.sh`

- 단일 host 테스트용 render와 cluster bundle render 둘 다 지원한다.
- cluster/host inventory를 읽어 `output-dir/hosts/<host>/runtime` 구조로 산출물을 만든다.
- `.env`에 host별 `COMPOSE_PROJECT_NAME`, `CHARON_DOCKER_NETWORK`, `CLUSTER_NAME`, `CLUSTER_PEER`, `CHARON_NICKNAME`, `CHARON_P2P_EXTERNAL_HOSTNAME`, `SERVICE_OWNER`, `WEB3SIGNER_URL` 등을 주입한다.
- overlay profile에 따라 `compose-vc.yml`, Lodestar entrypoint, Prometheus template, `docker-compose.override.yml`를 생성한다.
- `jwt/jwt.hex`는 삭제하고 빈 `jwt/`, `.charon/`, `data/` 디렉토리만 남긴다.
- host별 `render-metadata.env`, `RENDERED_BY_CONTROL_PLANE.txt`, `OVERLAY_TODO.md`를 생성한다.

`verify-baseline.sh`

- baseline 필수 파일 존재 여부 검사
- mirror에 `jwt/jwt.hex`가 없는지 검사
- `.env.example`의 `CDVN_BASELINE_VERSION`과 pinned baseline ref 일치 여부 검사

`verify.sh`

- rendered runtime에 `.env`, `render-metadata.env`, `docker-compose.override.yml`가 있는지 검사
- runtime에 `jwt/jwt.hex`가 없는지 검사
- baseline version 정합성 검사
- `web3signer` overlay가 Lodestar external signer entrypoint와 `WEB3SIGNER_URL`을 제대로 넣었는지 검사
- `observability` overlay가 cadvisor와 Prometheus scrape config를 제대로 넣었는지 검사
- staged `.charon` artifact metadata가 있으면 `cluster-lock.json`, `charon-enr-private-key`, `WEB3SIGNER_PUBLIC_KEYS` 관련 규칙도 검사한다

`stage-charon-artifacts.sh`

- approved source에서 `.charon/cluster-lock.json`, `.charon/charon-enr-private-key`, optional `validator-pubkeys.txt`만 allowlist로 stage 한다.
- `validator_keys/`, keystore, mnemonic, seed 같은 raw material은 복사하지 않는다.
- approval file과 cluster/host/policy를 비교해 mismatch를 막는다.
- `charon-artifacts-staging.env`에 approval id, source path, sha256, staged 시각을 기록한다.

`host-preflight.sh`

- rendered metadata에서 SSH target과 deployment path를 읽는다.
- dry-run 또는 execute로 host의 `docker`, `docker compose`, `rsync`, `curl`, deployment path writable, disk 여유를 점검한다.
- optional required file 체크를 지원한다.

`rollout-exec.sh`

- rollout approval을 다시 검증한 뒤 원격에서 `docker compose config`, `pull`, `up -d`, `ps`를 실행한다.
- dry-run 또는 execute를 지원한다.

`rollout.sh`

- approval file과 render metadata를 비교해 cluster/host/policy mismatch를 막는다.
- 기본 동작은 dry-run rsync다.
- `--execute`를 주면 실제 rsync를 수행한다.
- `data/`와 `jwt/jwt.hex`는 rollout 대상에서 제외한다.

`drift-check.sh`

- rendered runtime과 deployed path의 차이를 rsync dry-run으로 보여준다.
- `--fail-on-drift`를 주면 drift 발생 시 non-zero로 종료한다.

`health-sync.sh`

- rendered metadata에서 cluster/host/network/baseline/overlay 정보를 읽는다.
- health sync endpoint로 JSON payload를 POST 하도록 되어 있다.
- `--dry-run`으로 payload만 출력 가능하다.

### 6. Docs

새로 정리한 문서의 역할은 아래와 같다.

- `beginner-guide.md`
  - 초보자 기준으로 이 레포가 무엇이고 왜 필요한지 설명한다.
- `system-diagrams.md`
  - runtime, control plane, approval 경계를 Mermaid 다이어그램으로 설명한다.
- `dvt-cluster-walkthrough.md`
  - 신규 DVT cluster를 준비해서 validating까지 올리는 운영 시나리오를 단계별로 설명한다.
- `cdvn-artifact-staging.md`
  - approved `.charon` artifact를 어떤 allowlist 규칙으로 stage 하는지 설명한다.

## 검증 결과

다음 검증을 수행했다.

- `infra/obol-cdvn/scripts/verify-baseline.sh`
  - 통과
- `infra/obol-cdvn/scripts/render.sh --cluster-file ... --hosts-file ... --output-dir .tmp-cdvn-cluster-render --force`
  - 통과
- `infra/obol-cdvn/scripts/stage-charon-artifacts.sh ...`
  - dry-run 통과
  - execute 통과
- `infra/obol-cdvn/scripts/verify.sh --render-dir .tmp-cdvn-cluster-render`
  - 4개 host runtime 모두 통과
- `infra/obol-cdvn/scripts/rollout.sh ...`
  - 로컬 대상 경로로 dry-run 통과
  - 로컬 대상 경로로 `--execute` 통과
- `infra/obol-cdvn/scripts/host-preflight.sh ...`
  - dry-run 통과
- `infra/obol-cdvn/scripts/rollout-exec.sh ...`
  - dry-run 통과
- `infra/obol-cdvn/scripts/drift-check.sh ...`
  - `No drift detected` 확인
- `infra/obol-cdvn/scripts/health-sync.sh ... --dry-run`
  - payload 생성 확인

검증용 산출물:

- `.tmp-cdvn-cluster-render`
- `.tmp-cdvn-deploy/operator-1`

주의:

- 실제 bare-metal host에는 배포하지 않았다.
- 실제 Web3Signer 인스턴스와 통신하지 않았다.
- 실제 control plane endpoint에 POST 하지는 않았다.
- 실제 `.charon` artifact, `cluster-lock.json`, DKG output은 넣지 않았다.
- 문서 기준으로는 초보자용 입문 문서, 다이어그램 문서, 실제 운영 walkthrough 문서까지 정리했다.

## 현재 상태에서 남아 있는 공백

- Web3Signer/KMS 실제 인증, TLS, mTLS, header injection은 아직 없다.
- remote signer overlay는 현재 Lodestar 기준만 구현되어 있다.
- Teku, Nimbus, Prysm용 remote signer overlay는 아직 없다.
- `render.sh`의 inventory parser는 예시 YAML 포맷에 맞춘 경량 parser다.
- rollback 전략은 아직 없다.
- control plane의 health sync API, approval write workflow와 실제 연결되어 있지 않다.
- shell script unit/integration test는 아직 없다.

## 실제 운영 전에 확정해야 할 세팅

실서버 bring-up 전에 아래 값들은 반드시 확정해야 한다.

### 1. Host inventory

- 각 host의 공인/사설 IP
- `sshUser`
- `deploymentPath`
- `charonExternalHostname`
- `monitoringPeer`
- host별 open port 정책

### 2. Web3Signer / KMS

- `WEB3SIGNER_URL`
- metrics endpoint
- TLS / mTLS 사용 여부
- auth header 방식
- KMS namespace / key alias 규칙
- host에서 Web3Signer까지의 네트워크 경로

### 3. Secret / file path

- host에서 사용할 secret 디렉토리 경로
- required file 목록
- JWT 생성 위치와 생성 방식
- Web3Signer client cert / key / CA 경로

### 4. Approval / audit 운영 방식

- artifact stage approval을 누가 발급하는지
- rollout approval을 누가 발급하는지
- host별 approval 파일 naming 규칙
- approval 산출물을 어디에 저장할지

### 5. Observability / alert routing

- Prometheus scrape 접근 정책
- Loki / Tempo 저장 경로 또는 external endpoint
- alert 전송 채널
- health sync endpoint URL

### 6. Bring-up / failure policy

- host를 어떤 순서로 올릴지
- threshold 확인 기준
- validating 판정 기준
- 실패 시 stop rule
- rollback 수동 절차

## 다음 에이전트가 바로 할 일

1. 실제 inventory 값 채우기
실제 4대 bare-metal host의 IP, DNS, SSH user, deployment path, monitoring port, cluster peer 값을 `hosts.yml`로 확정해야 한다.

2. inventory 파일을 example에서 실사용 파일로 분리하기
`cluster.example.yml`, `hosts.example.yml`를 참고해서 실제 운영용 `cluster.yml`, `hosts.yml`를 만들고, render/rollout이 그 파일을 기본값으로 읽도록 정리하는 게 좋다.

3. Web3Signer 실연동 정보 반영
`WEB3SIGNER_URL`, metrics endpoint, TLS cert 경로, auth header, KMS namespace 같은 실제 값과 secret 주입 경로를 정해야 한다.

4. Lodestar external signer 플래그 재검증
현재 overlay는 Lodestar external signer 플래그를 기준으로 작성했으니, pinned CDVN/Lodestar 조합에서 실제 동작 여부를 컨테이너 실행으로 확인해야 한다.

5. staged artifact remote 검증 추가
현재 `stage-charon-artifacts.sh`는 approved `.charon` artifact allowlist stage와 metadata 기록까지 붙었다. 다음 단계는 배포 대상 host의 실제 `.charon` 파일과 staged metadata hash를 비교하는 원격 검증을 추가하는 것이다.

6. rollback / stop rule 추가
현재 `rollout-exec.sh`는 `docker compose config/pull/up/ps` 실행까지 붙었다. 다음 단계는 실패 시 자동 rollback 또는 명시적 stop rule을 추가하는 것이다.

7. host preflight 체크 범위 고도화
현재 `host-preflight.sh`는 docker / compose / rsync / curl, deployment path writable, disk 여유를 점검한다. 다음 단계는 아래 범위를 더 붙이는 것이다.

- required env / secret file 존재 여부
- Web3Signer reachability 실제 확인
- host별 runtime dependency 정책화

8. control plane 연동
`health-sync.sh` payload를 받는 API endpoint를 `apps/api` 또는 `apps/worker` 쪽에 추가하고, audit log / host health snapshot까지 이어야 한다.

9. approval 파일을 stub에서 실데이터로 교체
지금은 `rollout-approval.example.env`만 있다. 다음 단계는 approval service 결과를 이 형식으로 export 하거나, script가 API에서 직접 approval status를 조회하도록 바꾸는 것이다.

10. script test 추가
최소한 아래 테스트는 CI에 넣는 게 좋다.

- render smoke test
- verify smoke test
- rollout approval mismatch test
- drift-check smoke test

11. 문서 동기화 유지
현재 `repo-guide`, `architecture`, `beginner-guide`, `system-diagrams`, `dvt-cluster-walkthrough`까지 동기화했다. 다음 단계에서도 runtime 동작이 바뀌면 같은 문서들을 함께 갱신해야 한다.

## 다음 에이전트용 권장 시작 순서

1. `docs/cdvn-runtime-handoff.md` 읽기
2. `infra/obol-cdvn/baseline/VERSION` 확인
3. `infra/obol-cdvn/inventory/*.example.yml` 확인
4. `infra/obol-cdvn/scripts/render.sh` 확인
5. 아래 명령으로 render / verify 재실행

```bash
infra/obol-cdvn/scripts/verify-baseline.sh

infra/obol-cdvn/scripts/render.sh \
  --cluster-file infra/obol-cdvn/inventory/cluster.example.yml \
  --hosts-file infra/obol-cdvn/inventory/hosts.example.yml \
  --output-dir .tmp-cdvn-cluster-render \
  --force

infra/obol-cdvn/scripts/verify.sh \
  --render-dir .tmp-cdvn-cluster-render
```

## 메모

- `.tmp-cdvn-cluster-render`, `.tmp-cdvn-deploy`는 검증용 산출물이다.
- source of truth는 `infra/obol-cdvn` 아래 파일이다.
- 실제 운영에 쓰기 전에는 Web3Signer/KMS 실연동과 remote host 검증이 반드시 필요하다.
