# Runtime Inventory Guide

## 목적

이 문서는 `infra/obol-cdvn/inventory/cluster.example.yml`, `hosts.example.yml`를
실제 운영용 입력으로 바꿀 때 무엇을 채워야 하는지 설명한다.

핵심은 단순하다.

- `cluster.yml`은 cluster 공통값
- `hosts.yml`은 host별 개별값

현재 스크립트 기준으로는 `render.sh` 실행 시 이 두 파일 경로를 명시적으로 넘기는 방식으로 쓴다.

## 이 문서가 답하는 질문

- `cluster.yml`과 `hosts.yml`은 무엇이 다른가
- 어떤 값은 미리 확정해야 하고 어떤 값은 나중에 정할 수 있는가
- 4대 bare-metal host가 아직 없어도 무엇부터 채워야 하는가
- 어떤 값이 바뀌면 render를 다시 해야 하는가

## inventory를 왜 먼저 확정해야 하나

이 레포에서 inventory는 메모장이 아니다.

- `render.sh`가 inventory를 읽어 host별 runtime bundle을 만든다.
- `rollout.sh`, `host-preflight.sh`, `rollout-exec.sh`가 rendered metadata를 기준으로 움직인다.
- approval file도 cluster 이름, host 이름, policy를 inventory 결과와 맞춰야 한다.

즉 inventory가 흔들리면 이후 단계 전체가 흔들린다.

## `cluster.yml`과 `hosts.yml`의 역할

### `cluster.yml`

cluster 전체에 공통으로 적용되는 값이다.

- cluster 이름
- network
- baseline version
- overlay profile
- signer 방식
- health sync endpoint
- approval policy

### `hosts.yml`

4대 host 각각에 대해 달라지는 값이다.

- host 이름
- 주소
- SSH user
- deployment path
- 외부 hostname
- monitoring port

쉽게 말하면:

- `cluster.yml`은 "우리 cluster는 어떤 운영 정책으로 돌아가나"
- `hosts.yml`은 "각 서버는 어디에 있고 어떻게 접속하나"

## `cluster.yml` 필드 설명

아래 값은 실제 운영에서 거의 반드시 채워야 한다.

- `name`
  - cluster의 고정 식별자다.
  - 예: `treasury-mainnet-obol-a`
  - 운영 중간에 바꾸지 않는 이름으로 잡는 게 맞다.
- `network`
  - `mainnet`, `holesky` 같은 네트워크 이름이다.
- `baselineVersion`
  - 현재 pinned baseline과 맞춰야 한다.
  - 지금 기준 값은 `v1.9.5`다.
- `overlayProfiles`
  - 현재는 보통 `web3signer,observability`를 사용한다.
- `threshold`
  - 예: `3`
  - DVT threshold 값을 의미한다.
- `operatorCount`
  - 예: `4`
  - 현재 운영 가정은 4대 host다.
- `composeEnvSample`
  - baseline의 어떤 env sample을 기준으로 할지 지정한다.
  - 예: `.env.sample.mainnet`
- `signerMode`
  - 현재 운영 기준은 `web3signer-kms`다.
- `relayMode`
  - relay 사용 방식에 대한 운영 라벨이다.
  - 현 예시는 `obol-default`다.
- `monitoringClusterName`
  - Prometheus/Grafana/Loki 쪽에서 cluster 식별용으로 쓰는 이름이다.
  - 일반적으로 `name`과 같게 두는 편이 안전하다.
- `serviceOwner`
  - 운영 주체를 나타내는 문자열이다.
  - 예: `treasury-ops`
- `web3signerUrl`
  - validator client가 접근할 Web3Signer base URL이다.
- `web3signerMetricsTarget`
  - Prometheus scrape target으로 쓸 host:port 값이다.
- `web3signerFetch`
  - `true`면 Web3Signer에서 pubkey를 fetch한다.
  - `false`면 `validator-pubkeys.txt`를 stage 해서 `WEB3SIGNER_PUBLIC_KEYS`를 넣어야 한다.
- `web3signerFetchIntervalMs`
  - pubkey fetch 주기다.
- `feeRecipientAddress`
  - fee recipient 정책 주소다.
- `healthSyncUrl`
  - `health-sync.sh`가 POST할 control plane endpoint다.
- `deploymentRoot`
  - cluster 공통 배포 기준 경로다.
  - host별 `deploymentPath`와 일치시키는 편이 운영이 단순하다.
- `approvalPolicy`
  - 현재 rollout은 보통 `rollout`을 쓴다.

## `hosts.yml` 필드 설명

아래 값은 host별로 채워야 한다.

- `name`
  - approval과 render metadata에서 기준이 되는 host 식별자다.
  - 예: `operator-1`
- `address`
  - SSH 또는 원격 배포에 사용할 실제 host 주소다.
- `role`
  - 지금은 주로 `dv-operator` 정도의 분류값이다.
- `profile`
  - host 프로파일 문자열이다.
  - 지금은 `baseline` 정도로 시작하면 된다.
- `region`
  - 운영 위치 또는 인프라 영역 식별자다.
- `nickname`
  - Charon nickname이나 운영 표시용 이름이다.
- `charonExternalHostname`
  - Charon P2P 외부 hostname이다.
- `monitoringPeer`
  - monitoring 라벨이나 peer 식별용 값이다.
- `grafanaPort`
  - host별 Grafana 포트다.
- `prometheusPort`
  - host별 Prometheus 포트다.
- `sshUser`
  - `rollout.sh`, `host-preflight.sh`, `rollout-exec.sh`에서 사용할 SSH user다.
- `deploymentPath`
  - 실제 rsync 대상이자 compose 실행 디렉토리다.

## 값을 채우는 순서

실제 서버가 아직 없어도 아래 순서로 채우면 된다.

1. `cluster.yml`
2. host naming 규칙
3. 예상 `deploymentPath`
4. 예상 `charonExternalHostname`
5. 나중에 서버가 준비되면 `address`, `sshUser`, port만 확정

즉 bare-metal host가 아직 없더라도 cluster 수준 문서는 먼저 고정할 수 있다.

## 권장 저장 위치

실제 운영용 inventory는 repo 안에 바로 두기보다 별도 secure config 경로에 두는 편이 낫다.

예시:

```text
/secure/config/
  cluster.yml
  hosts.yml
```

현재 스크립트 호출 예시는 아래와 같다.

```bash
infra/obol-cdvn/scripts/render.sh \
  --cluster-file /secure/config/cluster.yml \
  --hosts-file /secure/config/hosts.yml \
  --output-dir .tmp-cdvn-cluster-render \
  --force
```

## 실사용 템플릿 예시

아래 예시는 placeholder를 채워 쓰는 운영용 템플릿이다.

```yaml
cluster:
  name: treasury-mainnet-obol-a
  network: mainnet
  baselineVersion: v1.9.5
  overlayProfiles: web3signer,observability
  threshold: 3
  operatorCount: 4
  composeEnvSample: .env.sample.mainnet
  signerMode: web3signer-kms
  relayMode: obol-default
  monitoringClusterName: treasury-mainnet-obol-a
  serviceOwner: treasury-ops
  web3signerUrl: https://web3signer.example.internal:9000
  web3signerMetricsTarget: web3signer.example.internal:9000
  web3signerFetch: true
  web3signerFetchIntervalMs: 384000
  feeRecipientAddress: 0xREPLACE_ME
  healthSyncUrl: https://ops-api.example.internal/v1/internal/cdvn/health-sync
  deploymentRoot: /opt/obol/treasury-mainnet-obol-a
  approvalPolicy: rollout
```

```yaml
hosts:
  - name: operator-1
    address: REPLACE_WITH_IP_OR_DNS
    role: dv-operator
    profile: baseline
    region: ap-northeast-2
    nickname: treasury-op-1
    charonExternalHostname: charon-1.example.com
    monitoringPeer: peer-1
    grafanaPort: 3301
    prometheusPort: 9091
    sshUser: ubuntu
    deploymentPath: /opt/obol/treasury-mainnet-obol-a
  - name: operator-2
    address: REPLACE_WITH_IP_OR_DNS
    role: dv-operator
    profile: baseline
    region: ap-northeast-2
    nickname: treasury-op-2
    charonExternalHostname: charon-2.example.com
    monitoringPeer: peer-2
    grafanaPort: 3302
    prometheusPort: 9092
    sshUser: ubuntu
    deploymentPath: /opt/obol/treasury-mainnet-obol-a
  - name: operator-3
    address: REPLACE_WITH_IP_OR_DNS
    role: dv-operator
    profile: baseline
    region: ap-northeast-2
    nickname: treasury-op-3
    charonExternalHostname: charon-3.example.com
    monitoringPeer: peer-3
    grafanaPort: 3303
    prometheusPort: 9093
    sshUser: ubuntu
    deploymentPath: /opt/obol/treasury-mainnet-obol-a
  - name: operator-4
    address: REPLACE_WITH_IP_OR_DNS
    role: dv-operator
    profile: baseline
    region: ap-northeast-2
    nickname: treasury-op-4
    charonExternalHostname: charon-4.example.com
    monitoringPeer: peer-4
    grafanaPort: 3304
    prometheusPort: 9094
    sshUser: ubuntu
    deploymentPath: /opt/obol/treasury-mainnet-obol-a
```

## 언제 inventory를 다시 render 해야 하나

아래 값이 바뀌면 render를 다시 하는 것이 맞다.

- cluster 이름
- baseline version
- overlay profile
- Web3Signer URL
- deployment path
- host address
- host nickname
- hostname

즉 inventory는 운영 중에도 바뀔 수 있지만, 바뀌면 그냥 메모만 고치는 게 아니라 render와 verify를 다시 해야 한다.

## 흔한 실수

- `baselineVersion`을 pinned 값과 다르게 적는다.
- `operatorCount`는 4인데 hosts는 3개만 적는다.
- `deploymentRoot`와 `deploymentPath`를 서로 다르게 두고 이유를 기록하지 않는다.
- `web3signerFetch=false`인데 pubkey 입력 절차를 준비하지 않는다.
- `sshUser`와 `address`를 비워 둔 채 rollout 준비를 시작한다.

## 최소 완료 기준

이 문서 기준으로 inventory 준비가 끝났다고 보려면 아래가 충족되어야 한다.

- `cluster.yml`의 공통값이 확정되어 있다.
- `hosts.yml`에 4대 host 이름과 예상 deployment path가 있다.
- Web3Signer endpoint와 health sync endpoint가 placeholder가 아닌 실제 운영 결정을 반영한다.
- approval 정책 이름이 rollout 파일과 일치한다.
- `render.sh`를 example이 아닌 실사용 inventory 경로로 실행할 수 있다.
