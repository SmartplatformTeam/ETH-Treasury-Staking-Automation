# 이더리움 DVT 스테이킹 단독 소유권 및 DKG 키 통제 세부 운영지침(안)

문서 상태: Draft v0.2  
작성 기준일: 2026-04-28  
상위 규정: 디지털 자산의 취득 및 관리에 관한 규정(2026.03.06)  
적용 범위: Obol Network 기반 Ethereum DVT staking, Safe 3-of-4 multisig, Web3Signer + KMS signer custody

본 문서는 회계법인, 준법감시인, 디지털 자산 위원회 및 내부 감사인이 회사의 자체 운영 Ethereum staking 구조를 검토할 수 있도록 작성한 세부 운영지침 초안이다. 본 문서는 법률 의견서 또는 세무 의견서가 아니며, 상위 규정과 관련 법령이 우선 적용된다.

## 제 1 장 총칙

### 제 1 조 (목적)

본 지침은 회사가 Obol Network 기반 분산 검증인 기술(DVT)을 이용하여 Ethereum staking을 수행하는 경우, 다음 각 호의 사항을 명확히 규정하는 것을 목적으로 한다.

1. staking된 ETH의 소유권 및 출금 통제권이 회사에 단독으로 귀속됨을 입증하는 온체인·오프체인 증빙 체계
2. Safe multisig 3-of-4 구조와 회사 내부 승인 체계의 연결 관계
3. Obol DKG(Distributed Key Generation) ceremony의 승인, 실행, 산출물 생성 및 보관 절차
4. validator key share, withdrawal credentials, Charon ENR 등 key-related artifact의 민감도 분류와 통제
5. 원본 key share가 단일 위치에서 재조합되지 않음을 회계감사 및 내부통제 관점에서 입증하는 절차

### 제 2 조 (적용 범위)

1. 본 지침은 회사가 직접 운영하거나 회사가 통제하는 관계인이 운영하는 Ethereum validator, Obol DVT cluster, Charon node, Web3Signer, KMS, Safe multisig 및 관련 approval workflow에 적용한다.
2. 본 지침은 상위 규정상 "자체 운영 / 내부 스테이킹" 방식의 세부 운영정책으로 사용한다.
3. 본 지침은 staking 예치, DKG, validator key share 생성, remote signer 등록, withdrawal credentials 검증, Safe transaction proposal export, audit log 및 회계 증빙 보관에 적용한다.
4. 외부 수탁기관 또는 외부 staking service provider를 이용하는 경우에도 회사가 DVT cluster 또는 withdrawal credentials에 대한 통제권을 유지하는 범위에서는 본 지침을 준용한다.

### 제 3 조 (정의)

본 지침에서 사용하는 용어의 정의는 다음과 같다.

1. "Ethereum" 또는 "이더리움"이란 ETH를 기본 자산으로 사용하는 public blockchain network를 의미한다. 본 지침에서 Ethereum은 회사가 staking 대상으로 삼는 blockchain network를 말한다.
2. "ETH"란 Ethereum network의 native digital asset을 의미한다. 회사가 staking하는 원금 자산 및 staking reward의 기본 단위다.
3. "Blockchain" 또는 "블록체인"이란 거래 및 상태 변경 내역이 여러 참여자에게 분산 기록되는 원장 기술을 의미한다. Ethereum의 validator deposit, withdrawal credentials, Safe transaction, reward 등은 blockchain에서 검증 가능한 기록으로 남는다.
4. "Wallet Address" 또는 "주소"란 Ethereum network에서 자산을 보유하거나 contract와 상호작용할 수 있는 식별자를 의미한다. 주소 자체는 공개 정보이며, 해당 주소를 통제하려면 대응되는 개인키 또는 multisig governance가 필요하다.
5. "Private Key" 또는 "개인키"란 특정 주소 또는 validator signing 권한을 행사하기 위해 필요한 비밀값을 의미한다. 본 지침에서 개인키에는 Safe signer key, validator key share, keystore password, raw signing key material 등 회사 자산 또는 validator duty에 영향을 줄 수 있는 민감정보가 포함된다.
6. "Multisig"란 거래 실행 또는 권한 행사를 위해 복수의 signer 승인을 요구하는 구조를 의미한다. 본 지침의 Safe는 4명 signer 중 3명 이상이 승인해야 transaction을 실행할 수 있는 3-of-4 multisig 구조를 사용한다.
7. "Safe"란 회사가 treasury execution 및 OVM 계정으로 사용하는 Safe multisig contract를 의미한다. 회사 운영에서는 staking된 ETH의 withdrawal credentials가 Safe address로 귀속되어야 하며, Safe owner와 threshold는 on-chain으로 검증 가능해야 한다.
8. "Signer"란 Safe owner address의 개인키를 보유하거나 회사가 승인한 policy signer 권한을 가진 임직원 또는 지정 권한자를 의미한다. Signer는 기안자, 재무승인, 보안승인, 비상복구 역할로 구분한다.
9. "Staking" 또는 "스테이킹"이란 Ethereum network의 validator로 참여하기 위해 ETH를 예치하고, validator duty를 수행함으로써 protocol reward를 수취하는 행위를 의미한다. Staking은 원금 ETH가 특정 validator와 withdrawal credentials에 연결되므로, 예치 전 승인, 출금 권한 확인, reward 회계처리 및 slashing risk 관리가 필요하다.
10. "Validator" 또는 "검증인"이란 Ethereum proof-of-stake network에서 block proposal, attestation 등 consensus duty를 수행하는 주체를 의미한다. Ethereum validator는 validator public key로 식별되며, validator duty를 올바르게 수행하면 reward를 받고, 잘못 수행하거나 악의적 행위가 발생하면 penalty 또는 slashing을 받을 수 있다.
11. "Validator Public Key"란 validator를 식별하는 공개키를 의미한다. 회계 및 감사 증빙에서는 validator public key를 기준으로 deposit data, Beacon state, cluster lock, reward ledger를 연결한다.
12. "Validator Signing Key"란 validator duty에 필요한 서명 권한을 가진 key material을 의미한다. 본 운영 모델에서는 validator signing key raw material을 애플리케이션 DB 또는 공개 repository에 저장하지 않으며, Web3Signer + KMS 경로 밖으로 복제하지 않는다.
13. "Validator Key Share"란 DKG를 통해 각 operator에게 분산 생성되는 validator signing key 조각을 의미한다. 단일 key share만으로는 validator duty를 완전히 수행할 수 없도록 threshold 구조로 운영되며, 각 key share는 operator별로 분리 관리한다.
14. "Keystore"란 validator signing key 또는 key share를 암호화하여 저장하는 파일 형식을 의미한다. Keystore 파일과 password는 raw signing key material에 준하는 고위험 민감정보로 관리한다.
15. "Deposit" 또는 "예치"란 validator를 활성화하기 위해 ETH를 Ethereum deposit contract에 예치하는 행위를 의미한다. 회사 운영에서는 deposit transaction을 자동 서명하지 않으며, deposit data와 withdrawal credentials 검증 후 Safe approval 절차를 거쳐야 한다.
16. "Deposit Data"란 validator deposit에 필요한 validator public key, withdrawal credentials, deposit amount, signature 등을 포함하는 data file을 의미한다. 회계감사에서는 deposit data hash와 withdrawal credentials 검증 결과를 보관한다.
17. "Withdrawal Credentials"란 Ethereum validator의 출금 권한이 귀속되는 credential을 의미한다. 회사 운영에서는 withdrawal credentials가 회사 Safe multisig address로 귀속되어야 하며, 이는 staking된 ETH의 경제적 통제권 입증에 핵심 증빙이 된다.
18. "Fee Recipient"란 block proposal 또는 execution layer reward가 지급되는 Ethereum address를 의미한다. Fee recipient는 withdrawal credentials와 다른 개념이며, reward 수취 및 회계처리 관점에서 별도로 관리한다.
19. "Staking Reward" 또는 "스테이킹 보상"이란 validator duty 수행으로 발생하는 consensus reward, execution reward, MEV 관련 수취액 등을 의미한다. Staking reward는 원금 ETH와 구분하여 식별, 기록, 관리한다.
20. "Penalty"란 validator duty 미이행, offline 상태, sync 문제 등으로 발생할 수 있는 protocol-level 손실을 의미한다.
21. "Slashing"이란 double signing, surround vote 등 Ethereum protocol이 금지하는 행위가 발생할 경우 validator stake 일부가 삭감되는 중대한 penalty를 의미한다. Slashing risk가 있는 failover, signer 변경, validator 재활성화는 자동 실행하지 않는다.
22. "DVT"란 여러 operator가 하나의 Ethereum validator duty를 threshold 방식으로 수행하는 Distributed Validator Technology를 의미한다. DVT는 단일 node 또는 단일 key holder 장애에 대한 복원력을 높이지만, key share 생성·보관·운영에 대한 별도 통제가 필요하다.
23. "Obol Network"란 Ethereum DVT 운영을 위한 Charon client, DKG, cluster coordination 도구 등을 제공하는 protocol 및 ecosystem을 의미한다. 본 지침은 Obol Network 기반 DVT 운영을 전제로 한다.
24. "Charon"이란 Obol Network의 DVT middleware client를 의미한다. Charon은 operator 간 consensus duty coordination, peer communication, validator client와 signer 연결을 담당한다.
25. "Operator"란 DVT cluster에서 Charon node 및 관련 validator runtime을 운영하는 주체를 의미한다. 본 운영 모델은 4개의 operator host를 기준으로 하며, 각 operator는 자기 key share와 runtime artifact만 보유한다.
26. "Operator Host"란 Charon, validator client, observability component 등 DVT runtime이 실행되는 bare-metal 또는 승인된 server 환경을 의미한다. Operator host는 host-local secret과 deployment artifact의 보관 경계가 된다.
27. "Charon ENR"이란 Charon client가 DKG 및 cluster peer 통신에서 자신을 식별하기 위해 사용하는 Ethereum Node Record를 의미한다. ENR은 node identity와 연결 정보를 나타내는 public artifact이며, 자산 소유권 또는 출금 권한 증빙으로 사용하지 않는다.
28. "`charon-enr-private-key`"란 Charon ENR 생성을 위한 host-local network identity secret을 의미한다. 이는 withdrawal private key 또는 validator signing key가 아니나, DKG 참여와 cluster 연결에 필요한 운영상 민감정보로 관리한다.
29. "DKG" 또는 "분산 키 생성"이란 validator signing key를 단일 위치에서 생성하지 않고 여러 operator가 protocol에 참여하여 key share를 분산 생성하는 절차를 의미한다.
30. "Obol DKG Ceremony"란 Obol Charon client들이 cluster definition에 따라 validator key share를 분산 생성하는 공식 실행 절차를 말한다. 본 지침에서는 DKG 사전 승인, ENR 등록, 실행 환경 통제, 산출물 검증, 참관자 확인까지 포함한다.
31. "Cluster Definition"이란 DKG 실행 전 cluster 조건, operator address, Charon ENR, withdrawal address, fee recipient, validator count 등을 정의하는 `cluster-definition.json` 또는 Obol Launchpad proposal을 의미한다.
32. "Cluster Lock"이란 DKG 완료 후 생성되는 `cluster-lock.json`으로서, distributed validator public key, operator, threshold, cluster hash 등 Charon runtime에 필요한 정보를 포함하는 파일을 의미한다.
33. "Web3Signer"란 validator client가 로컬 keystore를 직접 사용하지 않고 외부 signer endpoint를 통해 validator duty signature를 요청하도록 하는 remote signer component를 의미한다.
34. "KMS"란 Key Management Service를 의미하며, key material의 생성, 보관, 사용 권한, audit log를 관리하는 보안 시스템을 말한다. 본 운영 모델에서는 Web3Signer와 KMS를 결합하여 validator signing path를 통제한다.
35. "Raw Key Material" 또는 "원본 key material"이란 암호화되기 전 또는 import 과정에서 노출될 수 있는 validator signing key, key share, keystore password, seed, mnemonic 등 비밀값을 의미한다.
36. "원본 key share"란 Web3Signer/KMS import 또는 host-local signer custody에 투입되기 전의 validator keystore, password, key share file 등 raw signing key material을 의미한다.
37. "Approval Workflow"란 deposit request, DKG ceremony, Safe proposal, signer binding, rollout 등 위험 작업을 사람이 검토하고 승인하는 절차를 의미한다.
38. "Audit Log"란 누가, 언제, 어떤 자원에 대해 어떤 승인·변경·실행을 수행했는지 기록하는 감사 추적 정보를 의미한다.
39. "증빙 패키지"란 회계법인, 준법감시인, 내부 감사인이 검토할 수 있도록 보관하는 온체인 링크, hash manifest, 승인 문서, 캡처, audit log, 참석자 확인서, 조직도 및 검증 결과 파일을 의미한다.

### 제 4 조 (상위 규정과의 관계)

1. 본 지침은 상위 규정 중 다음 조항의 세부 운영 절차로 사용한다.
   - 제 5 조 디지털 자산 관리 절차
   - 제 7 조 거래 집행
   - 제 9 조 거래 기록 보관
   - 제 10 조 허용되는 스테이킹 방식
   - 제 11 조 승인 권한 및 한도
   - 제 12 조 보관, 소유권 및 키 관리 권한
   - 제 13 조 운영상 보호 장치
   - 제 14 조 스테이킹 보상 및 회계 처리
   - 제 15 조 모니터링, 보고 및 사고 보고
   - 제 19 조 개인키 보안 구조 및 기술 요건
   - 제 20 조 개인키 거버넌스 및 통제
2. 상위 규정 제 12 조에 따라 staking된 ETH의 소유권 및 통제권은 항상 회사에 귀속되어야 하며, 제3자가 회사의 디지털 자산에 대해 독립적으로 인출 또는 이전을 개시할 수 있는 구조를 허용하지 않는다.
3. 상위 규정 제 19 조의 적격 수탁기관, HSM, MPC 요건과 자체 운영 DVT + Web3Signer + KMS 구조의 정합성은 디지털 자산 위원회, 준법감시인, 회계법인 및 필요 시 이사회 검토 대상이다. 본 지침은 해당 검토에 필요한 통제 및 증빙 구조를 정의한다.
4. 본 지침과 상위 규정 또는 관련 법령이 상충하는 경우 상위 규정 및 관련 법령을 우선 적용한다.

### 제 5 조 (회계감사 대응 원칙)

1. 본 지침의 핵심 감사 명제는 다음과 같다.
   - 회사는 staking된 ETH의 경제적 출금 권한을 Safe multisig로 고정하여 단독 통제한다.
   - Safe signer는 회사 내부 권한자 4명으로 구성되며, 3-of-4 승인 없이는 출금, 이전, 처분 또는 deposit 관련 자금 집행이 불가능하다.
   - DKG 과정에서 생성된 validator key share는 단일 위치에 재조합되지 않으며, 회사의 Web3Signer + KMS 경로 밖으로 복제되지 않는다.
   - ENR은 DVT node identity 증빙이며, 자산 소유권 또는 출금 권한 증빙이 아니다.
2. 회계감사 대응 시 ENR, Charon runtime, validator key share, Safe signer key, withdrawal credentials를 혼동해서는 안 된다.
3. 거래 및 운영 증빙은 회계부서와 공유하고, 상위 규정 제 9 조 취지에 따라 최소 6년간 보관한다.

## 제 2 장 단독 소유권 입증 체계

### 제 6 조 (단독 소유권 입증 명제)

회사는 다음 각 호의 증빙을 모두 연결하여 staking된 ETH에 대한 단독 소유권 및 통제권을 입증한다.

1. DKG 또는 deposit 생성 시점의 `cluster-definition.json` 또는 Obol Launchpad proposal
2. `deposit_data.json`에 포함된 validator public key 및 withdrawal credentials
3. Beacon chain finalized state 또는 Etherscan validator page에서 조회되는 validator withdrawal credentials
4. withdrawal credentials가 귀속되는 Safe contract address
5. Safe contract의 `getOwners()` 및 `getThreshold()` 조회 결과
6. Safe owner 4명의 실명, 부서, 직책 및 권한 배정표
7. 키 보유자가 회사 내 서로 다른 부서에 속함을 입증하는 조직도 및 HR 증빙
8. DKG, deposit request, Safe proposal export, rollout, signer 변경에 관한 approval 및 audit log

### 제 7 조 (증빙 패키지 구성)

단독 소유권 증빙 패키지는 다음 구조로 보관한다. 실제 주소, 실명, 내부 URL, KMS key ref, secret 원본은 공개 repository에 보관하지 않는다.

```text
/secure/evidence/ownership/YYYY-MM-DD/
  00-index.md
  01-committee-approval/
  02-cluster-definition/
  03-withdrawal-credentials/
  04-safe-onchain/
  05-signer-governance/
  06-organization-proof/
  07-audit-log-export/
```

`00-index.md`에는 다음 값을 반드시 기재한다.

| 항목 | 값 |
| --- | --- |
| Evidence package ID | `<OWNERSHIP_EVIDENCE_ID>` |
| Cluster name | `<CLUSTER_NAME>` |
| Network | `mainnet` 또는 `<TESTNET>` |
| Safe address | `<SAFE_ADDRESS>` |
| Validator count | `<N>` |
| Deposit request ID | `<DEPOSIT_REQUEST_ID>` |
| DKG ceremony ID | `<DKG_CEREMONY_ID>` |
| Approval IDs | `<APPROVAL_ID_LIST>` |
| Reviewer | `<NAME / DEPARTMENT>` |
| Review date | `<YYYY-MM-DD>` |

### 제 8 조 (Withdrawal Credentials의 Safe 귀속 증빙)

1. 모든 validator의 withdrawal credentials는 회사가 승인한 Safe multisig address로 귀속되어야 한다.
2. "하드코딩" 또는 "고정"되었다는 표현은 `cluster-definition.json`, `deposit_data.json`, Beacon chain state가 모두 동일한 Safe address를 가리킨다는 의미로 사용한다.
3. 다음 항목을 validator별로 제출 가능한 표 형태로 작성한다.

| 항목 | 제출값 | 증빙 방법 | 증빙 파일 |
| --- | --- | --- | --- |
| Validator public key | `<VALIDATOR_PUBKEY>` | deposit data / cluster lock / Beacon state | `validators.csv` |
| Withdrawal credentials | `<WITHDRAWAL_CREDENTIALS>` | deposit data와 Beacon state 대조 | `withdrawal-credentials.csv` |
| Derived withdrawal address | `<SAFE_ADDRESS>` | credentials 끝 20 bytes 또는 withdrawal address field 대조 | `derivation.md` |
| Safe address | `<SAFE_ADDRESS>` | Safe contract page / read contract | `safe-address.md` |
| Deposit data hash | `sha256:<HASH>` | hash manifest | `deposit-data.sha256` |
| Match result | `YES/NO` | reviewer sign-off | `withdrawal-review.md` |

4. 캡처 및 링크는 다음을 포함한다.
   - Etherscan Safe address page: `https://etherscan.io/address/<SAFE_ADDRESS>`
   - Etherscan Safe read contract page: `https://etherscan.io/address/<SAFE_ADDRESS>#readContract`
   - Etherscan validator page 또는 Beacon explorer validator page: `<VALIDATOR_EXPLORER_URL>`
   - 내부 consensus client Beacon API 조회 결과: `/eth/v1/beacon/states/finalized/validators/<VALIDATOR_PUBKEY>`
5. 검토자는 다음을 확인한 후 서명한다.
   - validator public key 수와 approved validator count가 일치하는지
   - 모든 withdrawal credentials가 동일한 회사 Safe address에 귀속되는지
   - deposit data hash가 DKG 및 Safe proposal export 증빙과 일치하는지
   - deposit transaction 실행 주체와 무관하게 경제적 출금 권한이 회사 Safe에 귀속되는지

### 제 9 조 (Safe contract와 4개 signer 주소의 온체인 연결 관계)

1. Safe contract와 4개 signer address의 연결 관계는 on-chain read result 및 event history로 제출 가능해야 한다.
2. 다음 snapshot을 매월 또는 신규 deposit 전 생성한다.

```text
SAFE_ADDRESS=<SAFE_ADDRESS>
CHAIN_ID=<CHAIN_ID>
SNAPSHOT_BLOCK=<BLOCK_NUMBER>
SNAPSHOT_AT=<YYYY-MM-DDTHH:MM:SSZ>
THRESHOLD=3
OWNERS=<SIGNER_1_ADDRESS>,<SIGNER_2_ADDRESS>,<SIGNER_3_ADDRESS>,<SIGNER_4_ADDRESS>
ETHERSCAN_READ_CONTRACT_URL=https://etherscan.io/address/<SAFE_ADDRESS>#readContract
```

3. 제출 테이블은 다음 형식을 따른다.

| 구분 | 제출값 | 온체인 검증 방법 | 증빙 |
| --- | --- | --- | --- |
| Safe contract | `<SAFE_ADDRESS>` | Etherscan contract page | screenshot / URL |
| Threshold | `3` | `getThreshold()` | RPC result / Etherscan capture |
| Owner 1 | `<SIGNER_1_ADDRESS>` | `getOwners()` | RPC result / Etherscan capture |
| Owner 2 | `<SIGNER_2_ADDRESS>` | `getOwners()` | RPC result / Etherscan capture |
| Owner 3 | `<SIGNER_3_ADDRESS>` | `getOwners()` | RPC result / Etherscan capture |
| Owner 4 | `<SIGNER_4_ADDRESS>` | `getOwners()` | RPC result / Etherscan capture |
| Owner change history | `<TX_HASH_LIST>` | `AddedOwner`, `RemovedOwner`, `ChangedThreshold` events | event CSV |

4. owner 변경, threshold 변경, module enable, guard 변경, fallback handler 변경은 모두 고위험 변경으로 분류하고, 디지털 자산 위원회 또는 별도 지정 승인자의 사전 승인을 받아야 한다.

### 제 10 조 (회계감사 assertion별 증빙 매핑)

| 감사 assertion | 주요 질문 | 제출 증빙 |
| --- | --- | --- |
| Rights and obligations | staking된 ETH의 경제적 출금 권한이 회사에 있는가 | withdrawal credentials, Safe owner snapshot, 조직도 |
| Existence | validator와 staking 포지션이 실제 존재하는가 | validator public key, Beacon state, deposit transaction |
| Completeness | 승인된 validator 전부가 장부와 증빙에 포함되었는가 | validator inventory, deposit request, cluster lock |
| Accuracy | validator count, deposit amount, reward 기록이 정확한가 | deposit data, reward ledger, execution/consensus reward report |
| Cut-off | 예치, 보상, withdrawal event가 올바른 기간에 반영되었는가 | block timestamp, transaction hash, period report |
| Internal control | 키 생성 및 사용이 승인과 직무분리 하에 수행되었는가 | DKG checklist, Safe governance, audit log |

### 제 11 조 (Stop Rule)

다음 각 호 중 하나라도 발생하면 deposit submit, Safe proposal export 또는 validator activation 절차를 중단한다.

1. withdrawal credentials가 승인된 Safe address와 일치하지 않는다.
2. Safe owner 수가 4명이 아니거나 threshold가 3이 아니다.
3. Safe owner 중 실명, 부서, 권한 배정이 확인되지 않은 signer가 있다.
4. `cluster-definition.json`, `deposit_data.json`, Beacon state 중 하나라도 validator public key 또는 withdrawal credentials가 불일치한다.
5. DKG 산출물 hash, approval ID, audit log ID가 서로 연결되지 않는다.
6. validator key share 원본이 중앙 repository, shared drive, control plane DB 또는 evidence package에 수집된 정황이 확인된다.

## 제 3 장 Safe 3-of-4 거버넌스 구조

### 제 12 조 (3-of-4 거버넌스 원칙)

1. 회사 Safe는 4명의 signer와 threshold 3 구조를 원칙으로 한다.
2. 어떤 1인도 staking된 ETH의 출금, 이전, 처분 또는 deposit 자금 집행을 단독으로 실행할 수 없다.
3. Safe signer 구성은 기안자, 재무승인, 보안승인, 비상복구 역할로 분리한다.
4. signer는 회사 내 서로 다른 부서 또는 상이한 조직에 속해야 한다.
5. signer의 퇴사, 보직 변경, 장기 휴가, 이해상충, 키 분실, 보안 사고 발생 시 즉시 signer rotation approval을 개시한다.

### 제 13 조 (권한 배정표)

실제 실명, 부서, 직책, 임직원 식별자는 secure evidence path에만 보관한다.

| Safe role | Signer address | 실명 | 소속 부서 | 직책 | 주 책임 | 승인 범위 | 보유 매체 | 대체/복구 기준 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 기안자 | `<SIGNER_1_ADDRESS>` | `<NAME_1>` | Treasury Operations | `<TITLE>` | deposit request, Safe payload 초안, 운영 변경 기안 | 기안 및 1차 검토. 단독 집행 불가 | hardware wallet / policy signer | Treasury Ops 대체자 승인 |
| 재무승인 | `<SIGNER_2_ADDRESS>` | `<NAME_2>` | Finance / Accounting | `<TITLE>` | 예치 금액, 회계 귀속, reward 검토 | 자금 집행 승인 필수 signer | hardware wallet / policy signer | CFO 또는 위임권자 승인 |
| 보안승인 | `<SIGNER_3_ADDRESS>` | `<NAME_3>` | Security / Risk | `<TITLE>` | key custody, withdrawal credentials, signer 변경 검토 | key / signer / rollout 위험 승인 필수 signer | hardware wallet / policy signer | CISO 또는 위임권자 승인 |
| 비상복구 | `<SIGNER_4_ADDRESS>` | `<NAME_4>` | Executive / Compliance / BCP | `<TITLE>` | 사고 대응, signer 유실, 긴급 복구 | 비상 승인 및 교착 해소. 단독 집행 불가 | hardware wallet / policy signer | 이사회 또는 대표 승인 |

### 제 14 조 (조직도 및 직무분리 증빙)

1. 제출 패키지에는 다음 자료를 첨부한다.
   - 최신 조직도 PDF 또는 HR export
   - signer별 재직 상태, 부서, 직책 증빙
   - signer별 key custody 인수인계서
   - signer별 이해상충 확인서
   - 승인 권한 위임 규정 또는 이사회/경영진 승인 문서
2. 조직도 검토 기준은 다음과 같다.

| 검토 항목 | 기준 | 결과 |
| --- | --- | --- |
| 4명 signer가 서로 다른 부서에 속하는가 | Treasury, Finance, Security/Risk, Executive/Compliance 등으로 분리 | `<YES/NO>` |
| 재무승인과 보안승인이 독립되어 있는가 | Finance와 Security/Risk 분리 | `<YES/NO>` |
| 기안자가 단독 집행 권한을 갖지 않는가 | Safe threshold 3 및 내부 승인 규정으로 제한 | `<YES/NO>` |
| 비상복구 signer가 일상 집행자와 분리되어 있는가 | 운영 담당 부서와 분리 | `<YES/NO>` |
| HR event 발생 시 signer rotation trigger가 있는가 | 퇴사, 보직 변경, 휴직, 사고 발생 시 즉시 검토 | `<YES/NO>` |

### 제 15 조 (내부 시스템 role과 Safe signer의 구분)

1. control plane의 RBAC role은 Safe signer 권한을 대체하지 않는다.
2. 시스템 role은 workflow, approval, audit trace를 관리하며, 최종 자금 집행은 외부 Safe multisig에서 threshold 충족으로 통제한다.
3. 권장 매핑은 다음과 같다.

| Governance role | 시스템 role | 관련 권한 |
| --- | --- | --- |
| 기안자 | `TREASURY_OPERATOR` | `deposits:write`, `safe-proposals:write` |
| 재무승인 | `FINANCE_REVIEWER` 또는 `APPROVER` | `rewards:read`, `approvals:read`, `approvals:decide` |
| 보안승인 | `APPROVER` 또는 `ADMIN` | `approvals:decide`, `audit:read`, `inventory:read` |
| 비상복구 | `APPROVER` | `approvals:decide`, `audit:read` |
| 감사자 | `AUDITOR` | read-only |

## 제 4 장 DKG Ceremony 절차

### 제 16 조 (DKG 사전 승인)

DKG 시작 전 디지털 자산 위원회 또는 회사가 지정한 승인자는 다음 사항을 승인한다.

| 항목 | 필수값 | 승인자 |
| --- | --- | --- |
| Ceremony ID | `<DKG_CEREMONY_ID>` | DKG Coordinator |
| Network | `mainnet` 또는 `<TESTNET>` | Finance + Security |
| Cluster name | `<CLUSTER_NAME>` | Treasury + Infra |
| Operator count | `4` | Security |
| Threshold | `3` | Security + Finance |
| Validator count | `<N>` | Finance |
| Withdrawal address | `<SAFE_ADDRESS>` | Finance + Security |
| Fee recipient | `<FEE_RECIPIENT_ADDRESS>` | Finance |
| Safe owner snapshot | 4 owners / threshold 3 | Security |
| Web3Signer/KMS namespace | `<KMS_NAMESPACE>` | Security |
| Evidence path | `/secure/evidence/dkg-control/<DATE>/` | Audit |

### 제 17 조 (참석자 및 책임)

| 역할 | 성명 | 부서 | 책임 | 서명 |
| --- | --- | --- | --- | --- |
| DKG Coordinator | `<NAME>` | Treasury Operations | 계획, 일정, evidence index 작성 | YES |
| Operator 1 | `<NAME>` | Infra Operations | operator-1 ENR/DKG 실행, artifact hash 제출 | YES |
| Operator 2 | `<NAME>` | Infra Operations | operator-2 ENR/DKG 실행, artifact hash 제출 | YES |
| Operator 3 | `<NAME>` | Infra Operations | operator-3 ENR/DKG 실행, artifact hash 제출 | YES |
| Operator 4 | `<NAME>` | Infra Operations | operator-4 ENR/DKG 실행, artifact hash 제출 | YES |
| Security Observer | `<NAME>` | Security / Risk | key exposure 통제, 네트워크 통제 확인 | YES |
| Finance Observer | `<NAME>` | Finance / Accounting | validator count, deposit amount, Safe address 확인 | YES |
| Audit Observer | `<NAME>` | Internal Audit / Compliance | 증빙 완결성 확인 | YES |

### 제 18 조 (ENR 생성 및 등록 통제)

1. 각 operator는 DKG 참여 전 자기 Charon client의 ENR을 생성한다.
2. ENR은 Charon client의 public identity이며, 다른 Charon client가 해당 node를 식별하고 연결하기 위한 정보다.
3. `charon-enr-private-key`는 ENR private key로서 host-local 운영 secret이다. 이는 validator withdrawal key 또는 Safe signer key가 아니나, DKG 참여와 cluster 운영에 필요한 민감정보로 관리한다.
4. ENR 생성 방식은 Obol GUI 또는 Docker/CLI 중 하나를 사용할 수 있다. 두 방식 모두 다음 증빙을 남긴다.

| 항목 | GUI 사용 시 | Docker/CLI 사용 시 |
| --- | --- | --- |
| 생성자 | operator 담당자 | operator 담당자 |
| 생성 위치 | 승인된 host 또는 secure workstation | 승인된 host 또는 secure workstation |
| 증빙 | ENR 입력/등록 화면 캡처 | redacted command log |
| public ENR | cluster definition에 등록 | cluster definition에 등록 |
| private key | 화면/문서에 노출 금지 | `.charon/charon-enr-private-key` host-local |
| 승인 | Security Observer 확인 | Security Observer 확인 |

5. ENR 등록 결과는 `cluster-definition.json`의 operator address와 ENR 매핑으로 보관한다.
6. ENR은 소유권 증빙이 아니며, 회계감사 문서에서는 DVT node participation 및 operator identity onboarding 증빙으로만 사용한다.
7. ENR 변경 또는 `charon-enr-private-key` 분실은 cluster 운영 위험으로 즉시 보고하고, 신규 ENR 등록 및 cluster 변경 절차는 별도 approval을 받아야 한다.

### 제 19 조 (실행 환경)

1. `cluster-definition.json` 검토, Safe address 승인, hash manifest 작성은 오프라인 또는 내부 제한망 환경에서 수행할 수 있다.
2. 실제 Obol DKG 실행은 Charon participant 간 peer discovery 및 통신이 필요하므로 완전한 air-gap 환경으로 표현하지 않는다.
3. DKG 실행 환경은 일반 인터넷 접근을 허용하지 않고, 필요한 Charon peer, relay, internal endpoint만 allowlist로 제한한다.
4. 실행 환경 기준은 다음과 같다.

| 통제 항목 | 기준 | 증빙 |
| --- | --- | --- |
| 물리/논리 위치 | 승인된 operator host 또는 격리된 signer subnet | host inventory, access log |
| 네트워크 | Charon peer / relay / 필수 endpoint만 allowlist | firewall rule export, DNS log |
| 화면 캡처 | OS screenshot, 회의 녹화, 원격 제어 녹화 금지 | observer checklist |
| 외부 저장장치 | USB mass storage 차단 또는 사용 금지 | MDM policy, 현장 확인서 |
| 브라우저/메일 | DKG host에서 브라우저, 메신저, 이메일 사용 금지 | command history, observer checklist |
| 터미널 로그 | secret 출력 금지, command 중심 기록 | redacted terminal log |
| 파일 권한 | secret artifact는 owner-only permission | `ls -l` 결과 |
| 시간 동기화 | NTP 또는 승인된 time source | host preflight 결과 |

### 제 20 조 (DKG 단계별 절차)

1. DKG plan 생성
   - `DKG_CEREMONY_ID`, cluster name, validator count, threshold, Safe address를 기록한다.
   - Finance와 Security가 사전 승인한다.
2. Safe ownership snapshot 생성
   - `getOwners()`와 `getThreshold()`를 조회한다.
   - 4 owners / threshold 3 결과를 증빙 패키지에 저장한다.
3. ENR 생성 및 등록
   - 각 operator가 ENR을 생성한다.
   - public ENR만 creator 또는 Launchpad에 제출한다.
   - `charon-enr-private-key`는 operator host-local path에만 보관한다.
4. Cluster definition 검토
   - operator address, ENR, withdrawal address, fee recipient, network, validator count를 확인한다.
   - `withdrawal_address`가 회사 Safe address와 일치해야 한다.
   - definition hash 또는 config hash를 기록한다.
5. DKG 실행
   - 각 operator는 같은 cluster definition을 사용하여 DKG에 참여한다.
   - DKG 중 key material 출력, 화면 공유, 녹화, 파일 복사를 금지한다.
   - coordinator는 진행 상태와 hash만 기록하고 key share 내용을 수집하지 않는다.
6. 산출물 확인
   - 각 operator는 자기 환경에서 `cluster-lock.json`, validator keystore share, deposit data를 확인한다.
   - `deposit_data.json`에서 withdrawal credentials가 Safe address로 귀속되는지 검증한다.
7. Web3Signer/KMS 등록
   - validator key share는 Web3Signer + KMS 경로로만 import 또는 등록한다.
   - KMS key alias, Web3Signer public key visibility, KMS audit log를 기록한다.
   - raw key share file은 중앙 제출 패키지에 복사하지 않는다.
8. Artifact stage approval
   - runtime에는 승인된 `.charon` artifact만 stage한다.
   - 이 repository의 `stage-charon-artifacts.sh` 기준 허용 대상은 `cluster-lock.json`, `charon-enr-private-key`, optional `validator-pubkeys.txt`이다.
   - `validator_keys/`, `keystore-*.json`, mnemonic, seed, password file, key share file은 stage 대상이 아니다.
9. Audit close
   - 참석자와 참관자가 checklist에 서명한다.
   - control plane에는 approval id, hash, object key, key alias, reviewer, audit log ID만 저장한다.

### 제 21 조 (DKG 산출물 분류)

| 산출물 | 민감도 | 중앙 제출 패키지 | operator host | 비고 |
| --- | --- | --- | --- | --- |
| `cluster-definition.json` | 중간 | 가능 | 가능 | Safe address와 ENR mapping 검토 대상 |
| public ENR | 낮음/중간 | 가능 | 가능 | node identity, 소유권 증빙 아님 |
| `charon-enr-private-key` | 높음 | 원본 금지, 필요 시 hash/fingerprint만 | host-local only | DKG/cluster node identity secret |
| `cluster-lock.json` | 중간 | hash 및 사본 가능 | 가능 | Charon cluster 운영 artifact |
| `deposit_data.json` | 중간 | hash 및 검증용 사본 가능 | 필요 시 가능 | deposit 전 승인 대상 |
| validator pubkey list | 낮음/중간 | 가능 | 가능 | inventory 및 Web3Signer public key 검증 |
| validator keystore share | 높음 | 금지 | Web3Signer/KMS import path에서만 처리 | 중앙 수집 금지 |
| keystore password | 높음 | 금지 | KMS/import 절차 밖 보관 금지 | secret |
| mnemonic / seed | 높음 | 금지 | 금지 | 본 운영 모델에서 생성/보관하지 않음 |
| KMS key alias | 중간 | 가능 | 가능 | raw key 아님 |
| KMS audit log | 중간 | 요약 가능 | 가능 | key import/use 증빙 |

## 제 5 장 개인키 생성 절차 위험 통제

### 제 22 조 (키 노출 가능 시점 및 통제)

| 시점 | 노출 가능 정보 | 위험 | 통제 |
| --- | --- | --- | --- |
| ENR 생성 | `charon-enr-private-key` | node identity 탈취, DKG 참여 실패 | host-local 생성, git commit 금지, backup 통제 |
| cluster definition 작성 | Safe address, operator ENR | 잘못된 withdrawal address 또는 operator mapping | 2인 이상 review, Safe snapshot 대조 |
| DKG 실행 중 | validator key share 생성 과정 | 화면/로그/네트워크 유출 | 화면 녹화 금지, egress allowlist, 참관자 체크 |
| 산출물 생성 직후 | keystore share, password, deposit data | 파일 복제, 중앙 수집 | host-local 처리, chmod, no USB, no central copy |
| Web3Signer/KMS import | key share import input | raw material 잔존 | KMS import log, 임시 파일 제거, dual control |
| artifact stage | `.charon` artifact | validator key를 실수로 stage | allowlist stage script, sensitive path detection |
| deposit payload export | deposit data, Safe payload | 승인 전 submit | approval workflow, Safe external signing only |
| 운영 시작 | Web3Signer endpoint, pubkeys | signer 오연결, slash risk | signer inventory, slashing protection, health check |

### 제 23 조 (기술적 통제)

1. DKG 시작 전 다음 통제를 적용한다.
   - MDM 또는 OS policy로 화면 녹화와 screenshot 기능을 제한한다.
   - 회의 도구 녹화 기능은 비활성화하고, 필요 시 녹화 OFF 상태를 캡처한다.
   - DKG host에서 브라우저, 메신저, 이메일 클라이언트 사용을 금지한다.
   - USB mass storage 사용을 금지하거나 MDM으로 차단한다.
   - firewall egress를 Charon peer, relay, 필요한 endpoint로 제한한다.
   - DKG 작업 디렉토리와 output directory 권한을 owner-only로 설정한다.
   - operator별 host에서 다른 operator의 artifact가 존재하지 않는지 확인한다.
2. DKG 실행 중 다음 통제를 적용한다.
   - secret 또는 keystore 내용을 터미널에 출력하지 않는다.
   - 화면 공유가 필요한 경우 public key, hash, 진행 상태만 표시한다.
   - 참관자는 key material이 화면, 로그, 채팅, 티켓에 노출되지 않았음을 확인한다.
   - command output은 redaction 후 evidence package에 저장한다.
3. DKG 완료 직후 다음 통제를 적용한다.
   - `deposit_data.json`과 `cluster-lock.json` hash를 생성한다.
   - validator pubkey list와 withdrawal credentials를 추출한다.
   - key share import가 필요한 경우 Web3Signer/KMS 절차에서만 처리한다.
   - 임시 key share file은 KMS import 정책에 따라 삭제 또는 봉인한다.
   - 중앙 control plane에는 raw file이 아니라 hash, object key, approval id, key alias만 저장한다.

### 제 24 조 (원본 key share 단일 위치 재조합 부존재 입증)

세레머니 완료 후 다음 절차로 원본 key share가 단일 위치에 재조합되지 않았음을 입증한다.

1. Operator별 artifact attestation
   - 각 operator는 자기 host-local path에 자기 artifact만 존재했음을 서명한다.
   - 다른 operator의 keystore share를 수령하지 않았음을 명시한다.
2. 중앙 저장소 negative check
   - control plane DB, evidence package, repo, shared drive에 key share 원본이 없는지 확인한다.
   - 공개 repository는 `scripts/check-public-repo-safety.sh` 결과를 첨부한다.
   - secure evidence path는 별도 file scan 결과를 redaction 후 첨부한다.
3. KMS/Web3Signer proof
   - operator별 KMS namespace 또는 key alias가 분리되어 있음을 제출한다.
   - KMS audit log에서 import/use event가 operator별로 분리되어 있음을 확인한다.
   - Web3Signer public key visibility가 validator pubkey list와 일치하는지 확인한다.
4. Stage metadata 확인
   - 각 operator runtime의 `charon-artifacts-staging.env`에 validator keystore가 포함되지 않았음을 확인한다.
   - `CLUSTER_LOCK_SHA256`, `ENR_SHA256`, `PUBKEY_COUNT`, `APPROVAL_ID`만 제출한다.
5. Observer certificate
   - Security Observer와 Audit Observer가 "single-location recombination not observed" 확인서에 서명한다.

### 제 25 조 (Risk / Control Matrix)

| Risk ID | 위험 | 영향 | 통제점 | 증빙 |
| --- | --- | --- | --- | --- |
| R-01 | withdrawal address 오입력 | 출금 권한 상실 또는 타 계정 귀속 | DKG 전 Safe address 2인 검토, deposit data 검증 | Safe snapshot, withdrawal credentials CSV |
| R-02 | Safe owner / threshold 불일치 | 단독 소유권 증빙 약화 | `getOwners()`, `getThreshold()` snapshot, event history 검토 | Etherscan/RPC result |
| R-03 | ENR private key 노출 | node identity 탈취, DKG 실패 | host-local 보관, git commit 금지, backup 통제 | operator attestation |
| R-04 | DKG 중 화면 캡처/녹화 | key share 노출 | 녹화 금지, 화면 공유 금지, 참관자 확인 | observer checklist |
| R-05 | 외부 네트워크 유출 | key material exfiltration | egress allowlist, DNS/firewall log 검토 | firewall export |
| R-06 | key share 중앙 수집 | DVT 보안 모델 훼손 | operator-local custody, 중앙 DB 저장 금지 | zero-recombination attestation |
| R-07 | key share 단일 위치 재조합 | slash/절도 위험 | 각 operator key share 분리, KMS namespace 분리 | KMS alias mapping |
| R-08 | DKG 산출물 변조 | 잘못된 validator 활성화 | SHA256 manifest, lock verification, reviewer sign-off | hash manifest |
| R-09 | 승인 없는 deposit submit | 자금 집행 통제 실패 | deposit request approval, Safe external signing | Approval/AuditLog |
| R-10 | slash risk 이중 활성화 | validator slashing | Web3Signer slashing protection, failover approval | signer logs |
| R-11 | Web3Signer 오연결 | 서명 실패 또는 잘못된 key 사용 | signer inventory, mTLS/internal network, public key check | metrics, signer inventory |
| R-12 | runtime에 secret 포함 | public repo 또는 rollout 유출 | `verify.sh`, `rollout.sh` exclude, public safety check | script output |
| R-13 | signer 퇴사/보직변경 미반영 | 권한자 불일치 | 월간 owner review, HR trigger, rotation approval | HR org proof, Safe event |

### 제 26 조 (기록 보관 및 보고)

1. DKG, deposit, Safe proposal, signer 변경, rollout 및 Web3Signer/KMS import 관련 기록은 회계부서와 공유하고 최소 6년간 보관한다.
2. 다음 항목은 정기 사후관리 보고서에 포함한다.
   - active validator count
   - pending deposit count
   - Safe owner snapshot
   - signer health 및 Web3Signer health
   - slashing / penalty / downtime event
   - reward 및 fee recipient 수취 내역
   - DKG 또는 signer 관련 exception
3. slashing, penalty, 운영 중단, signer compromise, key material exposure, Safe owner mismatch가 발생한 경우 준법감시인 및 디지털 자산 위원회에 지체 없이 보고한다.

## 별지 1. Withdrawal Credentials 검증표

| Validator pubkey | Deposit data withdrawal credentials | Beacon state withdrawal credentials | Derived address | Safe match | Reviewer |
| --- | --- | --- | --- | --- | --- |
| `<0x...>` | `<0x01...>` | `<0x01...>` | `<SAFE_ADDRESS>` | YES | `<NAME>` |

## 별지 2. Safe Owner Snapshot

```text
SAFE_ADDRESS=<SAFE_ADDRESS>
CHAIN_ID=<CHAIN_ID>
SNAPSHOT_BLOCK=<BLOCK_NUMBER>
SNAPSHOT_AT=<YYYY-MM-DDTHH:MM:SSZ>
THRESHOLD=3
OWNERS=<SIGNER_1_ADDRESS>,<SIGNER_2_ADDRESS>,<SIGNER_3_ADDRESS>,<SIGNER_4_ADDRESS>
ETHERSCAN_READ_CONTRACT_URL=https://etherscan.io/address/<SAFE_ADDRESS>#readContract
REVIEWER=<NAME / DEPARTMENT>
```

## 별지 3. DKG Ceremony Checklist

| 단계 | 확인 항목 | 결과 | 서명 |
| --- | --- | --- | --- |
| 사전 승인 | DKG plan, validator count, Safe address 승인 | `<PASS/FAIL>` | `<NAME>` |
| ENR 생성 | 각 operator ENR 생성 및 private key host-local 보관 | `<PASS/FAIL>` | `<NAME>` |
| cluster definition | operator address, ENR, withdrawal address, fee recipient 검토 | `<PASS/FAIL>` | `<NAME>` |
| 실행 환경 | 녹화 금지, 외부망 제한, USB 제한, 참관자 확인 | `<PASS/FAIL>` | `<NAME>` |
| DKG 실행 | 4 operator 동시 참여, secret 출력 없음 | `<PASS/FAIL>` | `<NAME>` |
| 산출물 hash | `cluster-lock.json`, `deposit_data.json` hash 생성 | `<PASS/FAIL>` | `<NAME>` |
| withdrawal 검증 | 모든 validator가 Safe withdrawal credentials 사용 | `<PASS/FAIL>` | `<NAME>` |
| Web3Signer/KMS | key share가 승인된 signer path에만 등록 | `<PASS/FAIL>` | `<NAME>` |
| 부존재 확인 | 중앙 저장소에 raw key share 없음 | `<PASS/FAIL>` | `<NAME>` |

## 별지 4. 원본 key share 단일 위치 재조합 부존재 확인서

```text
DKG_CEREMONY_ID=<DKG_CEREMONY_ID>
CLUSTER_NAME=<CLUSTER_NAME>
DATE=<YYYY-MM-DD>

확인 사항:
1. 4개 operator key share 원본은 중앙 control plane, public repo, shared drive, evidence package에 수집되지 않았다.
2. 각 operator는 자기 host-local 또는 Web3Signer/KMS import path에서만 key share를 처리했다.
3. stage-charon-artifacts.sh는 validator_keys, keystore, mnemonic, seed, password 파일을 stage하지 않았다.
4. 제출 패키지에는 hash, public key, Safe address, approval metadata, KMS alias reference만 포함된다.

Security Observer: <NAME / SIGNATURE / TIME>
Audit Observer: <NAME / SIGNATURE / TIME>
DKG Coordinator: <NAME / SIGNATURE / TIME>
```

## 별지 5. 회계법인 검토 필요 사항

| 검토 항목 | 쟁점 | 제출 자료 |
| --- | --- | --- |
| 자체 운영 DVT의 상위 규정 정합성 | 상위 규정 제19조의 적격 수탁기관/HSM/MPC 요건과 Web3Signer + KMS + DVT 구조의 정합성 | 본 지침, KMS 설계, Web3Signer 설계, 조직도 |
| Safe withdrawal 구조 | Safe가 회사 단독 소유권 입증에 충분한가 | withdrawal credentials, Safe owner snapshot |
| DKG key share 성격 | validator key share가 출금/이전 권한인지, consensus signing 권한인지 | Obol DKG docs, cluster lock, deposit data |
| reward 회계 처리 | 원금 ETH와 staking reward 식별·기록 방식 | reward ledger, fee recipient report |
| 외부 operator 여부 | 제3자가 독립적으로 인출 또는 이전을 개시할 수 있는가 | Safe structure, signer governance, DKG operator contract |

## 참고 자료

- 상위 규정: 디지털 자산의 취득 및 관리에 관한 규정(2026.03.06)
- Obol Distributed Key Generation docs: https://docs.obol.org/docs/learn/charon/dkg
- Obol Cluster Configuration docs: https://docs.obol.org/learn/charon/cluster-configuration
- Obol Charon CLI Reference: https://docs.obol.org/learn/charon/charon-cli-reference
- Obol Create a DV With a Group: https://docs.obol.org/run-a-dv/start/create-a-dv-with-a-group
- Etherscan address template: `https://etherscan.io/address/<SAFE_ADDRESS>`
