# CDVN Artifact Staging

## 목적

이 문서는 approved DKG / cluster artifact를 rendered runtime에 어떻게 반영할지 정리한다.

핵심 목표는 두 가지다.

- validating에 필요한 `.charon` runtime 입력만 stage 한다.
- validator signing key raw material은 runtime bundle과 이 레포에 복사하지 않는다.

## staging 대상

현재 `web3signer` overlay 기준으로 runtime에 stage 하는 파일은 아래만 허용한다.

- `.charon/cluster-lock.json`
- `.charon/charon-enr-private-key`
- `validator-pubkeys.txt`
  - 선택 사항
  - `WEB3SIGNER_FETCH=false`일 때는 필수

`stage-charon-artifacts.sh`는 위 allowlist만 runtime에 복사한다.

## staging 금지 대상

아래는 source dir 안에 있어도 runtime에 복사하지 않는다.

- `.charon/validator_keys/`
- `keystore-*.json`
- keystore password 파일
- mnemonic, seed, raw secret
- deposit data export 파일

즉 approved DKG output 전체를 runtime에 통째로 넣는 방식이 아니라,
runtime 실행에 필요한 최소 `.charon` 입력만 추출하는 방식이다.

## source dir 계약

기본 입력은 `--source-dir` 하나다.

다음 두 레이아웃 중 하나를 지원한다.

```text
/secure/approved/operator-1/
  cluster-lock.json
  charon-enr-private-key
  validator-pubkeys.txt
```

```text
/secure/approved/operator-1/
  .charon/
    cluster-lock.json
    charon-enr-private-key
    validator_keys/
  validator-pubkeys.txt
```

두 번째 구조처럼 `validator_keys/`가 있어도 stage 스크립트는 이를 복사하지 않는다.

필요하면 아래처럼 개별 파일 경로를 override 할 수 있다.

- `--cluster-lock-file`
- `--enr-file`
- `--pubkeys-file`

## 승인 입력

artifact stage는 rollout approval과 분리한다.

예시 파일:

- `infra/obol-cdvn/scripts/charon-artifact-approval.example.env`

필수 값:

- `APPROVAL_STATUS=APPROVED`
- `APPROVAL_POLICY=charon-artifact-stage`
- `CLUSTER_NAME`
- `HOST_NAME`

## 실행 방법

dry-run:

```bash
infra/obol-cdvn/scripts/stage-charon-artifacts.sh \
  --render-dir .tmp-cdvn-cluster-render \
  --host-name operator-1 \
  --approval-file infra/obol-cdvn/scripts/charon-artifact-approval.example.env \
  --source-dir /secure/approved/operator-1
```

execute:

```bash
infra/obol-cdvn/scripts/stage-charon-artifacts.sh \
  --render-dir .tmp-cdvn-cluster-render \
  --host-name operator-1 \
  --approval-file /secure/approvals/operator-1-charon-stage.env \
  --source-dir /secure/approved/operator-1 \
  --execute
```

## stage 결과

execute가 끝나면 rendered runtime에 아래가 생긴다.

- `.charon/cluster-lock.json`
- `.charon/charon-enr-private-key`
- `validator-pubkeys.txt` if present
- `charon-artifacts-staging.env`

`charon-artifacts-staging.env`에는 approval id, source path, sha256, staged 시각이 기록된다.

## 검증 흐름

권장 순서는 아래다.

1. `render.sh`
2. `stage-charon-artifacts.sh`
3. `verify.sh`
4. `rollout.sh`
5. `host-preflight.sh`
6. `rollout-exec.sh`

`verify.sh`는 staging metadata가 있으면 아래를 확인한다.

- `.charon/cluster-lock.json` 존재
- `.charon/charon-enr-private-key` 존재
- `web3signer` overlay에서는 `.charon/validator_keys`가 stage 되지 않았는지 확인
- `WEB3SIGNER_FETCH=false`일 때 `WEB3SIGNER_PUBLIC_KEYS` 존재

## 현재 남아 있는 공백

- 실제 DKG ceremony 산출물을 어디서 approval 상태로 보관할지 control plane 연동은 아직 없다.
- `validator-pubkeys.txt`를 `cluster-lock.json`에서 자동 추출하는 기능은 아직 없다.
- remote signer provider가 Lodestar 외 client까지 확장되면 staging allowlist 재검토가 필요하다.
- deployed host의 `.charon` 실제 파일과 staging metadata hash를 비교하는 원격 검증은 아직 없다.
