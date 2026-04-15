# CDVN Baseline Adoption

## 목적

이 프로젝트는 Obol의 `charon-distributed-validator-node` 레포를 DVT operator runtime baseline으로 채택한다.

목표는 다음 두 가지를 동시에 만족하는 것이다.

- Charon / Obol 운영 방식은 upstream 표준에 최대한 맞춘다.
- treasury control plane, signer custody, approval flow는 우리 시스템 요구에 맞게 overlay로 분리한다.

## 채택 원칙

- upstream repo의 compose 구조와 서비스 역할 분리를 기준선으로 사용한다.
- 4대 bare-metal host 각각이 하나의 operator node를 담당한다.
- host마다 동일한 자동화 경로를 사용하되, client profile override는 허용한다.
- upstream을 크게 재작성하지 않고 pinned version + overlay patch 전략을 사용한다.

## 기준선으로 유지할 항목

- `docker-compose.yml` 중심의 operator node 배포 구조
- `compose-el.yml`, `compose-cl.yml`, `compose-vc.yml`, `compose-mev.yml`, `compose-debug.yml` 분리 방식
- EL / CL / Charon / VC / relay / observability 역할 분리
- `.charon` 디렉토리와 `cluster-lock.json` 중심의 cluster artifact 관리 흐름
- DKG ceremony, ENR peer discovery, relay 사용 방식
- Prometheus / Grafana / Loki / Tempo 등 운영 메트릭 패턴

## 우리 시스템에서 덮어쓸 항목

### Validator Signer

- 기본 CDVN은 validator client가 로컬 `validator_keys`를 사용하는 구성을 전제로 한다.
- 이 프로젝트는 해당 경로를 그대로 사용하지 않고 Web3Signer + KMS overlay를 적용한다.
- raw validator signing key material은 애플리케이션 DB나 일반 파일 경로에 저장하지 않는다.

### Control Plane

- CDVN은 operator node runtime만 담당한다.
- inventory, approval, deposit workflow, audit log, reward reporting은 우리 monorepo의 web/api/worker가 담당한다.
- DKG와 add-validator는 Charon 표준 절차를 따르되, 요청 생성과 승인, 실행 이력 추적은 control plane이 담당한다.

### Treasury Execution

- deposit 및 후속 실행 payload는 Safe multisig OVM account를 대상으로 export한다.
- direct execution은 하지 않고 approval 이후 export와 tracking까지만 자동화한다.

## 권장 레포 반영 방식

`infra/obol-cdvn/` 아래에 다음 계층을 둔다.

- `baseline/`
  - upstream compose 구조와 env template mirror
- `overlays/web3signer/`
  - VC signer 경로 교체, KMS 연동, secret injection
- `overlays/observability/`
  - metrics scraping, log shipping, cluster health sync
- `inventory/`
  - 4대 bare-metal host inventory와 host별 변수
- `scripts/`
  - render, rollout, verify, drift-check 스크립트

## 현재 구현 상태

- pinned upstream ref는 `v1.9.5`다.
- pinned commit은 `d8110b1945a5d4d9e21827d5cae94e837bbcb457`다.
- baseline pinning metadata는 `infra/obol-cdvn/baseline/VERSION`에 기록한다.
- upstream mirror는 `infra/obol-cdvn/baseline/upstream/` 아래에 보관한다.
- mirror에는 `jwt/jwt.hex` 같은 secret 성격 파일을 포함하지 않는다.
- 현재 overlay는 `web3signer`, `observability` 두 가지가 구현되어 있다.
- inventory 예시는 `infra/obol-cdvn/inventory/cluster.example.yml`, `infra/obol-cdvn/inventory/hosts.example.yml`에 있다.
- 현재 automation entrypoint는 `render.sh`, `stage-charon-artifacts.sh`, `verify-baseline.sh`, `verify.sh`, `rollout.sh`, `host-preflight.sh`, `rollout-exec.sh`, `drift-check.sh`, `health-sync.sh`다.

## 현재 자동화 경계

현재 가능한 것:

- host-aware runtime render
- approved `.charon` artifact allowlist stage
- rendered runtime 검증
- rsync 기반 rollout dry-run / execute
- host preflight dry-run / execute
- remote `docker compose config/pull/up/ps` dry-run / execute
- deployed runtime drift-check
- health sync payload 생성과 POST dry-run

아직 남아 있는 것:

- 실제 `cluster.yml`, `hosts.yml` 분리와 기본값 연결
- Web3Signer TLS, mTLS, auth header, KMS namespace 같은 실연동 값 반영
- rollback 전략
- control plane approval / health sync API와의 실제 연결

## 업그레이드 정책

- upstream CDVN 버전은 명시적으로 pinning 한다.
- 로컬 수정은 baseline 직접 변경보다 overlay와 patch 기록으로 유지한다.
- Charon / CL / EL 업그레이드는 approval 대상 변경으로 간주한다.
- DKG, add-validator, signer binding 변경은 audit log와 실행 기록을 남긴다.

## 구현 시 주의사항

- “4대 서버 동일 구성”은 동일 자동화 경로를 의미하며, 반드시 완전히 동일한 client 조합을 뜻하지는 않는다.
- client diversity가 필요하면 host profile 변수로 처리하고 rollout 절차는 동일하게 유지한다.
- control plane이 Charon 자체를 재구현하면 안 된다.
- DKG artifact와 deposit artifact의 저장, 승인, export 경계를 분명히 나눈다.
