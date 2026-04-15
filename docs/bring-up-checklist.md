# Bring Up Checklist

## 목적

이 문서는 신규 DVT cluster를 실제로 bring-up 할 때
무엇을 어느 순서로 확인해야 하는지 정리한 운영 체크리스트다.

`dvt-cluster-walkthrough.md`가 시나리오 설명 문서라면,
이 문서는 실제 실행 전에 하나씩 체크하는 runbook에 가깝다.

## 1. 서버가 오기 전

아래가 문서로 먼저 정리돼 있어야 한다.

- `cluster.yml` 초안
- `hosts.yml` naming 규칙
- Web3Signer endpoint
- KMS naming 규칙
- secret 경로 정책
- approval 파일 저장 정책
- alert 채널

## 2. 서버가 준비된 직후

각 host에 대해 아래를 확인한다.

- 공인 또는 사설 IP
- SSH 접속 가능 여부
- `sshUser`
- 배포 경로 생성 가능 여부
- Docker 설치 정책
- Docker Compose 사용 가능 여부
- 디스크 여유
- 시간 동기화 정책
- open port 정책

## 3. inventory 확정

실운영 전 아래가 채워져 있어야 한다.

- `cluster.yml`
  - name
  - network
  - baselineVersion
  - overlayProfiles
  - Web3Signer 관련 값
  - health sync URL
  - approval policy
- `hosts.yml`
  - host 4대 모두
  - `address`
  - `sshUser`
  - `deploymentPath`
  - `charonExternalHostname`
  - `grafanaPort`
  - `prometheusPort`

## 4. artifact와 approval 준비

각 host 기준으로 아래가 있어야 한다.

- approved `.charon` source
- artifact stage approval
- rollout approval

artifact source에는 아래만 들어가는지 확인한다.

- `cluster-lock.json`
- `charon-enr-private-key`
- optional `validator-pubkeys.txt`

아래가 있으면 stop 한다.

- `validator_keys/`
- mnemonic
- seed
- raw secret

## 5. render

실행:

```bash
infra/obol-cdvn/scripts/render.sh \
  --cluster-file /secure/config/cluster.yml \
  --hosts-file /secure/config/hosts.yml \
  --output-dir .tmp-cdvn-cluster-render \
  --force
```

확인:

- 4개 host runtime이 생성됐는가
- `render-bundle.env`가 생성됐는가
- 각 host runtime에 `.env`, `render-metadata.env`가 있는가

## 6. artifact stage

각 host마다 아래를 수행한다.

- dry-run
- execute
- staging metadata 확인

확인:

- `.charon/cluster-lock.json`
- `.charon/charon-enr-private-key`
- optional `WEB3SIGNER_PUBLIC_KEYS`
- `charon-artifacts-staging.env`

## 7. verify

실행:

```bash
infra/obol-cdvn/scripts/verify.sh \
  --render-dir .tmp-cdvn-cluster-render
```

확인:

- baseline version mismatch가 없는가
- `jwt/jwt.hex`가 render output에 없는가
- overlay 파일이 기대대로 들어갔는가
- staged artifact 규칙이 통과하는가

## 8. rollout dry-run

각 host마다 rollout dry-run을 먼저 본다.

확인:

- approval file이 맞는가
- 대상 host가 맞는가
- destination path가 맞는가
- exclude 정책이 맞는가

## 9. preflight

각 host마다 아래를 확인한다.

- docker
- docker compose
- rsync
- curl
- deployment path writable
- disk 여유
- required file 존재 여부
- 필요하면 `--check-web3signer`

이 단계는 execute 전 마지막 운영 점검이다.

## 10. execute 순서

가능하면 한 번에 4대 다 올리지 않는다.

권장:

1. 한 host에서 dry-run execute 확인
2. 첫 host 실제 execute
3. 상태 확인
4. threshold를 넘지 않는 순서로 나머지 host 순차 execute

운영 정책상 host 순서를 미리 문서로 정해 두는 편이 좋다.

예:

1. `operator-1`
2. `operator-2`
3. `operator-3`
4. `operator-4`

## 11. validating 판정 기준

아래가 함께 충족될 때 validating으로 보는 편이 맞다.

- `docker compose ps`에서 핵심 컨테이너가 정상
- EL / CL sync 상태 정상
- Charon peer 상태 정상
- validator client가 external signer 경로로 정상 연결
- Web3Signer endpoint 건강 상태 정상
- 심각 alert 없음

즉 단순히 컨테이너가 떠 있는 것만으로 validating이라고 보지 않는다.

## 12. stop rule

아래 상황이면 즉시 다음 host 진행을 멈춘다.

- approval mismatch
- render metadata mismatch
- Web3Signer reachability 실패
- `docker compose config` 실패
- `docker compose pull` 실패
- `docker compose up -d` 실패
- Charon peer가 기대 상태에 못 올라옴
- validator client external signer 연결 실패

## 13. rollback 기본 원칙

현재 repo에는 자동 rollback이 없다.
따라서 수동 정책을 미리 정하는 것이 맞다.

최소한 아래를 문서화한다.

- 어떤 실패에서 rollback할지
- 누구 승인으로 rollback할지
- 직전 배포 산출물을 어디에 보관할지
- host별 stop 기준

초기에는 아래 정도로 단순하게 잡아도 된다.

- 새로운 rollout 이후 health가 깨지면 다음 host 진행 중단
- 문제 host는 이전 배포 산출물로 수동 복귀
- rollback도 audit 대상으로 기록

## 14. bring-up 후 확인

bring-up이 끝난 뒤 아래를 남긴다.

- 어떤 approval로 실행했는가
- 어떤 artifact hash를 썼는가
- 어떤 render bundle을 썼는가
- 어떤 host 순서로 올렸는가
- validating 판정 시각
- 남은 known issue

## 아주 짧은 결론

이 체크리스트의 핵심은 아래 한 줄이다.

`render -> stage -> verify -> rollout -> preflight -> execute -> validating 판정`

이 순서를 생략하지 않는 것이 운영 안전성의 핵심이다.
