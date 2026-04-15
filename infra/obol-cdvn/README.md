# Obol CDVN Runtime

이 디렉토리는 Obol `charon-distributed-validator-node` 기반 operator runtime baseline과
프로젝트별 overlay를 관리하는 위치다.

구성 원칙:

- `baseline/`은 upstream 구조를 최대한 유지한다.
- `overlays/`는 프로젝트별 커스터마이징만 담는다.
- `inventory/`는 4대 bare-metal host와 host별 변수를 정의한다.
- `scripts/`는 render, artifact stage, rollout, preflight, verify, drift-check 같은 자동화 진입점을 둔다.

현재 상태:

- baseline mirror는 `v1.9.5`로 pinning 되어 있다.
- upstream 원본은 `baseline/upstream/` 아래에 보관한다.
- 로컬 helper는 `scripts/render.sh`, `scripts/stage-charon-artifacts.sh`, `scripts/verify-baseline.sh`, `scripts/verify.sh`, `scripts/rollout.sh`, `scripts/host-preflight.sh`, `scripts/rollout-exec.sh`까지 포함한다.

주의사항:

- baseline을 직접 뜯어고치는 방식보다 overlay와 patch 기록을 우선한다.
- validator signing key raw material은 이 디렉토리에 직접 저장하지 않는다.
- DKG artifact와 deposit artifact의 저장/승인/export 경계는 control plane 문서를 따른다.
