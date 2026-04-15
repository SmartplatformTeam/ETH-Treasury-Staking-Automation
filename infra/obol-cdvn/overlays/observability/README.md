# Observability Overlay

이 디렉토리는 CDVN baseline 위에 운영용 메트릭, 로그, 추적 수집 구성을 추가한다.

현재 구성:

- `docker-compose.services.yml`
  - cadvisor, node-exporter, tempo, loki와 charon tracing/logging env override를 추가한다.
- `prometheus/prometheus.yml.example.tpl`
  - Web3Signer, Lodestar, debug exporter scrape target을 포함한 템플릿이다.
- `env.defaults`
  - render 단계에서 적용할 모니터링 기본 env 값

책임:

- Prometheus scrape target 조정
- Loki / Tempo / Grafana 연동
- cluster health export 입력값 준비
- control plane health sync용 env와 스크립트 입력 정리
