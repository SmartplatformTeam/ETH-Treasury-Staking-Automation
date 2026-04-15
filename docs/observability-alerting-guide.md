# Observability Alerting Guide

## 목적

이 문서는 CDVN runtime을 실제 host에 올렸을 때
무엇을 수집하고 어디로 보내고 어떤 기준으로 경고를 낼지 정리한다.

현재 repo에는 `observability` overlay가 이미 들어가 있다.
즉 "나중에 생각할 문제"가 아니라
render 단계부터 같이 결정해야 하는 운영 입력이다.

## 현재 overlay가 이미 넣는 것

현재 `observability` overlay는 아래를 포함한다.

- `cadvisor`
- `node-exporter`
- `tempo`
- `loki`
- Prometheus scrape config template
- Charon tracing / logging env override

즉 최소한 metrics, logs, traces의 뼈대는 이미 있다.

## 먼저 정해야 할 운영 결정

### 1. Prometheus scrape 구조

아래 중 어떤 구조인지 정해야 한다.

- 각 host가 로컬 Prometheus를 가진다
- 중앙 Prometheus가 각 host를 scrape 한다
- 둘을 혼합한다

현재 템플릿 기준으로는 host 단위 metrics 구성이 가능하다.
하지만 중앙 수집까지 어디서 할지는 운영이 정해야 한다.

### 2. Loki / Tempo 저장 전략

아래를 빨리 정해야 한다.

- host 로컬 저장인지
- external managed endpoint인지
- retention을 얼마나 둘지
- 장애 시 로그 보존을 어떻게 할지

### 3. alert routing

metrics가 수집돼도 alert를 어디로 보낼지 정하지 않으면 운영성이 없다.

보통 아래 중 하나 이상을 정한다.

- Slack
- PagerDuty
- Email
- Ops chat room

### 4. health sync endpoint

현재 `health-sync.sh`는 rendered metadata를 control plane endpoint로 POST할 수 있다.
즉 아래를 정해야 한다.

- 실제 endpoint URL
- auth 방식
- payload 수신 후 어디에 저장할지
- inventory / alert / audit와 어떻게 연결할지

## 최소 수집 대상

현재 구조에서 최소한 아래는 볼 수 있어야 한다.

- host resource
- container 상태
- Charon 상태
- validator client 상태
- Web3Signer metrics
- logs
- health sync snapshot

즉 "컨테이너가 떴다"만 보면 부족하다.

## 포트와 방화벽 정책

`hosts.yml`에는 이미 아래 포트가 들어간다.

- `grafanaPort`
- `prometheusPort`

여기에 더해 운영에서 아래를 정하는 편이 좋다.

- host 외부에서 scrape 가능한가
- 내부망에서만 가능한가
- Web3Signer metrics는 어디서 scrape하는가
- Loki / Tempo endpoint는 host 밖에서 접근 가능한가

이 값이 안 정해지면 observability는 붙어 있어도 실제로는 안 쓰는 구성물이 된다.

## 권장 운영 질문

실운영 전에 아래에 답할 수 있어야 한다.

- Prometheus는 중앙형인가 host형인가
- logs는 host 로컬에 두나 외부로 보내나
- traces는 정말 저장할 것인가
- alert는 누가 받나
- 야간 alert는 누구에게 가나
- health sync는 어떤 주기로 보낼 것인가

## validating 판정에 필요한 관측 포인트

나중에 "validating인가"를 보려면 단순 `docker compose ps`보다 더 많은 기준이 필요하다.

최소한 아래를 함께 봐야 한다.

- Charon peer 연결 상태
- EL / CL sync 상태
- validator client external signer 연결 상태
- Web3Signer endpoint health
- host 자원 상태

즉 observability는 보기 좋은 부가 기능이 아니라
bring-up 판정과 stop rule에 직접 연결된다.

## 권장 문서화 항목

운영 문서에는 아래를 표로 정리하는 편이 좋다.

- host별 scrape target
- host별 dashboard URL
- alert 채널
- on-call owner
- retention 일수
- health sync endpoint

## 초기 운영 권장안

서버가 아직 없는 단계에서는 아래 정도를 먼저 문서로 고정하면 충분하다.

- `grafanaPort`, `prometheusPort` host별 규칙
- Web3Signer metrics scrape target
- control plane health sync endpoint placeholder
- alert channel 후보
- logs/traces retention의 임시 정책

## 흔한 실수

- metrics는 붙였지만 누가 보는지 정하지 않는다.
- logs는 저장하지만 retention을 정하지 않는다.
- Web3Signer metrics target을 inventory에 적지 않는다.
- health sync endpoint 없이 운영을 시작한다.
- validating 판정을 사람이 감으로만 한다.

## 최소 완료 기준

이 문서 기준으로 observability/alerting 준비가 끝났다고 보려면 아래가 충족되어야 한다.

- scrape topology가 정해져 있다.
- alert 채널이 정해져 있다.
- health sync endpoint 정책이 있다.
- host별 metrics port가 inventory에 반영돼 있다.
- validating 판정에 필요한 관측 포인트가 문서화돼 있다.
