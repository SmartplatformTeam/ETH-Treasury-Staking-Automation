# AGENTS.md

## 목적

이 저장소는 ETH Treasury 운영용 스테이킹 자동화 플랫폼을 구축하기 위한 레포지토리다. 구현 에이전트는 단순한 대시보드 수준이 아니라, 실제 운영 환경에서 사용할 수 있는 백오피스와 자동화 파이프라인을 만드는 것을 목표로 한다.

## 제품 성격

이 시스템은 다음 두 가지를 동시에 만족해야 한다.

- 운영 자동화 플랫폼
- 승인 기반 자금 집행 통제 시스템

따라서 모든 구현은 편의성보다 안정성과 감사 가능성을 우선한다.

## 현재 운영 전제

- Obol Network 기반 DVT 구성을 기본 운영 형태로 사용한다.
- Obol의 `charon-distributed-validator-node` 구성을 operator runtime baseline으로 채택한다.
- validator client 서명키는 Web3Signer + KMS 조합으로 보관한다.
- 4대의 bare-metal 서버를 동일한 자동화 경로로 구성하고 연결한다.
- Safe wallet 기반 multisig contract를 OVM 계정으로 사용한다.

## 절대 원칙

- validator key 생성 결과물, seed, mnemonic, raw secret을 애플리케이션 DB에 저장하지 않는다.
- validator client 서명키 raw material은 Web3Signer + KMS 경로 밖으로 복제하지 않는다.
- 자동화 대상과 사람 승인 대상 영역을 명확히 분리한다.
- slash risk가 있는 동작은 자동 실행하지 않는다.
- 예치 트랜잭션은 자동 서명하지 않는다.
- 출금 자격 변경, withdrawal credential 관련 행위는 승인 체인 없이 허용하지 않는다.
- 모든 운영 행위는 audit log를 남긴다.
- 운영자 UI는 action button보다 상태 확인과 승인 흐름을 우선한다.

## 자동화 허용 범위

- 노드 상태 수집
- 메트릭 수집
- 디스크, 메모리, peer, sync lag 감지
- 컨테이너 배포 및 롤링 업데이트
- CDVN compose baseline render 및 peer topology 배포
- config render
- validator inventory 동기화
- 4대 bare-metal 서버 baseline provisioning 및 drift detection
- reward accounting 계산
- Safe transaction proposal payload 생성
- 알림 라우팅

## 반자동화 범위

- DKG ceremony 준비 및 실행 추적
- 신규 validator 생성 요청
- deposit data 업로드 및 검증
- 예치 실행 전 승인 생성
- DVT 클러스터 배치 준비
- remote signer 등록
- fee recipient 정책 반영
- Safe multisig proposal 생성 및 OVM account export

## 자동화 금지 범위

- mnemonic 생성 후 자동 보관
- 출금 주소 자동 변경
- slash protection 무시한 이중 활성화
- 승인 없는 deposit submit
- 승인 없는 emergency failover

## 기대 레포 구조

- `apps/web`
  - 운영자용 백오피스
- `apps/api`
  - API 서버
- `apps/worker`
  - 비동기 작업 처리기
- `packages/ui`
  - 공통 UI
- `packages/config`
  - 공통 설정
- `packages/domain`
  - 도메인 모델과 정책
- `packages/db`
  - Prisma schema, migration, seed
- `packages/observability`
  - logging, metrics, tracing
- `docs`
  - 제품 및 아키텍처 문서
- `infra`
  - bare-metal bootstrap, deployment, docker, helm, terraform 예시

## 구현 우선순위

먼저 아래 순서대로 구현한다.

- 인증과 RBAC
- validator, node, cluster, signer inventory
- health ingestion pipeline
- alert center
- reward ledger
- approval workflow
- deposit request flow
- Safe wallet proposal integration
- operator dashboard

## 개발 원칙

- TypeScript strict mode를 기본값으로 사용한다.
- 도메인 로직은 UI에서 구현하지 않는다.
- 외부 스테이킹 클라이언트 연동 코드는 adapter 계층으로 분리한다.
- CDVN upstream baseline은 최대한 유지하고 커스텀은 overlay로 분리한다.
- 단일 giant service 형태가 아니라 모듈식 monorepo로 유지한다.
- 테스트는 domain layer와 approval workflow에 우선 투자한다.

## UI 원칙

- 운영 화면은 화려함보다 정보 밀도가 중요하다.
- 상태 색상은 최소한으로 사용한다.
- 위험 작업은 항상 재확인 단계가 있어야 한다.
- 표 중심 UI와 상세 패널 구조를 우선한다.
- 모바일보다 데스크톱 운영 화면 최적화를 우선한다.

## 완료 기준

다음이 충족되면 1차 MVP 완료로 본다.

- 운영자가 validator와 노드 상태를 한 화면에서 볼 수 있다.
- 운영자가 4대 bare-metal 서버의 DVT cluster 상태와 signer 연결 상태를 추적할 수 있다.
- 심각한 health issue를 알림으로 받을 수 있다.
- 신규 deposit 요청을 생성하고 승인할 수 있다.
- 승인된 요청에 대해 외부 서명용 payload를 내보낼 수 있다.
- 월간 reward summary를 확인할 수 있다.
- 모든 주요 액션이 audit log에 남는다.
