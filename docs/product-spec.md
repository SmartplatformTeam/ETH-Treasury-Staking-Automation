# Product Spec

## 제품명

ETH Treasury Staking Automation Platform

## 제품 배경

ETH Treasury 사업자는 단순히 validator를 실행하는 수준을 넘어 다음 문제를 동시에 해결해야 한다.

- 많은 수의 validator와 node를 운영해야 한다.
- 운영 자동화가 필요하다.
- 자금 이동과 slash 리스크는 엄격히 통제해야 한다.
- 운영팀, 재무팀, 승인권자, 인프라 담당자의 역할이 다르다.
- reward, fee, cost, APR을 정리해 treasury 관점으로 보고해야 한다.

기존 스테이킹 도구들은 개별 node 운영이나 validator 생성에 초점을 맞추는 경우가 많고, treasury 운영 관점의 승인형 워크플로우와 자산 보고 체계까지 통합하지 못한다.

## 제품 목표

이 제품의 목표는 다음과 같다.

- validator 운영과 자산 승인 업무를 하나의 시스템으로 통합한다.
- 운영 자동화는 강화하되 자금 실행은 승인형으로 제한한다.
- 장애 감지, 성능 모니터링, reward accounting을 중앙화한다.
- Solo, DVT, Pool 전략을 동일한 inventory 모델로 관리할 수 있게 한다.

## 현재 운영 가정

- Obol Network 기반 DVT cluster를 기본 운영 형태로 사용한다.
- Obol의 `charon-distributed-validator-node`를 operator runtime baseline으로 채택한다.
- validator client signing key custody는 Web3Signer + KMS 조합으로 처리한다.
- 운영 인프라는 4대의 bare-metal 서버를 동일한 자동화 경로로 구성한다.
- Safe wallet 기반 multisig contract를 OVM account로 사용한다.

## 비목표

이번 MVP에서 다음 항목은 목표에서 제외한다.

- mnemonic 생성기 개발
- 온체인 서명 엔진 내장
- 자체 custody wallet 구축
- 완전 자동 예치 실행
- 완전 자동 slash recovery
- 다중 체인 지원

## 핵심 사용자

### Treasury Operator

- validator 현황과 성과를 관리한다.
- 장애 현황과 운영 상태를 모니터링한다.
- 정산과 리포트를 확인한다.

### Infra Operator

- node, client, host 상태를 관리한다.
- 배포와 업데이트를 수행한다.
- sync lag, peer 수, 디스크 사용량을 점검한다.

### Approver

- 신규 validator 생성 요청을 승인한다.
- deposit 실행 전 최종 검토를 수행한다.
- 위험 작업에 대한 2차 승인을 담당한다.

### Finance Reviewer

- reward, cost, net yield를 확인한다.
- treasury 보고용 자료를 추출한다.

## 주요 문제 정의

### 운영 정보가 흩어져 있다

validator, node, host, reward, alert 정보가 각기 다른 대시보드에 분산되면 운영 복잡도가 올라간다.

### 운영 자동화와 자금 통제가 분리되어야 한다

배포와 모니터링은 자동화해야 하지만, deposit와 withdrawal 관련 행위는 사람 승인 체인이 필요하다.

### slash risk가 있는 동작은 일반적인 SRE 자동화와 다르다

validator failover나 duplicate activation 같은 행위는 기존 웹 서비스와 다른 수준의 보수적 정책이 필요하다.

## 기능 요구사항

### Validator Inventory

- validator 단위 목록 조회
- 상태 분류
- strategy type 분류
- network 분류
- fee recipient, withdrawal address, owner entity 추적
- linked node, cluster, signer 정보 조회

### Node and Cluster Inventory

- host, container, client version, region, provider 추적
- EL, CL, VC, signer, relay, monitoring endpoint 추적
- DVT cluster 구성 정보 조회
- CDVN baseline 버전과 overlay 버전 추적
- bare-metal host 4대 배치와 역할 추적
- Obol cluster ID, charon peer, operator assignment 추적
- Web3Signer endpoint 및 signer binding 추적

### Signer and Key Custody

- Web3Signer instance inventory
- KMS key reference tracking
- validator별 signer binding 조회
- signer health, version, endpoint 추적
- raw secret 미보관 정책 검증

### Health Monitoring

- sync lag
- peer count
- validator missed duties
- proposer / attester performance
- disk pressure
- memory pressure
- beacon API health
- execution API health

### Alert Center

- severity 기반 분류
- ack 처리
- escalation rule
- alert source 추적
- Slack / email / webhook 라우팅

### Deposit Request Workflow

- 신규 validator 요청 생성
- deposit data 업로드
- 검증 상태 표시
- approval 상태 관리
- DKG ceremony 상태 및 artifact 추적
- signer external export
- Safe export 대상 OVM account 표시
- 실행 이력 저장

### Treasury Execution Control

- Safe wallet 주소와 chain 구성 관리
- multisig proposal 상태 추적
- approval workflow와 Safe proposal linkage
- OVM account 기준 payload export audit

### Reward Accounting

- validator별 reward 집계
- strategy별 reward 집계
- execution reward와 consensus reward 분리
- infra cost 반영
- net APR 추정

### Audit Log

- 승인 생성
- 승인 변경
- 예치 요청 수정
- 정책 변경
- 외부 payload export
- 위험 작업 접근 시도

## 비기능 요구사항

### 보안

- RBAC 필수
- 민감 작업 재확인 단계 필수
- Web3Signer + KMS 기반 custody
- secret 최소 저장
- audit trail 필수

### 신뢰성

- 수집 파이프라인 장애 시 재시도
- 외부 API 실패 대비 큐 기반 처리
- reward 계산 배치 재실행 가능
- 4대 bare-metal 서버에 대한 동일 구성 자동화와 drift detection
- CDVN upstream 버전 pinning과 overlay patch 추적

### 확장성

- 네트워크별 분리 가능
- 전략 유형 추가 가능
- signer provider 교체 가능
- DVT cluster topology 확장 가능

### 감사 가능성

- 누가 무엇을 승인했고 어떤 payload가 생성되었는지 추적 가능해야 한다.

## MVP 범위

- 운영자 로그인
- RBAC
- validator inventory
- node inventory
- Obol DVT cluster inventory
- CDVN baseline/overlay 추적
- health dashboard
- alert center
- deposit request workflow
- approval queue
- Web3Signer custody metadata
- Safe proposal export
- reward summary dashboard
- audit log

## 성공 지표

- 주요 운영 상태를 한 화면에서 확인 가능
- 4대 bare-metal 서버가 동일 구성으로 연결되고 cluster 상태를 추적 가능
- 신규 validator 요청 승인 리드타임 감소
- 장애 탐지 시간 단축
- reward 보고서 작성 시간 단축
- 수동 운영 단계 수 감소
