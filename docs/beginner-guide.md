# Beginner Guide

## 이 문서는 누구를 위한 문서인가

이 문서는 아래 사람을 위한 문서다.

- 이 레포를 처음 열어 본 사람
- ETH staking, Obol, DVT, Web3Signer 개념이 아직 낯선 사람
- "이 레포가 정확히 뭘 하려는 거지?"를 먼저 이해하고 싶은 사람
- 코드를 보기 전에 큰 그림과 사용 흐름을 알고 싶은 사람

즉, 세부 구현보다 먼저 "왜 이 레포가 존재하는가"를 이해시키는 문서다.

## 이 레포를 한 문장으로 말하면

이 레포는 ETH Treasury 운영팀이

- validator와 노드 상태를 관리하고
- DVT runtime을 4대 bare-metal 서버에 같은 방식으로 배포하고
- 위험한 작업은 승인 절차로 통제하며
- 나중에 deposit, Safe export, reward accounting까지 한 시스템에서 다루기 위한

운영 control plane + runtime automation 레포다.

간단히 말해, "validator 운영을 위한 백오피스 + 배포 자동화 레포"다.

## 이 레포가 왜 만들어졌나

ETH staking 운영은 생각보다 단순하지 않다.

초보자가 떠올리는 운영은 보통 이 정도다.

- 서버 하나 띄운다
- validator를 실행한다
- 대시보드에서 상태를 본다

하지만 treasury 규모 운영은 전혀 다르다.

- validator 수가 많아진다.
- 여러 대의 서버를 같은 기준으로 유지해야 한다.
- 장애 감지와 운영 자동화가 필요하다.
- reward, 비용, 리포트가 필요하다.
- 예치나 signer 변경 같은 위험 작업은 승인 없이는 하면 안 된다.
- raw key, mnemonic, seed는 절대 일반 앱 DB에 넣으면 안 된다.

즉, 이 프로젝트는 단순한 "노드 띄우기"를 넘어서,
운영 자동화와 승인 기반 통제를 동시에 만족해야 해서 만들어졌다.

## 이 레포가 해결하려는 문제

이 레포는 크게 세 가지 문제를 풀려고 한다.

### 1. 운영 정보가 흩어지는 문제

실제 staking 운영에서는 validator 상태, node 상태, signer 상태, alert, reward, approval 이력이 각기 다른 곳에 흩어지기 쉽다.

이 레포는 그것을 하나의 운영 시스템으로 묶으려 한다.

### 2. 자동화와 통제가 동시에 필요한 문제

운영 자동화는 강화해야 한다.
하지만 예치, signer binding 변경, slash risk가 있는 작업은 자동으로 실행하면 안 된다.

그래서 이 레포는

- 자동화 가능한 것
- 승인 기반으로만 해야 하는 것
- 아예 자동화하면 안 되는 것

을 분리하는 구조를 가진다.

### 3. 4대 bare-metal 서버를 일관되게 운영해야 하는 문제

DVT 운영에서는 여러 operator host가 같은 기준선 위에서 움직여야 한다.

이 레포는 Obol의 CDVN baseline을 가져와서,
4대 bare-metal 서버에 같은 경로로 배포할 수 있도록 만든다.

## 이 레포가 아닌 것

초보자가 가장 많이 헷갈리는 부분이라 먼저 분명히 적는다.

### 이 레포는 staking client 자체가 아니다

이 레포는 Charon, Lodestar, Lighthouse, Nethermind, Web3Signer 자체를 새로 구현하는 레포가 아니다.

그 위에 얹는 운영 시스템 레포다.

### 이 레포는 raw validator key를 저장하는 레포가 아니다

이 레포는 raw signing key, mnemonic, seed를 보관하는 저장소가 아니다.

오히려 그 반대다.
그런 것을 앱 DB나 일반 파일 경로로 복사하지 않도록 강하게 통제하는 레포다.

### 이 레포는 무조건 자동 실행하는 시스템이 아니다

이 레포는 automation을 많이 다루지만,

- deposit 자동 서명
- withdrawal credential 자동 변경
- 승인 없는 emergency failover
- slash risk가 있는 자동 조치

같은 것은 목표가 아니다.

## 이 레포가 전제로 하는 운영 방식

이 프로젝트는 아래 운영 가정을 갖고 있다.

- DVT는 Obol Network를 사용한다.
- operator runtime baseline은 Obol `charon-distributed-validator-node`를 사용한다.
- validator signing path는 Web3Signer + KMS 조합을 사용한다.
- 인프라는 4대 bare-metal 서버를 기준으로 한다.
- treasury execution account는 Safe multisig contract를 사용한다.

이 전제가 중요한 이유는,
이 레포가 "아무 staking 환경에나 쓰는 일반 플랫폼"이 아니라
특정한 운영 모델 위에서 정확히 동작하도록 설계됐기 때문이다.

## 레포의 큰 구조

이 레포는 크게 세 층으로 이해하면 된다.

### 1. Runtime Layer

실제 validator stack이 도는 영역이다.

- EL
- CL
- VC
- Charon
- Web3Signer
- monitoring stack

이 영역은 `infra/obol-cdvn` 아래에서 관리한다.

### 2. Control Plane Layer

운영자가 보는 백오피스와 API 영역이다.

- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/db`

이 영역은 inventory, approval, audit, alert, reward, workflow를 담당한다.

### 3. Human Approval Layer

사람 승인이 반드시 필요한 영역이다.

- deposit request 승인
- rollout 승인
- signer 관련 변경 승인
- Safe export 승인
- DKG 관련 위험 단계 승인

즉, 이 레포의 핵심은 "기술 스택"보다도
"runtime + control plane + approval"의 역할 분리다.

## `infra/obol-cdvn`는 정확히 무엇인가

초보자 입장에서 가장 중요한 폴더는 `infra/obol-cdvn`다.

이 디렉토리는

- upstream CDVN baseline을 pinning 해 두고
- 우리 프로젝트 요구사항을 overlay로 덧씌우고
- host별 runtime bundle을 만들고
- 나중에 4대 bare-metal host에 배포하는

runtime automation 레이어다.

쉽게 말해,
"실제로 서버에 올릴 실행 단위"를 만드는 곳이다.

### 이 안의 핵심 하위 디렉토리

- `baseline/`
  - upstream CDVN 기준선 보관
- `overlays/web3signer/`
  - 로컬 validator key 경로 대신 external signer 흐름으로 바꾸는 overlay
- `overlays/observability/`
  - monitoring / scrape / logging 보강 overlay
- `inventory/`
  - cluster와 host 정보를 정의하는 YAML 예시
- `scripts/`
  - render, stage, verify, rollout, preflight, execute 스크립트

## 왜 upstream CDVN을 그대로 쓰지 않고 overlay 방식을 쓰는가

이 질문이 아주 중요하다.

upstream를 그대로 fork해서 막 고치기 시작하면,

- 버전 업이 어려워지고
- 어떤 차이가 우리 커스텀인지 추적하기 어려워지고
- 운영 변경의 감사 가능성이 떨어진다.

그래서 이 레포는 다음 원칙을 쓴다.

- upstream는 baseline으로 둔다.
- 우리 커스텀은 overlay로 분리한다.
- baseline 직접 수정은 최소화한다.

이 방식이 운영팀 입장에서는 훨씬 안전하다.

## 현재 이 레포에 이미 들어간 것

현재 기준으로 이미 구현된 것은 아래다.

- monorepo 기본 구조
- web 운영 화면 골격
- API read endpoint
- auth stub + RBAC guard
- Prisma schema + seed
- CDVN `v1.9.5` baseline pinning
- `web3signer`, `observability` overlay
- host-aware render
- approved `.charon` artifact stage
- verify
- rollout rsync
- host preflight
- rollout execute wrapper
- drift-check
- health-sync

즉, 지금은 "설계 문서만 있는 레포"는 아니다.
이미 runtime automation 진입점까지는 들어가 있다.

## 현재 아직 안 된 것

반대로 아직 남아 있는 것은 아래다.

- 실제 4대 서버의 진짜 inventory 값
- Web3Signer/KMS 실연동 값
- rollback / stop rule
- control plane approval write 연동
- health ingestion pipeline 완성
- alert write workflow
- deposit request write workflow
- Safe proposal write workflow
- shell script CI 테스트

즉, 지금은 "초기 제품 + 배포 자동화 뼈대" 상태라고 이해하면 맞다.

## 이 레포를 초보자가 어떻게 이해하면 좋은가

가장 쉬운 이해 방식은 이렇다.

### 비유 1. CDVN은 엔진이고 이 레포는 운영 센터다

- CDVN은 실제 validator runtime을 돌리는 엔진
- 이 레포는 그 엔진을 여러 대 서버에 배포하고 추적하고 통제하는 운영 센터

### 비유 2. 이 레포는 "배포 가능한 설계서"다

그냥 문서만 있는 것이 아니라,
나중에 서버가 생기면 그대로 `render -> stage -> verify -> rollout -> preflight -> execute`로 이어질 수 있도록
실행 스크립트와 구조를 미리 맞춰 둔 상태다.

## 실제 사용 흐름

이 레포의 runtime 쪽 사용 흐름은 아래 순서로 이해하면 된다.

### 1. cluster/host 정보를 준비한다

어떤 cluster인지, 어떤 host가 있는지, 각 host 주소와 deployment path가 무엇인지 inventory에 적는다.

### 2. rendered bundle을 만든다

`render.sh`가 upstream baseline과 overlay를 합쳐서
host별 runtime 디렉토리를 만든다.

이 단계에서는 아직 실제 서버에 배포하지 않는다.

### 3. approved `.charon` artifact를 stage 한다

`stage-charon-artifacts.sh`가 approved source에서

- `cluster-lock.json`
- `charon-enr-private-key`
- optional `validator-pubkeys.txt`

만 골라 runtime에 넣는다.

중요한 점:
`validator_keys/`, keystore, mnemonic, seed는 넣지 않는다.

### 4. verify 한다

`verify.sh`가 runtime이 baseline 버전, overlay, secret 규칙, staged artifact 규칙을 만족하는지 확인한다.

### 5. rollout 한다

`rollout.sh`가 rendered runtime을 rsync로 대상 경로에 보낸다.

### 6. host preflight를 수행한다

`host-preflight.sh`가 host에서

- docker
- docker compose
- rsync
- curl
- deployment path writable
- disk 여유

같은 것을 점검한다.

### 7. remote compose 실행을 한다

`rollout-exec.sh`가 대상 host에서

- `docker compose config`
- `docker compose pull`
- `docker compose up -d`
- `docker compose ps`

를 순서대로 실행한다.

즉, 초보자 기준으로 외우면 된다.

`render -> stage -> verify -> rollout -> preflight -> execute`

## 지금 당장 이 레포를 어떻게 써야 하나

현재는 bare-metal 서버가 아직 없는 상태를 전제로 하면,
이 레포를 이렇게 쓰는 것이 맞다.

### 1. 문서를 읽어 구조를 이해한다

전체 추천 읽기 순서는 `docs/reading-order.md`를 본다.

초보자가 가장 먼저 볼 핵심 순서는 아래 6개다.

1. `docs/beginner-guide.md`
2. `docs/system-diagrams.md`
3. `docs/dvt-cluster-walkthrough.md`
4. `docs/runtime-inventory-guide.md`
5. `docs/runtime-secrets-guide.md`
6. `docs/bring-up-checklist.md`

### 2. 로컬에서 web/api를 띄워본다

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

이건 control plane 쪽을 보는 흐름이다.

### 3. 로컬에서 runtime automation 흐름을 따라가 본다

예시 inventory로 render:

```bash
infra/obol-cdvn/scripts/render.sh \
  --cluster-file infra/obol-cdvn/inventory/cluster.example.yml \
  --hosts-file infra/obol-cdvn/inventory/hosts.example.yml \
  --output-dir .tmp-cdvn-cluster-render \
  --force
```

verify:

```bash
infra/obol-cdvn/scripts/verify.sh \
  --render-dir .tmp-cdvn-cluster-render
```

artifact stage:

```bash
infra/obol-cdvn/scripts/stage-charon-artifacts.sh \
  --render-dir .tmp-cdvn-cluster-render \
  --host-name operator-1 \
  --approval-file infra/obol-cdvn/scripts/charon-artifact-approval.example.env \
  --source-dir /secure/approved/operator-1
```

rollout dry-run:

```bash
infra/obol-cdvn/scripts/rollout.sh \
  --render-dir .tmp-cdvn-cluster-render \
  --host-name operator-1 \
  --approval-file infra/obol-cdvn/scripts/rollout-approval.example.env
```

preflight dry-run:

```bash
infra/obol-cdvn/scripts/host-preflight.sh \
  --render-dir .tmp-cdvn-cluster-render \
  --host-name operator-1
```

execute dry-run:

```bash
infra/obol-cdvn/scripts/rollout-exec.sh \
  --render-dir .tmp-cdvn-cluster-render \
  --host-name operator-1 \
  --approval-file infra/obol-cdvn/scripts/rollout-approval.example.env
```

즉, 서버가 없어도 "흐름이 어떻게 이어지는지"를 미리 검증할 수 있다.

## 초보자가 특히 조심해야 할 오해

### 오해 1. `.charon`이면 다 복사해도 된다

아니다.

이 레포에서는 `.charon` 전체를 무조건 복사하는 것이 아니라,
실행에 필요한 최소 입력만 allowlist로 stage 한다.

### 오해 2. approval 파일은 그냥 예시라 대충 넘겨도 된다

아니다.

approval은 이 레포의 핵심 안전 경계다.
스크립트도 approval 파일의 cluster, host, policy를 맞춰 본다.

### 오해 3. `git pull`로 각 서버에서 직접 받으면 더 쉬운 것 아닌가

겉보기엔 쉬워도 drift 통제가 어렵다.

그래서 이 레포는 `rendered bundle -> rsync` 모델을 기본 방향으로 본다.

### 오해 4. 이 레포가 deposit를 자동 실행하는 시스템이다

아니다.

이 레포는 request, approval, export, tracking을 중심으로 간다.
direct execution은 기본 목표가 아니다.

## 아주 중요한 안전 원칙

초보자라도 이것만은 반드시 기억해야 한다.

- mnemonic, seed, raw signing key는 앱 DB에 저장하지 않는다.
- validator signing key raw material은 Web3Signer + KMS 경로 밖으로 복사하지 않는다.
- slash risk가 있는 동작은 자동 실행하지 않는다.
- deposit는 자동 서명하지 않는다.
- 위험 작업은 approval 없이 진행하지 않는다.
- 모든 주요 작업은 audit 가능해야 한다.

## 용어 설명

### Validator

Ethereum에서 실제 검증 작업을 수행하는 단위다.

### Node

validator를 지원하는 실행 환경 또는 서버/클라이언트 묶음이다.

### DVT

Distributed Validator Technology.
하나의 validator를 여러 operator가 분산 운영하는 방식이다.

### Obol

DVT 운영을 위한 네트워크/도구 생태계다.

### Charon

Obol DVT에서 distributed validator coordination을 담당하는 핵심 구성요소다.

### CDVN

`charon-distributed-validator-node`.
Obol에서 제공하는 distributed validator node baseline 레포다.

### Web3Signer

validator client가 직접 raw key를 들고 있지 않고,
외부 signer에 서명을 요청하도록 하는 signer 서비스다.

### KMS

key custody를 더 안전하게 유지하기 위한 키 관리 시스템이다.

### Safe

multisig 기반 treasury execution control에 사용하는 지갑/계약이다.

### `.charon`

Charon runtime이 필요로 하는 cluster 관련 파일을 담는 디렉토리다.

### `cluster-lock.json`

cluster가 어떤 validator 집합과 어떤 operator 구성을 갖는지 나타내는 핵심 파일이다.

### `charon-enr-private-key`

operator의 ENR 관련 개인 키 파일이다.

### rendered bundle

inventory와 overlay를 반영해서 host별로 만들어 낸 배포용 runtime 산출물이다.

## 이 문서를 읽은 뒤 다음에 뭘 보면 되나

### 운영 구조를 더 알고 싶다면

- `docs/reading-order.md`
- `docs/system-diagrams.md`
- `docs/dvt-cluster-walkthrough.md`
- `docs/repo-guide.md`
- `docs/architecture.md`

### CDVN baseline과 overlay 원칙을 더 알고 싶다면

- `docs/cdvn-baseline.md`

### `.charon` artifact staging 절차를 더 알고 싶다면

- `docs/cdvn-artifact-staging.md`

### 지금 구현이 어디까지 와 있는지 알고 싶다면

- `docs/cdvn-runtime-handoff.md`

## 아주 짧은 결론

이 레포는 "ETH Treasury staking 운영을 사람이 통제 가능한 방식으로 자동화하려는 레포"다.

핵심은 두 가지다.

- 4대 bare-metal 서버에 같은 방식으로 DVT runtime을 배포할 수 있어야 한다.
- 위험한 작업은 승인과 감사 경계 안에서만 진행되어야 한다.

그래서 이 레포는 단순한 노드 실행 레포가 아니라,
운영 자동화와 승인 통제를 함께 다루는 control plane 레포다.
