# Ansible Usage Guide

이 문서는 Ansible을 처음 쓰는 운영자가 이 저장소의 `infra/ansible`을 안전하게 실행하기 위한 실전 가이드다.

현재 Ubuntu 팀서버 한 대에 MVP를 처음부터 올리는 절차는 `TEAM_SERVER_MVP.md`를 먼저 따른다. 이 문서는 공통 개념과 반복적으로 쓰는 명령을 설명한다.

## 1. 먼저 알아야 할 개념

Ansible은 "어떤 host에 어떤 작업을 할지"를 YAML로 선언하고 SSH로 실행한다.

이 저장소에서는 역할을 이렇게 나눈다.

| 개념 | 이 저장소의 파일 | 의미 |
|---|---|---|
| Inventory | `inventories/*/hosts.yml` | 대상 host 목록과 host별 변수 |
| Playbook | `playbooks/*.yml` | 실행 진입점. 어떤 host group에 어떤 role을 실행할지 결정 |
| Role | `roles/*/tasks/main.yml` | 실제 작업 구현 |
| Variables | `group_vars/*.yml`, private vars | DB URL, API URL, secure path 같은 값 |

Playbook이 짧아 보이는 것은 정상이다. 실제 구현은 role에 있다.

예:

- `playbooks/control-plane.yml` -> `roles/control_plane/tasks/main.yml`
- `playbooks/health-sync.yml` -> `roles/cdvn_runtime`, `roles/cdvn_health`
- `playbooks/full-operator-mvp.yml` -> 여러 CDVN role 조합

## 2. 안전 원칙

운영 전에 이 원칙을 지켜야 한다.

- `inventories/example/hosts.yml`은 실행용이 아니라 구조 예시다.
- 실제 inventory, secret, approval env, SSH key, validator key, `.charon` artifact는 repo에 commit하지 않는다.
- 처음에는 항상 `--syntax-check`와 dry-run 계열 playbook부터 실행한다.
- `execute=true`는 실제 host나 runtime을 변경할 수 있으므로 승인 파일과 대상 host를 확인한 뒤 사용한다.
- Control Plane Web은 Ansible inventory를 직접 읽지 않는다. Ansible은 API에 결과를 제출하고, Web은 API/DB만 읽는다.

## 3. 로컬 준비

Homebrew로 설치했다면:

```bash
brew install ansible
ansible --version
```

repo root에서 실행할 때는 `ANSIBLE_CONFIG`를 지정한다. 지정하지 않으면 `roles_path`를 못 찾아서 role not found가 날 수 있다.

```bash
cd /Users/ethan/Desktop/eth-treasury-staking-automation

export ANSIBLE_CONFIG=infra/ansible/ansible.cfg
```

Codex sandbox나 제한된 macOS 환경에서는 Ansible 기본 temp 경로가 막힐 수 있다. 그때는 writable temp를 지정한다.

```bash
mkdir -p /private/tmp/ansible-local /private/tmp/ansible-remote

export ANSIBLE_LOCAL_TEMP=/private/tmp/ansible-local
export ANSIBLE_REMOTE_TEMP=/private/tmp/ansible-remote
```

이 세 줄은 로컬 shell에 계속 켜두면 편하다.

```bash
export ANSIBLE_CONFIG=infra/ansible/ansible.cfg
export ANSIBLE_LOCAL_TEMP=/private/tmp/ansible-local
export ANSIBLE_REMOTE_TEMP=/private/tmp/ansible-remote
```

## 4. 첫 확인 명령

먼저 syntax check만 돌린다. 이 단계는 SSH 접속이나 실제 변경 없이 playbook/role 구조를 검증한다.

```bash
ansible-playbook --syntax-check \
  -i infra/ansible/inventories/example/hosts.yml \
  infra/ansible/playbooks/control-plane.yml
```

```bash
ansible-playbook --syntax-check \
  -i infra/ansible/inventories/example/hosts.yml \
  infra/ansible/playbooks/health-sync.yml
```

```bash
ansible-playbook --syntax-check \
  -i infra/ansible/inventories/example/hosts.yml \
  infra/ansible/playbooks/full-operator-mvp.yml
```

Inventory가 어떻게 해석되는지 확인한다.

```bash
ansible-inventory \
  -i infra/ansible/inventories/example/hosts.yml \
  --graph
```

## 5. 실제 Inventory 만들기

실제 inventory는 repo 밖에 두는 것을 권장한다.

예:

```bash
mkdir -p ~/.config/eth-staking-ansible
cp infra/ansible/inventories/example/hosts.yml ~/.config/eth-staking-ansible/hosts.yml
```

그 다음 `~/.config/eth-staking-ansible/hosts.yml`의 `REPLACE_WITH_*` 값을 실제 host로 바꾼다.

최소 구조는 다음과 같다.

```yaml
all:
  children:
    control_plane:
      hosts:
        control_plane_1:
          ansible_host: 10.0.0.10
          ansible_user: ubuntu
    operator_hosts:
      hosts:
        operator_1:
          ansible_host: 10.0.0.21
          ansible_user: ubuntu
          host_name: operator-1
        operator_2:
          ansible_host: 10.0.0.22
          ansible_user: ubuntu
          host_name: operator-2
```

SSH 접속 확인:

```bash
ansible \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  all \
  -m ping
```

특정 group만 확인:

```bash
ansible \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  control_plane \
  -m ping
```

```bash
ansible \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  operator_hosts \
  -m ping
```

## 6. Private Variables 만들기

secret이 들어가는 값은 repo 밖에 둔다.

예:

```bash
cat > ~/.config/eth-staking-ansible/control-plane.vars.yml <<'EOF'
control_plane_database_url: postgresql://USER:PASSWORD@DB_HOST:5432/eth_staking_automation?schema=public
control_plane_auth_secret: REPLACE_WITH_LONG_RANDOM_SECRET
control_plane_health_sync_token: REPLACE_WITH_LONG_RANDOM_SYNC_TOKEN
control_plane_api_base_url: http://CONTROL_PLANE_HOST:4000
control_plane_app_base_url: http://CONTROL_PLANE_HOST:3000
control_plane_schema_mode: push
control_plane_seed_database: false
EOF
```

`control_plane_schema_mode`는 지금은 `push`가 기본이다. Prisma migration history가 생기면 운영에서는 `migrate`로 바꾼다.

Operator health sync용 token도 같은 값을 사용한다.

```bash
cat > ~/.config/eth-staking-ansible/operator.vars.yml <<'EOF'
health_sync_endpoint_url: http://CONTROL_PLANE_HOST:4000/v1/internal/cdvn/health-sync
health_sync_token: REPLACE_WITH_LONG_RANDOM_SYNC_TOKEN
EOF
```

## 7. Control Plane 배포

Control Plane host 사전 조건:

- SSH 접속 가능
- Node.js 20+
- Corepack
- pnpm
- systemd
- PostgreSQL 접속 가능

syntax check:

```bash
ansible-playbook --syntax-check \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  infra/ansible/playbooks/control-plane.yml
```

실행:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  infra/ansible/playbooks/control-plane.yml \
  --extra-vars @~/.config/eth-staking-ansible/control-plane.vars.yml
```

이 playbook은 다음을 수행한다.

1. 필수 변수 검증
2. control-plane user/group 생성
3. `/opt/eth-treasury-staking-automation` 등 디렉터리 생성
4. repo release archive 생성 후 host에 배포
5. `pnpm install --frozen-lockfile`
6. Prisma client generate
7. schema apply
8. `pnpm build`
9. API/Web systemd service 등록
10. `/v1/health`와 Web root health check

실행 후 확인:

```bash
ssh ubuntu@CONTROL_PLANE_HOST 'systemctl status eth-staking-api --no-pager'
ssh ubuntu@CONTROL_PLANE_HOST 'systemctl status eth-staking-web --no-pager'
curl http://CONTROL_PLANE_HOST:4000/v1/health
curl http://CONTROL_PLANE_HOST:3000/
```

## 8. Operator Host 준비 순서

Operator host는 CDVN runtime을 실행하는 bare-metal host다.

먼저 bootstrap:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  infra/ansible/playbooks/bootstrap-host.yml \
  --limit operator_1
```

그 다음 일반적인 실행 순서는 다음과 같다.

1. render
2. verify rendered runtime
3. rollout dry-run
4. rollout execute
5. host preflight
6. artifact stage dry-run
7. artifact stage execute
8. deployed verify
9. compose dry-run
10. compose execute
11. health sync

이 순서를 한 번에 미리 보는 MVP playbook:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  infra/ansible/playbooks/full-operator-mvp.yml \
  --limit operator_1 \
  --extra-vars '{"execute":false}'
```

`execute=false`는 기본적으로 preview/dry-run 성격이다.

## 9. Health Sync

Health sync는 operator runtime metadata를 Control Plane API로 제출해 DB에 `Cluster`, `OperatorHost`, `AuditLog`를 반영한다.

먼저 preview:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  infra/ansible/playbooks/health-sync.yml \
  --limit operator_1 \
  --extra-vars @~/.config/eth-staking-ansible/operator.vars.yml
```

실제 제출:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  infra/ansible/playbooks/health-sync.yml \
  --limit operator_1 \
  --extra-vars @~/.config/eth-staking-ansible/operator.vars.yml \
  --extra-vars '{"execute":true}'
```

`execute=true`일 때 `roles/cdvn_health`가 `HEALTH_SYNC_TOKEN` 환경변수로 token을 넘기고, API는 `x-control-plane-sync-token` header를 검증한다.

## 10. 자주 쓰는 옵션

대상 host 제한:

```bash
--limit operator_1
```

변수 파일 주입:

```bash
--extra-vars @~/.config/eth-staking-ansible/control-plane.vars.yml
```

인라인 변수 주입:

```bash
--extra-vars '{"execute":false}'
```

상세 로그:

```bash
-v
-vv
-vvv
```

실행할 task 목록 확인:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  infra/ansible/playbooks/control-plane.yml \
  --list-tasks
```

대상 host 목록 확인:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/hosts.yml \
  infra/ansible/playbooks/control-plane.yml \
  --list-hosts
```

## 11. 문제 해결

role not found:

```text
the role 'control_plane' was not found
```

repo root에서 `ANSIBLE_CONFIG`를 지정하지 않은 경우가 많다.

```bash
export ANSIBLE_CONFIG=infra/ansible/ansible.cfg
```

temp permission error:

```text
Operation not permitted: ~/.ansible/tmp
```

temp 경로를 writable directory로 바꾼다.

```bash
mkdir -p /private/tmp/ansible-local /private/tmp/ansible-remote
export ANSIBLE_LOCAL_TEMP=/private/tmp/ansible-local
export ANSIBLE_REMOTE_TEMP=/private/tmp/ansible-remote
```

SSH 실패:

```bash
ansible -i ~/.config/eth-staking-ansible/hosts.yml all -m ping -vvv
```

원격 host에서 sudo password가 필요한 경우:

```bash
ansible-playbook ... --ask-become-pass
```

Control Plane API가 안 뜨는 경우:

```bash
ssh ubuntu@CONTROL_PLANE_HOST 'journalctl -u eth-staking-api -n 100 --no-pager'
ssh ubuntu@CONTROL_PLANE_HOST 'journalctl -u eth-staking-web -n 100 --no-pager'
```

DB 연결 실패는 대부분 `control_plane_database_url` 또는 DB 방화벽 문제다.

## 12. 다음 확장 지점

현재 Ansible은 MVP 골격이다. 이후 두껍게 만들 부분은 다음이다.

- Node.js/pnpm 설치 role 추가
- PostgreSQL 자체 provision role 추가 또는 managed DB 명세 분리
- private inventory/vault 운영 표준 추가
- Prisma migration history 추가 후 `control_plane_schema_mode: migrate` 기본화
- health sync에서 Node/Signer/Validator 세부 상태까지 upsert
- `ansible-lint` 도입
