# Publish Safety Checklist

## 목적

이 문서는 이 레포를 GitHub 같은 공개 저장소에 올릴 때
무엇을 공개해도 되고 무엇은 절대 공개하면 안 되는지 정리한 체크리스트다.

이 레포는 일반 웹앱과 다르다.
문서와 스크립트는 공개 가능하지만,
운영 입력과 runtime 산출물이 섞이면 바로 보안 문제가 될 수 있다.

## 가장 중요한 원칙

공개 저장소와 운영 저장소를 분리한다.

- public repo
  - 코드
  - 문서
  - example inventory
  - example approval
  - baseline / overlay / scripts
- private ops repo 또는 repo 밖 secure 경로
  - 실제 `cluster.yml`, `hosts.yml`
  - 실제 approval 파일
  - rendered bundle
  - `.charon` artifact
  - `jwt.hex`
  - cert / key / CA
  - 내부 URL, 실제 host 주소, 실제 deployment path

즉 public repo는 설계와 automation 코드만,
실운영 입력과 산출물은 private 영역만 담당하게 해야 한다.

## 공개해도 되는 것

아래는 placeholder 또는 일반 구현 문서 기준으로 공개 가능하다.

- `docs/*`
- `apps/*`
- `packages/*`
- `infra/obol-cdvn/baseline/*`
- `infra/obol-cdvn/overlays/*`
- `infra/obol-cdvn/inventory/*.example.yml`
- `infra/obol-cdvn/scripts/*.sh`
- `infra/obol-cdvn/scripts/*example.env`

단, 문서 안 placeholder가 실제 운영값으로 바뀌지 않았는지는 항상 다시 확인해야 한다.

## 공개하면 안 되는 것

아래는 public repo에 올라가면 안 된다.

- 실제 `infra/obol-cdvn/inventory/cluster.yml`
- 실제 `infra/obol-cdvn/inventory/hosts.yml`
- `.tmp-cdvn-*` 산출물 전체
- rendered runtime의 `.env`
- `render-bundle.env`
- `render-metadata.env`
- `charon-artifacts-staging.env`
- `.charon/cluster-lock.json`
- `.charon/charon-enr-private-key`
- `validator-pubkeys.txt`
- `jwt.hex`
- Web3Signer client cert / key / CA
- 실제 rollout approval / artifact approval 파일

특히 `charon-enr-private-key`는 절대 공개되면 안 된다.

## 공개 전에 해야 할 구조 정리

공개 전에는 아래처럼 경계를 분리하는 편이 맞다.

```text
public repo:
  eth-treasury-staking-automation/
    docs/
    apps/
    packages/
    infra/

private ops path:
  /secure/config/
    cluster.yml
    hosts.yml
  /secure/approvals/
    operator-1-rollout.env
    operator-1-charon-stage.env
  /secure/artifacts/
    operator-1/.charon/...
  /var/lib/eth-treasury-secrets/
    <cluster>/...
```

핵심은 두 가지다.

- repo 안에는 example만 둔다.
- 실운영 입력은 repo 밖 secure path에 둔다.

## 공개 전 체크리스트

### 1. ignore 규칙 확인

아래가 `.gitignore`에 들어가 있는지 본다.

- `.tmp-cdvn-*`
- `cluster.yml`, `hosts.yml`
- `.charon` 관련 파일
- `jwt.hex`
- cert / key / CA
- rendered metadata

### 2. 운영 산출물 제거 또는 repo 밖 이동

아래가 repo 안에 있으면 공개 전 정리한다.

- `.tmp-cdvn-artifacts-source`
- `.tmp-cdvn-cluster-render`
- `.tmp-cdvn-deploy`
- 실제 approval 파일
- 실제 inventory 파일

### 3. 로컬 안전 점검 스크립트 실행

```bash
scripts/check-public-repo-safety.sh
```

이 스크립트는 공개 저장소에 남으면 안 되는 대표 파일이 repo 안에 있는지 검사한다.

### 4. 문서 placeholder 확인

문서에 아래가 실제 운영값으로 바뀌지 않았는지 확인한다.

- 실제 host IP / DNS
- 실제 `sshUser`
- 실제 `deploymentPath`
- 실제 `WEB3SIGNER_URL`
- 실제 `healthSyncUrl`
- 실제 fee recipient

### 5. approval과 audit 예시는 example만 남긴다

아래는 example 파일만 남는지 확인한다.

- `rollout-approval.example.env`
- `charon-artifact-approval.example.env`

### 6. public push 전에 마지막 확인

아래 두 질문에 모두 yes일 때만 공개한다.

- 실운영 입력이 repo 밖에 있는가
- repo 안에 남아 있는 파일이 전부 example 또는 문서인가

## GitHub에 올린 뒤 권장 조치

public repo로 운영할 계획이면 아래를 같이 권장한다.

- branch protection
- PR review
- GitHub Actions safety check
- secret scanning
- private ops repo 분리

현재 repo에는 `check-public-repo-safety.sh`와 GitHub Actions safety workflow를 같이 둘 수 있다.

## 이미 잘못 올렸다면

아래 파일이 한 번이라도 public remote에 올라갔다면 단순 삭제로 끝내면 안 된다.

- `charon-enr-private-key`
- `jwt.hex`
- cert / key / CA
- 실제 approval 파일
- 실제 inventory 파일에 들어 있는 내부 주소

이 경우에는 최소한 아래를 검토해야 한다.

- 유출 범위 확인
- Git history 정리
- 관련 secret / cert rotation
- ENR / signer / auth 재검토
- 운영 경로 재점검

## 아주 짧은 결론

이 레포는 public으로 열 수 있다.
하지만 public으로 열 수 있는 것은 코드와 문서뿐이다.

실운영 입력과 runtime 산출물까지 같은 repo에 두면 안 된다.
