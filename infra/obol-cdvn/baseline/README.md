# Baseline Mirror

이 디렉토리는 Obol `charon-distributed-validator-node` upstream baseline을 버전 pinning과 함께
mirror 하는 위치다.

현재 반영 상태:

- pinned upstream repo: `ObolNetwork/charon-distributed-validator-node`
- pinned upstream ref: `v1.9.5`
- pinned upstream commit: `d8110b1945a5d4d9e21827d5cae94e837bbcb457`
- mirrored layout: `upstream/`

구성:

- `VERSION`
  - 현재 레포가 채택한 upstream ref와 commit
- `VERSION.example`
  - pinning metadata 형식 예시
- `upstream/`
  - upstream compose, env sample, monitoring, client helper script mirror

주의사항:

- upstream 원본은 `upstream/` 아래에만 둔다.
- 로컬 커스터마이징은 `baseline` 직접 수정 대신 `overlays/`와 `scripts/`에서 처리한다.
- `jwt/jwt.hex` 같이 환경별로 새로 생성해야 하는 secret file은 mirror에 포함하지 않는다.
- validator signing key raw material은 이 디렉토리에 저장하지 않는다.

다음 작업:

1. `scripts/render.sh`로 pinned baseline을 배포 산출물 디렉토리로 복제한다.
2. render 결과물에 host별 `.env` 값과 overlay를 반영한다.
3. 승인된 rollout만 bare-metal host에 배포한다.
