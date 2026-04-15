# Runtime Secrets Guide

## 목적

이 문서는 bare-metal host에 어떤 secret과 파일 경로가 필요한지 정리한다.

이 레포는 secret을 많이 다루는 것처럼 보이지만,
실제 원칙은 반대다.

- raw validator key를 앱 DB에 두지 않는다.
- mnemonic, seed, keystore를 일반 runtime 경로로 복사하지 않는다.
- runtime에 정말 필요한 최소 파일만 stage 하거나 mount 한다.

## 이 문서가 답하는 질문

- 어떤 파일은 repo에 있으면 안 되는가
- 어떤 파일은 rendered runtime에 들어갈 수 있는가
- 어떤 파일은 host의 별도 secret 경로에만 있어야 하는가
- `host-preflight.sh --required-file`에는 무엇을 넣어야 하는가

## 절대 넣으면 안 되는 것

아래는 repo, 일반 runtime bundle, control plane DB 어디에도 넣으면 안 된다.

- validator signing keystore
- mnemonic
- seed phrase
- raw private key material
- keystore password file를 포함한 raw key custody 자료

현재 운영 기준에서는 validator signing path가 `Web3Signer + KMS`이므로
validator client가 로컬 keystore를 들고 있는 구조를 목표로 하지 않는다.

## rendered runtime에 들어갈 수 있는 것

현재 `stage-charon-artifacts.sh`가 allowlist로 stage 하는 것은 아래뿐이다.

- `.charon/cluster-lock.json`
- `.charon/charon-enr-private-key`
- optional `validator-pubkeys.txt`

즉 `.charon` 전체를 무조건 복사하는 구조가 아니다.

## host의 별도 secret 경로에 두어야 하는 것

운영상 아래 파일은 host의 별도 secret 디렉토리에 두는 편이 맞다.

- `jwt.hex`
- Web3Signer client certificate
- Web3Signer client key
- Web3Signer CA certificate
- mTLS 또는 custom auth가 있다면 그에 필요한 추가 파일

## 권장 파일 경로 구조

아래처럼 runtime 배포 경로와 secret 경로를 분리하는 것을 권장한다.

```text
/opt/obol/treasury-mainnet-obol-a/
  docker-compose.yml
  docker-compose.override.yml
  .env
  .charon/
  data/
  jwt/

/var/lib/eth-treasury-secrets/treasury-mainnet-obol-a/
  jwt/
    jwt.hex
  web3signer/
    client.crt
    client.key
    ca.crt
```

핵심은 다음 두 가지다.

- 배포 산출물과 secret 저장소를 분리한다.
- secret은 host별 경로 규칙을 고정한다.

## 파일별 운영 정책

### `jwt/jwt.hex`

- baseline mirror에는 두지 않는다.
- render 단계에서는 빈 `jwt/` 디렉토리만 남긴다.
- 실제 host에 올릴 때 생성하거나 별도 secure source에서 주입한다.

### `.charon/cluster-lock.json`

- cluster 공통 artifact다.
- stage approval이 있어야 한다.
- host별 runtime에 복사될 수 있다.

### `.charon/charon-enr-private-key`

- host별로 다른 파일이다.
- stage approval이 있어야 한다.
- host 이름과 artifact source가 맞아야 한다.

### `validator-pubkeys.txt`

- optional이다.
- `WEB3SIGNER_FETCH=false`일 때 필요하다.
- stage 시 `WEB3SIGNER_PUBLIC_KEYS`로 `.env`에 반영된다.

### Web3Signer cert/key/CA

- 현재 repo가 자동 생성하지 않는다.
- host preflight에서 `--required-file`로 존재 여부를 검사하는 쪽이 맞다.
- runtime 안으로 복사하기보다 mount path나 host path 기준으로 관리하는 편이 안전하다.

## 단계별로 필요한 파일

### 1. render 전

필수 secret은 없다.
이 단계에서는 inventory와 baseline만 있으면 된다.

### 2. stage 전

아래가 필요하다.

- approved `.charon` artifact source
- artifact stage approval file

### 3. rollout 전

아래가 준비되어 있는지 확인하는 편이 좋다.

- host별 secret path
- `jwt.hex` 생성 계획
- Web3Signer cert/key/CA 경로
- rollout approval file

### 4. preflight 전

`host-preflight.sh`에 `--required-file`로 아래를 붙이는 것이 좋다.

- `/var/lib/eth-treasury-secrets/<cluster>/jwt/jwt.hex`
- `/var/lib/eth-treasury-secrets/<cluster>/web3signer/client.crt`
- `/var/lib/eth-treasury-secrets/<cluster>/web3signer/client.key`
- `/var/lib/eth-treasury-secrets/<cluster>/web3signer/ca.crt`

실제 경로는 운영 정책에 맞게 바꾸면 된다.

### 5. execute 전

최소한 아래가 준비되어 있어야 한다.

- compose가 읽는 `.env`
- staged `.charon` files
- `jwt.hex`
- Web3Signer 연결에 필요한 cert 또는 auth file

## 권한과 소유권 정책

host에서 secret 파일은 아래 기준으로 두는 편이 맞다.

- 일반 운영 사용자가 읽을 수 없게 한다.
- runtime을 실행하는 계정 또는 root만 읽게 한다.
- key file은 certificate보다 더 좁은 권한을 둔다.
- secret 디렉토리는 host별 backup 정책과 분리해 관리한다.

예를 들어:

- `client.key`는 가장 강한 권한 제한
- `ca.crt`는 상대적으로 덜 민감하지만 still controlled
- `jwt.hex`도 world-readable이면 안 된다

## preflight에 넣을 권장 체크

현재 `host-preflight.sh`는 required file 존재 여부를 확인할 수 있다.
실제 운영에서는 아래처럼 쓰는 게 좋다.

```bash
infra/obol-cdvn/scripts/host-preflight.sh \
  --render-dir .tmp-cdvn-cluster-render \
  --host-name operator-1 \
  --required-file /var/lib/eth-treasury-secrets/treasury-mainnet-obol-a/jwt/jwt.hex \
  --required-file /var/lib/eth-treasury-secrets/treasury-mainnet-obol-a/web3signer/client.crt \
  --required-file /var/lib/eth-treasury-secrets/treasury-mainnet-obol-a/web3signer/client.key \
  --required-file /var/lib/eth-treasury-secrets/treasury-mainnet-obol-a/web3signer/ca.crt
```

## rotation과 교체 정책

아래 상황에서는 secret 경로와 파일 상태를 다시 점검해야 한다.

- JWT 재발급
- Web3Signer certificate 교체
- KMS 인증서 체인 교체
- host 재설치
- deployment path 변경

secret을 교체할 때는 아래 순서가 안전하다.

1. 새 파일 준비
2. preflight로 존재 확인
3. dry-run execute
4. threshold를 넘지 않게 한 host씩 적용
5. validating 상태 재확인

## 공개 저장소로 운영할 때

이 레포를 public GitHub 저장소로 둘 수는 있다.
하지만 secret과 runtime 산출물은 절대 같은 repo에 두면 안 된다.

즉 아래처럼 분리해야 한다.

- public repo
  - 코드
  - 문서
  - example inventory
  - example approval
- private path 또는 private ops repo
  - 실제 `cluster.yml`, `hosts.yml`
  - approval 실파일
  - `.charon` artifact
  - `jwt.hex`
  - cert / key / CA
  - rendered bundle

공개 전 점검은 `docs/publish-safety-checklist.md`와 `scripts/check-public-repo-safety.sh`를 기준으로 본다.

## 흔한 실수

- `.charon`이면 안전하다고 생각하고 전체 디렉토리를 복사한다.
- `jwt.hex`를 repo 안에 두고 관리하려 한다.
- mTLS를 쓸 계획인데 cert/key/CA path를 아직 정하지 않는다.
- `WEB3SIGNER_FETCH=false`인데 `validator-pubkeys.txt` source를 준비하지 않는다.
- secret 경로와 deployment path를 같은 디렉토리로 섞어 둔다.

## 최소 완료 기준

이 문서 기준으로 secret/file path 준비가 끝났다고 보려면 아래가 충족되어야 한다.

- host secret root path가 정해져 있다.
- `jwt.hex` 생성 또는 배치 방식이 정해져 있다.
- Web3Signer cert/key/CA 경로가 정해져 있다.
- preflight에 넣을 required file 목록이 정리돼 있다.
- `.charon` allowlist와 금지 항목을 운영자가 이해하고 있다.
