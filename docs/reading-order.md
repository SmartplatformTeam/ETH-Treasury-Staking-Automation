# Document Reading Order

## 목적

이 문서는 이 레포의 문서를 어떤 순서로 읽으면 되는지 정리한 안내서다.

핵심은 하나다.

- 초보자는 큰 그림부터 본다.
- 운영자는 준비 문서와 체크리스트까지 이어서 본다.
- 구현자는 마지막에 handoff와 세부 설계 문서로 내려간다.

이 문서를 문서 읽기 순서의 source of truth로 사용한다.

## 가장 추천하는 전체 순서

처음부터 끝까지 가장 자연스럽게 이해하려면 아래 순서가 좋다.

1. `README.md`
   - 레포 전체와 문서 지도를 먼저 본다.
2. `docs/beginner-guide.md`
   - 이 레포가 왜 존재하는지 이해한다.
3. `docs/system-diagrams.md`
   - runtime, control plane, approval 경계를 그림으로 고정한다.
4. `docs/dvt-cluster-walkthrough.md`
   - 신규 DVT cluster를 준비해서 validating까지 올리는 흐름을 시나리오로 본다.
5. `docs/runtime-inventory-guide.md`
   - `cluster.yml`, `hosts.yml`에 무엇을 채워야 하는지 이해한다.
6. `docs/runtime-secrets-guide.md`
   - secret 경로와 `.charon` allowlist 경계를 이해한다.
7. `docs/web3signer-kms-guide.md`
   - Web3Signer + KMS 실연동 전에 어떤 결정을 해야 하는지 본다.
8. `docs/approval-audit-guide.md`
   - artifact stage approval과 rollout approval이 어떻게 분리되는지 본다.
9. `docs/observability-alerting-guide.md`
   - metrics, logs, traces, health sync, alert routing 구조를 본다.
10. `docs/bring-up-checklist.md`
   - 실제 bring-up 시 어떤 순서로 검증하고 멈춰야 하는지 본다.
11. `docs/repo-guide.md`
   - 현재 monorepo 구현 상태를 확인한다.
12. `docs/architecture.md`
   - 서비스 경계와 장기 구조를 본다.
13. `docs/cdvn-baseline.md`
   - upstream CDVN baseline과 overlay 원칙을 본다.
14. `docs/cdvn-artifact-staging.md`
   - approved `.charon` artifact stage 규칙을 깊게 본다.
15. `docs/cdvn-runtime-handoff.md`
   - 현재 runtime automation 상태와 남은 공백, 다음 작업을 확인한다.
16. `docs/product-spec.md`
   - 제품 범위와 기능 정의를 다시 확인한다.
17. `docs/repo-bootstrap.md`
   - 초기 레포 부트스트랩 의도와 기술 스택을 참고한다.
18. `docs/harness-bootstrap.md`
   - Harness Engineering 입력용 가이드가 필요할 때 본다.

공개 저장소로 운영할 계획이면 별도로 아래 문서를 본다.

- `docs/publish-safety-checklist.md`

## 가장 짧은 핵심 순서

시간이 없고 핵심만 빨리 이해해야 하면 아래 6개만 먼저 보면 된다.

1. `docs/beginner-guide.md`
2. `docs/system-diagrams.md`
3. `docs/dvt-cluster-walkthrough.md`
4. `docs/runtime-inventory-guide.md`
5. `docs/runtime-secrets-guide.md`
6. `docs/bring-up-checklist.md`

이 6개를 보면 아래는 바로 이해할 수 있다.

- 이 레포가 왜 필요한가
- 어떤 구조로 나뉘는가
- 실제 운영 흐름이 무엇인가
- 실운영 전에 무엇을 확정해야 하는가
- bring-up 때 무엇을 체크해야 하는가

## 운영자 기준 추천 순서

운영자나 infra 담당자라면 아래 순서가 더 실용적이다.

1. `docs/beginner-guide.md`
2. `docs/system-diagrams.md`
3. `docs/dvt-cluster-walkthrough.md`
4. `docs/runtime-inventory-guide.md`
5. `docs/runtime-secrets-guide.md`
6. `docs/web3signer-kms-guide.md`
7. `docs/approval-audit-guide.md`
8. `docs/observability-alerting-guide.md`
9. `docs/bring-up-checklist.md`
10. `docs/cdvn-runtime-handoff.md`

이 순서는 실제 운영 준비와 handoff 파악에 맞춘 순서다.

## 구현자 기준 추천 순서

코드나 스크립트를 바로 만질 사람이라면 아래 순서가 좋다.

1. `docs/repo-guide.md`
2. `docs/architecture.md`
3. `docs/cdvn-baseline.md`
4. `docs/cdvn-artifact-staging.md`
5. `docs/cdvn-runtime-handoff.md`
6. `infra/obol-cdvn/README.md`
7. `infra/obol-cdvn/scripts/README.md`

이 순서는 "왜 이렇게 만들었는가"보다 "지금 어디까지 구현됐고 어디를 고쳐야 하는가"를 빨리 파악하는 데 맞다.

## 문서별 역할 한 줄 요약

- `docs/beginner-guide.md`
  - 초보자용 큰 그림
- `docs/system-diagrams.md`
  - 그림으로 보는 구조와 경계
- `docs/dvt-cluster-walkthrough.md`
  - 실제 운영 시나리오
- `docs/runtime-inventory-guide.md`
  - inventory 입력값 결정
- `docs/runtime-secrets-guide.md`
  - secret 및 파일 경로 정책
- `docs/web3signer-kms-guide.md`
  - Web3Signer/KMS 실연동 준비
- `docs/approval-audit-guide.md`
  - approval과 audit 분리
- `docs/observability-alerting-guide.md`
  - metrics, logs, alert 운영
- `docs/bring-up-checklist.md`
  - bring-up runbook
- `docs/publish-safety-checklist.md`
  - 공개 저장소 운영 전 점검 기준
- `docs/repo-guide.md`
  - monorepo 구현 상태
- `docs/architecture.md`
  - 장기 구조와 서비스 경계
- `docs/cdvn-baseline.md`
  - baseline + overlay 원칙
- `docs/cdvn-artifact-staging.md`
  - `.charon` staging 규칙
- `docs/cdvn-runtime-handoff.md`
  - 현재 상태와 다음 작업

## 아주 짧은 결론

처음 읽는다면

`README -> beginner-guide -> system-diagrams -> dvt-cluster-walkthrough -> runtime-inventory-guide -> runtime-secrets-guide -> bring-up-checklist`

이 순서로 가는 것이 가장 안전하다.
