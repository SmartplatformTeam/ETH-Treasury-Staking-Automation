# Web3Signer KMS Guide

## 목적

이 문서는 현재 `web3signer` overlay를 실제 운영 환경의 Web3Signer + KMS와 연결할 때
무엇을 먼저 확정해야 하는지 정리한다.

현재 repo는 Web3Signer 연동 뼈대까지는 있다.
하지만 아래는 아직 실연동 상태가 아니다.

- TLS
- mTLS
- auth header
- KMS namespace / key alias 규칙
- 실제 host에서 Web3Signer reachability 검증

즉 이 문서는 "무엇을 코드에 넣기 전에 운영에서 먼저 결정해야 하나"를 정리하는 문서다.

## 현재 repo가 이미 지원하는 것

- `WEB3SIGNER_URL`
- `WEB3SIGNER_METRICS_TARGET`
- `WEB3SIGNER_FETCH`
- `WEB3SIGNER_FETCH_INTERVAL_MS`
- `WEB3SIGNER_PUBLIC_KEYS`

또 현재 overlay는 Lodestar external signer 플래그를 사용한다.

- `WEB3SIGNER_FETCH=true`
  - Web3Signer에서 pubkey fetch
- `WEB3SIGNER_FETCH=false`
  - staged pubkeys를 `WEB3SIGNER_PUBLIC_KEYS`로 전달

## 먼저 확정해야 할 운영 결정

### 1. Web3Signer endpoint

아래 중 어떤 형태인지 확정해야 한다.

- 각 host가 공용 Web3Signer cluster로 간다
- host별 로컬 또는 지역별 Web3Signer로 간다

최소한 아래는 확정해야 한다.

- base URL
- port
- TLS 사용 여부
- metrics target

### 2. 인증 방식

현재 repo는 단순 URL 기준으로 움직인다.
운영에서는 보통 아래 중 하나를 결정해야 한다.

- internal network only
- mTLS
- static auth header
- reverse proxy를 통한 추가 인증

현재 상태에서 가장 먼저 문서로 고정해야 하는 것은 다음이다.

- request 인증이 필요한가
- 필요하다면 cert 기반인가 header 기반인가
- cert/key/CA는 어떤 경로에 놓을 것인가

### 3. KMS namespace와 key alias 규칙

Web3Signer 뒤에 KMS가 있으면 naming 규칙이 빨리 고정되어야 한다.

예시 질문:

- cluster별 namespace를 분리할 것인가
- validator별 alias prefix를 둘 것인가
- alias에 network/cluster/validator index를 넣을 것인가
- 교체 시 alias를 바꿀 것인가 versioning할 것인가

이 naming 규칙이 늦게 정해지면
나중에 inventory, signer inventory, approval, audit 문서가 전부 흔들린다.

### 4. 네트워크 경로

실제 host에서 Web3Signer로 가는 경로를 확인해야 한다.

- private network
- VPN
- VPC peering
- bastion / proxy

중요한 건 "URL이 있다"가 아니라 "4대 host에서 그 URL로 안정적으로 갈 수 있다"다.

## 운영자가 지금 문서로 확정해야 할 값

아래 값은 최소한 표나 config 문서로 확정하는 것이 좋다.

- `WEB3SIGNER_URL`
- `WEB3SIGNER_METRICS_TARGET`
- `WEB3SIGNER_FETCH`
- `WEB3SIGNER_FETCH_INTERVAL_MS`
- TLS 사용 여부
- mTLS 사용 여부
- client cert path
- client key path
- CA path
- auth header 방식
- KMS namespace
- key alias 규칙
- host별 네트워크 경로

## 권장 결정 방식

처음에는 아래 정도만 고정해도 충분하다.

### 최소 운영 계약

- validator client는 로컬 keystore를 쓰지 않는다.
- signing path는 반드시 Web3Signer를 거친다.
- Web3Signer는 KMS-backed signer만 사용한다.
- host는 Web3Signer에 직접 접근하되 인증 방식은 하나로 통일한다.
- `WEB3SIGNER_FETCH` 전략은 cluster 단위로 고정한다.

### 권장 초기값

- `WEB3SIGNER_FETCH=true`
  - 운영 단순성이 높다.
- mTLS 또는 내부망 제한 중 하나는 반드시 둔다.
- metrics endpoint는 scrape 가능한 별도 target으로 고정한다.
- alias naming은 `network-cluster-validator` 계열로 일관성 있게 만든다.

## 실제 서버가 생기면 해야 할 검증

서버가 생긴 뒤에는 아래 순서로 보는 것이 맞다.

1. host에서 Web3Signer `upcheck` 접근 확인
2. host에서 metrics endpoint 접근 확인
3. 인증서 파일 존재 확인
4. `render -> verify -> rollout` dry-run
5. `host-preflight.sh --check-web3signer`
6. `rollout-exec.sh` dry-run
7. 한 host만 실제 execute
8. validator client가 external signer로 뜨는지 확인
9. threshold를 넘지 않는 범위에서 순차 rollout

## 현재 repo에서 아직 비어 있는 부분

현재 repo 기준으로 아직 구현되지 않은 부분도 문서로 알아두는 게 좋다.

- mTLS용 compose/env wiring
- auth header injection
- Web3Signer cert path 주입 규칙
- 실제 KMS backend 상태 확인
- remote signer 장애 시 fallback 정책

즉 지금은 "URL과 외부 signer 플래그"까지만 자동화돼 있다고 보는 게 맞다.

## 운영 질문 체크리스트

실운영 전에 아래 질문에 답할 수 있어야 한다.

- Web3Signer는 어디에 있고 누가 운영하는가
- 4대 host 모두 그 endpoint로 갈 수 있는가
- 인증은 무엇으로 하는가
- cert/key/CA는 어디에 둘 것인가
- `WEB3SIGNER_FETCH`는 `true`인가 `false`인가
- `false`라면 pubkey source of truth는 무엇인가
- KMS alias naming은 어떻게 갈 것인가
- 장애 시 host가 해야 할 일은 무엇인가

## 최소 완료 기준

이 문서 기준으로 Web3Signer/KMS 준비가 끝났다고 보려면 아래가 충족되어야 한다.

- 실제 endpoint와 metrics target이 정해져 있다.
- 인증 방식이 정해져 있다.
- cert/key/CA 경로가 정해져 있다.
- KMS naming 규칙이 정해져 있다.
- `WEB3SIGNER_FETCH` 전략이 고정돼 있다.
- host에서 reachability를 확인할 테스트 계획이 있다.
