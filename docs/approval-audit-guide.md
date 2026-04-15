# Approval Audit Guide

## 목적

이 문서는 runtime 배포 과정에서 approval과 audit를 어떻게 운영해야 하는지 설명한다.

현재 repo는 파일 기반 approval 입력을 받는다.
이것은 임시 땜질이 아니라, 승인 경계를 먼저 분리해 두기 위한 계약이다.

## 왜 approval을 둘로 나누나

현재 runtime 쪽에는 최소 두 종류의 승인이 있다.

- `.charon` artifact stage approval
- rollout approval

이 둘을 나누는 이유는 명확하다.

- artifact 승인
  - 어떤 DKG / cluster artifact를 runtime에 넣을지 승인
- rollout 승인
  - 그 runtime을 실제 host에 배포할지 승인

둘을 하나로 합치면
"어떤 artifact를 쓸지"와 "언제 서버에 올릴지"가 섞여 버린다.

## 현재 스크립트가 읽는 approval 형식

### rollout approval

현재 `rollout.sh`, `rollout-exec.sh`는 아래 형식을 읽는다.

```env
APPROVAL_ID=approval_example_rollout_001
APPROVAL_STATUS=APPROVED
APPROVAL_POLICY=rollout
CLUSTER_NAME=treasury-mainnet-obol-a
HOST_NAME=operator-1
APPROVED_BY=approver@example.com
APPROVED_AT=2026-04-15T01:00:00Z
```

### artifact stage approval

현재 `stage-charon-artifacts.sh`는 아래 형식을 읽는다.

```env
APPROVAL_ID=approval_example_charon_artifact_stage_001
APPROVAL_STATUS=APPROVED
APPROVAL_POLICY=charon-artifact-stage
CLUSTER_NAME=treasury-mainnet-obol-a
HOST_NAME=operator-1
APPROVED_BY=approver@example.com
APPROVED_AT=2026-04-15T02:00:00Z
```

핵심은 아래 세 값이 runtime metadata와 반드시 맞아야 한다는 점이다.

- `APPROVAL_POLICY`
- `CLUSTER_NAME`
- `HOST_NAME`

## 권장 운영 역할 분리

사람 역할도 분리하는 편이 맞다.

- requester
  - 작업 요청을 올리는 사람
- approver
  - 승인 여부를 결정하는 사람
- operator
  - 실제 script를 실행하는 사람
- auditor
  - 사후 검토를 보는 사람

한 사람이 여러 역할을 가질 수는 있어도,
문서와 로그에는 역할이 분리되어 남는 편이 좋다.

## approval 파일 저장 구조 권장안

초기에는 파일 기반으로 가되 저장 구조를 일찍 고정하는 것이 좋다.

예시:

```text
/secure/approvals/
  active/
    operator-1-charon-stage.env
    operator-1-rollout.env
    operator-2-charon-stage.env
    operator-2-rollout.env
  archive/
    2026-04-15/
      approval_example_rollout_001.env
      approval_example_charon_artifact_stage_001.env
```

더 엄격하게 가려면 아래처럼 naming을 통일해도 된다.

```text
<date>-<cluster>-<host>-<policy>-<approval_id>.env
```

예시:

```text
2026-04-15-treasury-mainnet-obol-a-operator-1-rollout-approval_example_rollout_001.env
```

## approval 외에 함께 남겨야 하는 증빙

approval 파일만 있으면 충분하지 않다.
아래도 같이 남기는 편이 맞다.

- render 시각
- render bundle 경로 또는 hash
- artifact staging metadata
- rollout 대상 경로
- 실행자
- 실행 시각
- dry-run 결과
- execute 결과

현재 repo에는 일부 metadata가 이미 남는다.

- `render-metadata.env`
- `charon-artifacts-staging.env`

이 둘은 approval 증빙과 함께 보관하는 것이 좋다.

## audit에서 최소한 남겨야 할 것

사후 감사 기준으로 아래 질문에 답할 수 있어야 한다.

- 누가 요청했는가
- 누가 승인했는가
- 언제 승인했는가
- 어떤 cluster와 host를 대상으로 했는가
- 어떤 artifact를 썼는가
- 실제로 어떤 경로에 배포했는가
- dry-run과 execute 결과가 무엇이었는가

## 운영 중 stop rule

아래 상황이면 approval이 있어도 작업을 멈추는 것이 맞다.

- approval의 `HOST_NAME`과 실제 대상 host가 다르다
- approval의 `CLUSTER_NAME`과 render metadata가 다르다
- policy mismatch가 난다
- approval status가 `APPROVED`가 아니다
- artifact source와 staging metadata가 다르다

즉 approval은 "있으면 무조건 진행"이 아니라
"정합성이 맞을 때만 진행"이다.

## control plane으로 넘어갈 때의 목표

지금은 파일 기반이다.
나중에는 아래 둘 중 하나로 가는 것이 자연스럽다.

- approval service가 이 env 형식으로 export
- script가 API에서 approval status를 직접 조회

어느 쪽이든 지금의 핵심 계약은 유지해야 한다.

- host 단위 승인
- policy 단위 승인
- 승인자와 시각 기록
- audit trace 보존

## 운영 질문 체크리스트

실운영 전에 아래를 정해야 한다.

- artifact stage approval은 누가 내리는가
- rollout approval은 누가 내리는가
- 실행자는 approver와 분리할 것인가
- approval 파일은 어디에 저장할 것인가
- archive는 얼마나 보관할 것인가
- 나중에 API 연동 시 현재 파일 계약을 어떻게 이어갈 것인가

## 최소 완료 기준

이 문서 기준으로 approval/audit 준비가 끝났다고 보려면 아래가 충족되어야 한다.

- artifact stage approval과 rollout approval이 분리돼 있다.
- approval 파일 naming 규칙이 있다.
- active와 archive 저장 경로가 있다.
- render metadata와 staging metadata를 같이 보관하는 정책이 있다.
- 누가 요청하고 누가 승인하는지 역할이 정리돼 있다.
