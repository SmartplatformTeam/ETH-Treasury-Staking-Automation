# Web3Signer Overlay

이 디렉토리는 CDVN baseline의 validator client 경로를 Web3Signer + KMS 구조로 덮어쓰는
overlay를 둔다.

현재 구성:

- `compose-vc.yml`
  - upstream validator compose를 Lodestar external signer 모드 기준으로 교체한다.
- `lodestar/run.sh`
  - 로컬 keystore import 대신 Lodestar external signer 플래그를 사용한다.
- `env.defaults`
  - render 단계에서 적용할 기본 env 값

책임:

- VC 설정에서 remote signer endpoint 사용
- Web3Signer endpoint와 fetch policy 주입
- KMS 연동용 식별자는 env로 전달하고, raw secret은 runtime 외부에서 주입
- baseline의 로컬 `validator_keys` import path 제거

현재 overlay는 upstream 기본 validator client인 Lodestar를 external signer 모드로 고정한다.
필요하면 이후 `vc-teku`, `vc-nimbus` 프로파일도 별도 overlay로 확장한다.
