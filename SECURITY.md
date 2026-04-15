# Security Policy

## 목적

이 문서는 이 저장소와 관련된 보안 취약점, 민감 정보 노출, 운영 경계 위반을 어떻게 보고하고 처리할지 정리한다.

이 레포는 staking runtime automation과 approval 경계를 다루므로
일반적인 버그보다 더 민감한 문제가 존재할 수 있다.

## 보안상 민감한 영역

특히 아래 영역은 민감하게 다룬다.

- validator key material
- mnemonic / seed / raw secret
- `.charon` artifact
- `jwt.hex`
- Web3Signer client cert / key / CA
- approval 우회 가능성
- slash risk가 있는 자동화 경계
- 실제 host 주소, 내부 URL, deployment path

## 공개 issue로 올리면 안 되는 사례

아래는 공개 issue나 PR에 그대로 올리면 안 된다.

- 실제 secret 파일 내용
- 실제 inventory 값
- 실제 approval 파일
- 실제 rendered runtime 산출물
- 실제 `charon-enr-private-key`
- exploit 재현에 필요한 민감한 내부 정보

즉 취약점을 설명하더라도
민감한 운영 입력은 공개 채널에 붙이면 안 된다.

## 보안 이슈 보고 방법

private vulnerability reporting 기능이 활성화되어 있다면 그 경로를 우선 사용한다.

그 기능이 없으면 아래 원칙으로 보고한다.

- 공개 issue에는 민감한 세부 정보 없이 현상만 적는다.
- maintainer가 안전한 비공개 채널을 안내할 때까지 exploit detail을 공개하지 않는다.
- secret 노출이 의심되면 즉시 rotation이 필요한지 먼저 판단한다.

maintainer는 공개 운영 시 private vulnerability reporting 또는 별도 security contact를 설정하는 편이 맞다.

## maintainer triage 기준

아래처럼 분류하는 편이 좋다.

### Critical

- raw secret 또는 signer credential 노출
- approval 우회로 slash risk 동작 가능
- 무단 deposit / withdrawal 관련 실행 가능성

### High

- 실제 inventory / host 정보 대량 노출
- rendered runtime 산출물 노출
- Web3Signer 인증 우회 가능성

### Medium

- audit 누락
- approval mismatch 검증 누락
- observability나 health sync 경계 누락

### Low

- 예시 문서의 혼란
- placeholder 관리 미흡

## 노출 사고가 발생했을 때

아래 파일 또는 정보가 public remote에 올라갔다면 단순 삭제로 끝내면 안 된다.

- `charon-enr-private-key`
- `jwt.hex`
- cert / key / CA
- 실제 approval 파일
- 실제 `cluster.yml`, `hosts.yml`

최소한 아래를 검토한다.

1. 노출 범위 확인
2. Git history 정리 필요 여부 확인
3. secret / cert rotation
4. approval 및 rollout 경로 재검토
5. 관련 host와 signer 연결 상태 재점검

## public repo 운영 시 권장 가드레일

이 저장소를 공개 운영할 경우 아래를 권장한다.

- branch protection
- mandatory PR review
- secret scanning
- `scripts/check-public-repo-safety.sh`
- GitHub Actions public repo safety workflow
- 실제 운영 입력을 repo 밖 secure path 또는 private ops repo로 분리

## 지원 범위

현재 이 저장소에서 보안적으로 지원하는 방향은 아래다.

- public-safe 문서와 example 파일 유지
- secret과 runtime 산출물의 repo 외부 분리
- approval / audit 경계 유지
- dangerous automation 확대 억제

반대로 아래는 의도적으로 지원하지 않는다.

- mnemonic 자동 보관
- raw validator key custody를 앱이 직접 담당하는 구조
- approval 없는 slash-risk 실행

## 기여자에게 요청하는 사항

보안 관련 변경을 제안할 때는 아래를 함께 적어 주는 편이 좋다.

- 어떤 위협 모델을 줄이는가
- 어떤 운영 경계를 강화하는가
- 기존 approval 경계에 영향이 있는가
- 문서와 public repo safety 기준을 같이 갱신했는가

## 아주 짧은 결론

이 저장소의 보안 정책 핵심은 아래 두 가지다.

- secret, real ops input, runtime artifact는 public repo에 두지 않는다.
- approval과 slash-risk 경계는 기능보다 우선한다.
