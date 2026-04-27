# 단독 소유권 및 개인키 생성 절차 위험 통제 문서 초안

문서 상태: Draft v0.1  
작성 기준일: 2026-04-27  
적용 범위: ETH Treasury Obol DVT 3-of-4 운영 클러스터, Safe OVM 계정, Web3Signer + KMS signer custody

## 0. 문서 목적

이 문서는 ETH Treasury 스테이킹 운영에서 다음 두 가지를 제출 가능한 증빙 체계로 정리하기 위한 초안이다.

- 회사가 staked ETH와 validator 출금 권한을 단독으로 통제한다는 소유권 증빙
- Obol DKG 과정에서 validator signing key share가 노출되거나 단일 위치에 재조합되지 않도록 하는 절차와 통제점

이 문서는 법률 의견서 또는 세무 의견서가 아니다. 법무법인, 세무대리인, 회계감사인이 검토할 수 있도록 온체인 증빙, 내부 승인 문서, 키 생성 절차, 감사 로그의 연결 관계를 정리한 내부통제 초안이다.

## 0.1 현재 시스템 전제

레포 기준 전제:

- DVT runtime은 Obol `charon-distributed-validator-node` baseline을 사용한다.
- 4대 bare-metal operator host가 동일한 자동화 경로로 구성된다.
- 클러스터 threshold는 3-of-4다.
- validator client signing path는 로컬 keystore가 아니라 Web3Signer + KMS다.
- Safe multisig contract를 treasury execution 및 OVM 계정으로 사용한다.
- deposit transaction은 시스템이 자동 서명하지 않는다.
- validator key material, seed, mnemonic, raw secret은 애플리케이션 DB와 공개 레포에 저장하지 않는다.

레포 내 관련 구현 근거:

- CDVN runtime 정책: `infra/obol-cdvn/README.md`
- runtime script 정책: `infra/obol-cdvn/scripts/README.md`
- Web3Signer overlay 정책: `infra/obol-cdvn/overlays/web3signer/README.md`
- secret 금지 정책: `SECURITY.md`
- public repo safety check: `scripts/check-public-repo-safety.sh`
- approval / audit / DKG / Safe 데이터 모델: `packages/db/prisma/schema.prisma`

## 0.2 제출 패키지 원칙

실제 주소, 실명, 부서명, 내부 URL, KMS key ref, artifact 원본은 이 공개 레포에 넣지 않는다. 제출용 패키지는 별도 secure evidence path에 보관한다.

권장 제출 패키지 경로:

```text
/secure/evidence/
  ownership/
    YYYY-MM-DD/
      00-index.md
      01-safe-onchain/
      02-withdrawal-credentials/
      03-signer-governance/
      04-organization-proof/
  dkg-control/
    YYYY-MM-DD/
      00-index.md
      01-ceremony-plan/
      02-execution-record/
      03-artifact-hashes/
      04-kms-web3signer-proof/
      05-zero-recombination-attestation/
```

중앙 제출 패키지에 보관 가능한 것:

- Safe 주소, Etherscan 링크, block number, tx hash
- validator public key 목록
- withdrawal credentials 조회 결과
- `deposit_data.json`의 hash와 검증 결과
- `cluster-lock.json`의 hash와 lock hash
- Safe owner / threshold 조회 결과
- 승인 문서, 참석자 명단, 참관자 서명, 조직도
- Web3Signer/KMS key alias 및 audit log 요약
- stage / rollout approval metadata

중앙 제출 패키지에 보관하면 안 되는 것:

- mnemonic, seed, raw validator private key
- validator keystore 원본
- keystore password
- operator별 validator key share 원본
- Web3Signer client private key
- `jwt.hex`
- 실제 host-local `.charon/charon-enr-private-key` 원본

## 1. 단독 소유권 입증 체계 구축

### 1.1 온체인 소유권 증빙 문서화

#### 1.1.1 입증 명제

입증 대상 명제는 다음과 같이 둔다.

> 회사는 해당 validator들의 경제적 출금 권한을 단독 보유한 Safe multisig contract로 귀속시켰고, 해당 Safe는 회사 내부 4개 서명자 주소로만 구성된 3-of-4 구조로 통제된다.

이 명제는 다음 증빙을 모두 연결해 입증한다.

- validator public key
- deposit data의 withdrawal credentials 또는 withdrawal address
- Beacon chain에서 조회되는 validator withdrawal credentials
- Safe contract address
- Safe owner 4개 주소와 threshold 3
- owner 4명이 회사 내부 서로 다른 부서에 속한다는 권한 배정표와 조직도
- DKG / deposit / Safe export 승인 로그

#### 1.1.2 Withdrawal Credentials 증빙

제출 대상:

| 항목 | 제출값 | 증빙 방법 | 파일 예시 |
| --- | --- | --- | --- |
| Network | `<MAINNET_OR_TESTNET>` | deposit request, cluster inventory | `00-index.md` |
| Safe address | `<SAFE_ADDRESS>` | Etherscan address page, Safe read contract | `01-safe-onchain/safe-address.md` |
| Validator public key | `<VALIDATOR_PUBKEY>` | deposit data, Beacon API, cluster lock | `02-withdrawal-credentials/validators.csv` |
| Withdrawal credentials | `<WITHDRAWAL_CREDENTIALS>` | deposit data와 Beacon state 조회 | `02-withdrawal-credentials/withdrawal-credentials.csv` |
| Derived withdrawal address | `<SAFE_ADDRESS>` | credentials 끝 20 bytes 또는 cluster definition withdrawal address 대조 | `02-withdrawal-credentials/derivation.md` |
| Deposit data hash | `sha256:<HASH>` | 원본 파일 해시, reviewer sign-off | `02-withdrawal-credentials/deposit-data.sha256` |
| Cluster lock hash | `<LOCK_HASH>` | Obol lock verify 또는 cluster-lock hash | `02-withdrawal-credentials/cluster-lock.md` |

검증 절차:

1. DKG 승인 문서에서 canonical Safe address를 확정한다.
2. `cluster-definition.json` 또는 Obol Launchpad export에서 `withdrawal_address`가 `<SAFE_ADDRESS>`인지 확인한다.
3. 생성된 `deposit_data.json`의 각 validator entry에서 `withdrawal_credentials`를 추출한다.
4. execution withdrawal credentials 형식인 경우 끝 20 bytes가 `<SAFE_ADDRESS>`와 일치하는지 확인한다.
5. Beacon chain finalized state에서 해당 validator의 withdrawal credentials가 deposit data와 일치하는지 확인한다.
6. `deposit_data.json`, `cluster-lock.json`, 검증 결과 파일의 SHA256을 제출 패키지에 기록한다.
7. 검토자는 validator 수, public key 수, withdrawal credentials 수, Safe address 일치 여부를 서명한다.

검증 결과 표준 양식:

| Validator pubkey | Deposit data withdrawal credentials | Beacon state withdrawal credentials | Derived address | Match | Reviewer |
| --- | --- | --- | --- | --- | --- |
| `<0x...>` | `<0x01...>` | `<0x01...>` | `<SAFE_ADDRESS>` | YES | `<NAME>` |

캡처 및 링크:

- Etherscan Safe address: `https://etherscan.io/address/<SAFE_ADDRESS>`
- Etherscan read contract: `https://etherscan.io/address/<SAFE_ADDRESS>#readContract`
- Beacon explorer validator page: `<BEACON_EXPLORER_URL>/validator/<VALIDATOR_PUBKEY>`
- 내부 consensus client Beacon API 조회 결과: `/eth/v1/beacon/states/finalized/validators/<VALIDATOR_PUBKEY>`

제출 시 유의:

- Etherscan 캡처만으로는 validator withdrawal credentials와 Safe 귀속이 완결되지 않는다.
- 반드시 deposit data, Beacon state, Safe address를 같은 validator public key 기준으로 연결해야 한다.
- deposit transaction을 실행한 EOA가 회사 계정이 아니더라도 withdrawal credentials가 회사 Safe로 귀속되어 있으면 경제적 출금 권한 증빙의 핵심은 Safe address다.

#### 1.1.3 Safe와 4개 서명자 주소의 온체인 연결 관계

제출 대상:

| 항목 | 제출값 | 온체인 검증 방법 | 증빙 파일 |
| --- | --- | --- | --- |
| Safe contract | `<SAFE_ADDRESS>` | Etherscan address / contract page | `safe-contract.md` |
| Chain ID | `1` 또는 `<CHAIN_ID>` | Safe deployment network | `safe-contract.md` |
| Threshold | `3` | Safe `getThreshold()` read call | `safe-read-contract.json` |
| Owner 1 | `<SIGNER_1_ADDRESS>` | Safe `getOwners()` read call | `safe-owners.csv` |
| Owner 2 | `<SIGNER_2_ADDRESS>` | Safe `getOwners()` read call | `safe-owners.csv` |
| Owner 3 | `<SIGNER_3_ADDRESS>` | Safe `getOwners()` read call | `safe-owners.csv` |
| Owner 4 | `<SIGNER_4_ADDRESS>` | Safe `getOwners()` read call | `safe-owners.csv` |
| Owner change history | tx hash / block | `AddedOwner`, `RemovedOwner`, `ChangedThreshold` events | `safe-events.csv` |

Safe owner / threshold snapshot 양식:

```text
SAFE_ADDRESS=<SAFE_ADDRESS>
CHAIN_ID=<CHAIN_ID>
SNAPSHOT_BLOCK=<BLOCK_NUMBER>
SNAPSHOT_AT=<YYYY-MM-DDTHH:MM:SSZ>
THRESHOLD=3
OWNERS=<SIGNER_1_ADDRESS>,<SIGNER_2_ADDRESS>,<SIGNER_3_ADDRESS>,<SIGNER_4_ADDRESS>
ETHERSCAN_READ_CONTRACT_URL=https://etherscan.io/address/<SAFE_ADDRESS>#readContract
```

Safe event history 양식:

| Event | Tx hash | Block | Effective owner set | Reviewer note |
| --- | --- | --- | --- | --- |
| Safe setup | `<TX_HASH>` | `<BLOCK>` | 4 owners / threshold 3 | initial ownership |
| AddedOwner | `<TX_HASH>` | `<BLOCK>` | `<OWNER_SET>` | signer rotation, if any |
| RemovedOwner | `<TX_HASH>` | `<BLOCK>` | `<OWNER_SET>` | signer rotation, if any |
| ChangedThreshold | `<TX_HASH>` | `<BLOCK>` | threshold 3 | must remain 3-of-4 |

통제 기준:

- owner 4개 주소와 threshold 3은 매월 snapshot으로 보관한다.
- owner 변경, threshold 변경, module enable, fallback handler 변경은 모두 별도 approval과 audit log 대상이다.
- Safe UI 캡처는 보조 증빙으로만 사용하고, 최종 제출에는 Etherscan read contract 또는 RPC call 결과를 포함한다.
- signer 주소의 실소유자는 권한 배정표와 키 인수인계서로 연결한다.

### 1.2 Safe 3-of-4 거버넌스 구조 공식 문서화

#### 1.2.1 권한 배정표

아래 표는 제출용 양식이다. 실제 실명, 부서, 직책, 임직원 식별자는 secure evidence path에만 보관한다.

| Safe role | Signer address | 실명 | 소속 부서 | 직책 | 주 책임 | 승인 범위 | 보유 매체 | 백업/교대 기준 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 기안자 | `<SIGNER_1_ADDRESS>` | `<NAME_1>` | Treasury Operations | `<TITLE>` | deposit request, Safe payload 초안, 운영 변경 기안 | 기안 및 1차 검토. 단독 집행 불가 | hardware wallet / policy signer | 부재 시 Treasury Ops 대체자 승인 필요 |
| 재무승인 | `<SIGNER_2_ADDRESS>` | `<NAME_2>` | Finance / Accounting | `<TITLE>` | 예치 금액, 회계 귀속, 월간 reward 검토 | 자금 집행 승인 필수 signer | hardware wallet / policy signer | CFO 또는 위임권자 승인 |
| 보안승인 | `<SIGNER_3_ADDRESS>` | `<NAME_3>` | Security / Risk | `<TITLE>` | key custody, withdrawal credential, signer 변경 검토 | key / signer / rollout 위험 승인 필수 signer | hardware wallet / policy signer | CISO 또는 위임권자 승인 |
| 비상복구 | `<SIGNER_4_ADDRESS>` | `<NAME_4>` | Executive / Compliance / BCP | `<TITLE>` | 사고 대응, signer 유실, 긴급 복구 | 비상 승인 및 교착 해소. 단독 집행 불가 | hardware wallet / policy signer | 이사회 또는 대표 승인 |

3-of-4 의사결정 원칙:

- 어떤 1인도 Safe transaction을 단독 실행할 수 없다.
- 일반 deposit payload export는 기안자, 재무승인, 보안승인 중 최소 3명 승인으로 진행한다.
- signer 변경, withdrawal credential 관련 행위, emergency failover는 별도 고위험 approval을 필요로 한다.
- 승인자는 자신이 검토한 증빙 목록과 Safe tx hash를 확인한 뒤 서명한다.
- 퇴사, 보직 변경, 장기 휴가, 키 분실, 보안 사고 발생 시 signer rotation approval을 즉시 개시한다.

#### 1.2.2 조직도 첨부 기준

제출 패키지에는 다음 자료를 첨부한다.

- 최신 조직도 PDF 또는 HR export
- 각 signer의 부서, 직책, 재직 상태 증명
- signer별 key custody 인수인계서
- signer별 이해상충 확인서
- 승인 권한 위임 규정 또는 이사회/경영진 승인 문서

조직도 검토 기준:

| 검토 항목 | 기준 | 결과 |
| --- | --- | --- |
| 4명 signer가 서로 다른 부서에 속하는가 | Treasury, Finance, Security/Risk, Executive/Compliance 등으로 분리 | `<YES/NO>` |
| signer 간 직속 보고 라인이 과도하게 집중되어 있지 않은가 | 동일 직속 상급자 아래 3명 이상 집중 금지 | `<YES/NO>` |
| 재무승인과 보안승인이 독립되어 있는가 | Finance와 Security/Risk 분리 | `<YES/NO>` |
| 기안자가 단독 집행 권한을 갖지 않는가 | Safe threshold 3 및 내부 승인 규정으로 제한 | `<YES/NO>` |
| 비상복구 signer가 일상 집행자와 분리되어 있는가 | 운영 담당 부서와 분리 | `<YES/NO>` |

#### 1.2.3 내부 시스템 매핑

현재 레포의 RBAC와 workflow는 governance 문서와 다음처럼 매핑한다.

| Governance role | 시스템 role | 관련 권한 | 비고 |
| --- | --- | --- | --- |
| 기안자 | `TREASURY_OPERATOR` | `deposits:write`, `safe-proposals:write` | deposit request와 Safe payload export 담당 |
| 재무승인 | `FINANCE_REVIEWER` 또는 `APPROVER` | `rewards:read`, `approvals:read`, `approvals:decide` | 자금 집행과 정산 검토 |
| 보안승인 | `APPROVER` 또는 `ADMIN` | `approvals:decide`, `audit:read`, `inventory:read` | signer, DKG, rollout 고위험 검토 |
| 비상복구 | `APPROVER` | `approvals:decide`, `audit:read` | emergency 절차 전용 |
| 감사자 | `AUDITOR` | read-only | 사후 검토 |

RBAC는 Safe signer 권한을 대체하지 않는다. 시스템 role은 workflow와 audit trace를 관리하고, 최종 자금 집행은 외부 Safe multisig에서 threshold 충족으로 통제한다.

## 2. 개인키 생성 절차 위험 통제

### 2.1 DKG 세레머니 절차서

#### 2.1.1 DKG 세레머니 개요

Obol DKG는 distributed validator key share를 생성하는 절차다. 최종 validator는 하나의 BLS public key로 Beacon chain에 등록되지만, signing 권한은 4개 operator의 key share와 3-of-4 threshold 운영 구조로 분산된다.

중요한 운영 원칙:

- 실제 DKG 실행은 Charon participant node 간 네트워크 연결이 필요하므로 완전 오프라인 절차로 표현하지 않는다.
- cluster-definition 검토, withdrawal address 승인, evidence package 작성, artifact hash 기록은 오프라인 또는 제한망에서 수행할 수 있다.
- DKG 실행 환경은 인터넷 전체 접근이 아니라 allowlist 기반 egress로 제한한다.
- operator별 key share는 해당 operator의 signer 경로로만 이동한다.
- control plane, 중앙 DB, 공개 레포, 중앙 staging host에는 key share 원본을 모으지 않는다.

#### 2.1.2 참석자와 역할

| 역할 | 성명 | 부서 | 책임 | 서명 필요 여부 |
| --- | --- | --- | --- | --- |
| DKG Coordinator | `<NAME>` | Treasury Operations | ceremony 계획, 일정, 산출물 index 작성 | YES |
| Operator 1 | `<NAME>` | Infra Operations | operator-1 host 실행, artifact hash 제출 | YES |
| Operator 2 | `<NAME>` | Infra Operations | operator-2 host 실행, artifact hash 제출 | YES |
| Operator 3 | `<NAME>` | Infra Operations | operator-3 host 실행, artifact hash 제출 | YES |
| Operator 4 | `<NAME>` | Infra Operations | operator-4 host 실행, artifact hash 제출 | YES |
| Security Observer | `<NAME>` | Security / Risk | key exposure 통제, 네트워크 통제 확인 | YES |
| Finance Observer | `<NAME>` | Finance / Accounting | validator count, deposit amount, Safe address 확인 | YES |
| Audit Observer | `<NAME>` | Internal Audit / Compliance | 증빙 완결성 확인 | YES |

#### 2.1.3 사전 승인 조건

DKG 시작 전 다음 항목이 승인되어야 한다.

| 항목 | 필수값 | 승인자 |
| --- | --- | --- |
| Ceremony number | `<DKG_CEREMONY_ID>` | DKG Coordinator |
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

현재 레포에서 대응되는 workflow:

- `ApprovalPolicyType.DKG_CEREMONY`
- `DkgCeremony.clusterLockObjectKey`
- `DkgCeremony.depositDataObjectKey`
- `AuditLog`

#### 2.1.4 실행 환경

실행 환경 기준:

| 통제 항목 | 기준 | 증빙 |
| --- | --- | --- |
| 물리/논리 위치 | 승인된 operator host 또는 격리된 signer subnet | host inventory, access log |
| 네트워크 | Charon peer / relay / 필요한 endpoint만 allowlist | firewall rule export, DNS log |
| 화면 캡처 | OS screenshot, 회의 녹화, 원격 제어 녹화 금지 | observer checklist |
| 외부 저장장치 | USB mass storage 차단 또는 사용 금지 | MDM policy, 현장 확인서 |
| 브라우저/메일 | DKG host에서 브라우저, 메신저, 이메일 사용 금지 | command history, observer checklist |
| 터미널 로그 | secret 출력 금지, command 중심 기록 | redacted terminal log |
| 파일 권한 | secret artifact는 owner-only permission | `ls -l` 결과 |
| 시간 동기화 | NTP 또는 승인된 time source | host preflight 결과 |

오프라인 여부:

- `cluster-definition.json` 검토와 Safe address 승인: 오프라인 가능.
- Charon DKG 실행: participant discovery와 peer 연결이 필요하므로 제한망/allowlist 환경에서 수행.
- artifact hash 산출과 제출 문서 작성: 오프라인 또는 내부망 가능.

#### 2.1.5 단계별 절차

1. Ceremony plan 생성
   - `DKG_CEREMONY_ID`를 발급한다.
   - network, cluster name, validator count, operator count, threshold, Safe address를 기록한다.
   - Finance와 Security가 DKG 계획을 승인한다.

2. Safe ownership snapshot 생성
   - Etherscan 또는 RPC call로 `<SAFE_ADDRESS>`의 `getOwners()`와 `getThreshold()`를 조회한다.
   - owner 4개 주소와 threshold 3을 증빙 패키지에 저장한다.
   - owner 변경 event history를 확인한다.

3. Cluster definition 검토
   - `cluster-definition.json` 또는 Obol Launchpad URL/export를 확인한다.
   - `withdrawal_address`가 `<SAFE_ADDRESS>`와 일치해야 한다.
   - operator ENR, fee recipient, network fork version, validator count를 확인한다.
   - definition hash를 기록한다.

4. 실행 환경 점검
   - host preflight를 수행한다.
   - 네트워크 allowlist와 화면 캡처/녹화 금지 상태를 확인한다.
   - 참석자와 참관자 명단을 확정한다.

5. DKG 실행
   - 각 operator는 자기 host 또는 승인된 실행 환경에서 Charon DKG를 실행한다.
   - DKG 중 secret 출력, 화면 공유, 녹화, 파일 복사를 금지한다.
   - coordinator는 진행 상태만 기록하고 key share 내용을 수집하지 않는다.

6. 산출물 확인
   - 각 operator는 자기 환경에서 산출물을 확인한다.
   - 일반적인 Obol DKG 산출물은 `cluster-lock.json`, validator keystore share, deposit data다.
   - 이 레포 runtime에는 Web3Signer overlay 기준으로 `cluster-lock.json`, `charon-enr-private-key`, optional `validator-pubkeys.txt`만 stage 가능하다.
   - validator keystore share는 Web3Signer + KMS 경로 밖으로 복제하지 않는다.

7. Withdrawal credential 검증
   - deposit data에서 validator pubkey와 withdrawal credentials를 추출한다.
   - withdrawal credentials가 Safe address로 귀속되는지 확인한다.
   - validator count와 deposit amount가 승인된 DKG plan과 일치해야 한다.

8. Web3Signer/KMS 등록 확인
   - operator별 key share가 해당 operator의 Web3Signer/KMS namespace에 등록되었는지 확인한다.
   - KMS key alias, Web3Signer public key visibility, KMS audit log를 기록한다.
   - raw key share 파일은 중앙 제출 패키지에 복사하지 않는다.

9. Hash manifest 작성
   - `cluster-lock.json`, deposit data, validator pubkey list, verification output의 SHA256을 기록한다.
   - operator별 host-local secret 파일은 파일 원본 대신 operator attestation과 KMS audit reference만 제출한다.

10. Artifact stage approval
    - `charon-artifact-stage` approval을 생성한다.
    - `stage-charon-artifacts.sh`는 `cluster-lock.json`, `charon-enr-private-key`, optional `validator-pubkeys.txt`만 host-local runtime에 stage한다.
    - `validator_keys/`, `keystore-*.json`, mnemonic, seed, password file이 source dir에 있으면 stage를 중단한다.

11. Audit close
    - DKG Coordinator, Security Observer, Finance Observer, Audit Observer가 checklist에 서명한다.
    - control plane에는 approval id, hash, object key, signer mapping, reviewer만 저장한다.
    - raw key material은 저장하지 않는다.

#### 2.1.6 산출물 분류

| 산출물 | 민감도 | 중앙 제출 패키지 보관 | operator host 보관 | 비고 |
| --- | --- | --- | --- | --- |
| `cluster-definition.json` | 낮음/중간 | 가능 | 가능 | Safe address 검토 대상 |
| `cluster-lock.json` | 중간 | hash 및 사본 가능 | 가능 | Charon cluster 운영 artifact |
| `deposit_data.json` | 중간 | hash 및 검증용 사본 가능 | 필요 시 가능 | deposit 전 승인 대상 |
| validator pubkey list | 낮음/중간 | 가능 | 가능 | Web3Signer fetch policy에 따라 사용 |
| validator keystore share | 높음 | 금지 | Web3Signer/KMS import path에서만 관리 | 중앙 수집 금지 |
| keystore password | 높음 | 금지 | KMS/import 절차 밖 보관 금지 | secret |
| mnemonic / seed | 높음 | 금지 | 금지 | 이 운영 모델에서 생성/보관하지 않음 |
| `charon-enr-private-key` | 높음 | 원본 금지, hash만 가능 | host-local only | host identity secret |
| KMS key alias | 중간 | 가능 | 가능 | raw key 아님 |
| KMS audit log | 중간 | 요약 가능 | 가능 | key import/use 증빙 |

#### 2.1.7 키 노출 가능 시점과 통제 방법

| 시점 | 노출 가능 정보 | 위험 | 통제 |
| --- | --- | --- | --- |
| cluster definition 작성 | Safe address, operator ENR | 잘못된 withdrawal address | 2인 이상 review, Safe snapshot 대조 |
| DKG 실행 중 | key share 생성 과정 | 화면/로그/네트워크 유출 | 화면 녹화 금지, egress allowlist, 참관자 체크 |
| 산출물 생성 직후 | keystore share, password, deposit data | 파일 복제, 중앙 수집 | host-local 처리, chmod, no USB, no central copy |
| Web3Signer/KMS import | key share import input | raw material 잔존 | KMS import log, 임시 파일 제거, dual control |
| artifact stage | `.charon` artifact | validator key를 실수로 stage | allowlist stage script, sensitive path detection |
| deposit payload export | deposit data, Safe payload | 승인 전 submit | approval workflow, Safe external signing only |
| 운영 시작 | Web3Signer endpoint, pubkeys | signer 오연결, slash risk | signer inventory, slashing protection, health check |

### 2.2 키 생성 과정 Risk 식별 및 통제점

#### 2.2.1 Risk / Control Matrix

| Risk ID | 위험 | 영향 | 통제점 | 증빙 |
| --- | --- | --- | --- | --- |
| R-01 | withdrawal address 오입력 | 출금 권한 상실 또는 타 계정 귀속 | DKG 전 Safe address 2인 검토, deposit data 검증 | Safe snapshot, withdrawal credentials CSV |
| R-02 | Safe owner / threshold 불일치 | 단독 소유권 증빙 약화 | `getOwners()`, `getThreshold()` snapshot, event history 검토 | Etherscan/RPC result |
| R-03 | DKG 중 화면 캡처/녹화 | key share 노출 | 녹화 금지, 화면 공유 금지, 참관자 확인 | observer checklist |
| R-04 | 외부 네트워크 유출 | key material exfiltration | egress allowlist, DNS/firewall log 검토 | firewall export |
| R-05 | key share 중앙 수집 | DVT 보안 모델 훼손 | operator-local custody, 중앙 DB 저장 금지 | zero-recombination attestation |
| R-06 | key share 단일 위치 재조합 | slash/절도 위험 | 각 operator key share 분리, KMS namespace 분리 | KMS alias mapping |
| R-07 | DKG 산출물 변조 | 잘못된 validator 활성화 | SHA256 manifest, lock verification, reviewer sign-off | hash manifest |
| R-08 | 승인 없는 deposit submit | 자금 집행 통제 실패 | deposit request approval, Safe external signing | Approval/AuditLog |
| R-09 | slash risk 이중 활성화 | validator slashing | Web3Signer slashing protection, failover approval | signer logs |
| R-10 | Web3Signer 오연결 | 서명 실패 또는 잘못된 key 사용 | signer inventory, mTLS/internal network, public key check | metrics, signer inventory |
| R-11 | runtime에 secret 포함 | public repo 또는 rollout 유출 | `verify.sh`, `rollout.sh` exclude, public safety check | script output |
| R-12 | signer 퇴사/보직변경 미반영 | 권한자 불일치 | 월간 owner review, HR trigger, rotation approval | HR org proof, Safe event |

#### 2.2.2 기술적 통제 목록

DKG 시작 전:

- MDM 또는 OS policy로 화면 녹화와 screenshot 기능을 제한한다.
- 회의 도구 녹화 기능은 비활성화하고, 녹화가 꺼진 상태를 캡처한다.
- DKG host에서 브라우저, 메신저, 이메일 클라이언트 사용을 금지한다.
- USB mass storage 사용을 금지하거나 MDM으로 차단한다.
- firewall egress를 Charon peer, relay, 필요한 endpoint로 제한한다.
- DKG 작업 디렉토리와 output directory 권한을 owner-only로 설정한다.
- operator별 host에서 다른 operator의 artifact가 존재하지 않는지 확인한다.

DKG 실행 중:

- secret 또는 keystore 내용을 터미널에 출력하지 않는다.
- 화면 공유가 필요한 경우 public key, hash, 진행 상태만 표시한다.
- 참관자는 key material이 화면, 로그, 채팅, 티켓에 노출되지 않았음을 확인한다.
- DKG command output은 redaction 후 evidence package에 저장한다.

DKG 완료 직후:

- `deposit_data.json`과 `cluster-lock.json` hash를 생성한다.
- validator pubkey list와 withdrawal credentials를 추출한다.
- key share import가 필요한 경우 Web3Signer/KMS 절차에서만 처리한다.
- 임시 key share 파일은 KMS import 정책에 따라 삭제 또는 봉인한다.
- 중앙 control plane에는 raw file이 아니라 hash, object key, approval id, key alias만 저장한다.

runtime stage 시:

- `stage-charon-artifacts.sh --runtime-dir`를 operator host에서 실행한다.
- `--render-dir --execute`는 실운영에서 사용하지 않는다.
- source dir에 `validator_keys/`, `keystore-*.json`, `*mnemonic*`, `*seed*`, `*password*`, `*keyshare*`가 있으면 stage를 중단한다.
- stage metadata에는 `CLUSTER_LOCK_SHA256`, `ENR_SHA256`, `PUBKEYS_SHA256`, `APPROVAL_ID`, `APPROVED_BY`, `APPROVED_AT`을 기록한다.

#### 2.2.3 단일 위치 재조합 부존재 입증 절차

세레머니 완료 후 다음 절차로 원본 key share가 단일 위치에 재조합되지 않았음을 입증한다.

1. Operator별 artifact attestation 작성
   - 각 operator는 자기 host-local path에 자기 artifact만 존재했음을 서명한다.
   - 다른 operator의 keystore share를 수령하지 않았음을 명시한다.
   - 제출 양식: `operator-<N>-artifact-attestation.md`

2. 중앙 저장소 negative check
   - control plane DB, evidence package, repo, shared drive에 key share 원본이 없는지 확인한다.
   - 공개 레포는 `scripts/check-public-repo-safety.sh` 결과를 첨부한다.
   - secure evidence path는 별도 `find` 결과를 redaction 후 첨부한다.

3. KMS/Web3Signer proof 수집
   - operator별 KMS namespace 또는 key alias가 분리되어 있음을 제출한다.
   - KMS audit log에서 import/use event가 operator별로 분리되어 있음을 확인한다.
   - Web3Signer public key visibility가 validator pubkey list와 일치하는지 확인한다.

4. Stage metadata 확인
   - 각 operator runtime의 `charon-artifacts-staging.env`에 validator keystore가 포함되지 않았음을 확인한다.
   - `CLUSTER_LOCK_SHA256`, `ENR_SHA256`, `PUBKEY_COUNT`만 제출한다.

5. Observer certificate 작성
   - Security Observer와 Audit Observer가 "single-location recombination not observed" 확인서에 서명한다.
   - 이 확인서는 파일 원본이 아니라 절차와 로그 기반의 부존재 확인이다.

부존재 확인서 예시:

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

## 3. 법무/세무 검토 메모

이 문서의 법무/세무 목적은 "세무상 소유자", "회계상 자산 귀속", "위탁/수탁 여부", "내부통제 적정성" 판단에 필요한 원천 증빙을 정리하는 것이다.

검토 포인트:

- staked ETH의 경제적 출금 권한이 회사 Safe로 귀속되는지
- Safe owner 4명이 회사 내부 권한자이며, 3-of-4 구조로 단독자 임의 집행이 불가능한지
- deposit data, Beacon state, Safe on-chain state가 같은 주소 체계를 가리키는지
- DKG 및 signer custody 과정에서 외부 수탁자 또는 개인에게 경제적 처분 권한이 이전되지 않는지
- validator reward, execution reward, MEV reward, penalty, infra cost allocation이 회계 장부와 연결되는지

참고로 2026-04-27 현재 확인한 공개 공식 자료 기준, 한국의 가상자산 과세와 이용자 보호 법령은 변동 가능성이 있으므로 제출 전 최신 법령과 과세 지침을 다시 확인해야 한다. 이 문서는 법률 효과를 단정하지 않고, 최신 법령 검토를 위한 증빙 구조만 제시한다.

## 4. 제출 전 체크리스트

| 항목 | 완료 | 비고 |
| --- | --- | --- |
| Safe address가 최종 확정되었다 | `<YES/NO>` | |
| Safe `getOwners()` 결과가 4명이다 | `<YES/NO>` | |
| Safe `getThreshold()` 결과가 3이다 | `<YES/NO>` | |
| owner 4명 실명/부서/직책 권한표가 완성되었다 | `<YES/NO>` | |
| 조직도와 HR proof가 첨부되었다 | `<YES/NO>` | |
| deposit data withdrawal credentials가 Safe address와 일치한다 | `<YES/NO>` | |
| Beacon state withdrawal credentials가 deposit data와 일치한다 | `<YES/NO>` | |
| `deposit_data.json` hash가 기록되었다 | `<YES/NO>` | |
| `cluster-lock.json` hash 또는 lock hash가 기록되었다 | `<YES/NO>` | |
| DKG 참석자와 참관자 서명이 완료되었다 | `<YES/NO>` | |
| 화면 캡처/녹화/외부망 통제 증빙이 첨부되었다 | `<YES/NO>` | |
| operator별 KMS/Web3Signer proof가 첨부되었다 | `<YES/NO>` | |
| 원본 key share 단일 위치 재조합 부존재 확인서가 첨부되었다 | `<YES/NO>` | |
| approval id와 audit log id가 연결되었다 | `<YES/NO>` | |
| 공개 레포 safety check 결과가 첨부되었다 | `<YES/NO>` | |

## 5. 참고 링크

- 가상자산 이용자 보호 등에 관한 법률, 국가법령정보센터: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=261099
- 가상자산 이용자 보호 등에 관한 법률 시행령, 국가법령정보센터: https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=270729
- 거주자의 가상자산소득 과세 개요, 국세청: https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=238935&mi=40370
- Obol Distributed Key Generation docs: https://docs.obol.org/learn/charon/dkg
- Obol Cluster Lock API docs: https://docs.obol.org/version-v1.6/api/cluster-lock
- Etherscan address template: `https://etherscan.io/address/<SAFE_ADDRESS>`
