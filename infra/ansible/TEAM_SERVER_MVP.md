# Team Server MVP Runbook

이 문서는 Ubuntu 팀서버 한 대에 Control Plane MVP를 처음부터 끝까지 올리는 절차다. OVH bare-metal도 Ubuntu로 설치한다면 같은 흐름을 거의 그대로 쓸 수 있다.

목표:

1. 로컬 Mac에서 Ansible로 팀서버에 SSH 접속한다.
2. 배포 모드를 고른다: host `systemd` 설치 또는 Docker Compose.
3. 이 repo를 release archive로 묶어 팀서버 `/opt/eth-treasury-staking-automation`에 배포한다.
4. Prisma schema를 PostgreSQL에 적용하고 seed data를 넣는다.
5. API/Web을 systemd service 또는 compose service로 등록한다.
6. `http://TEAM_SERVER:4000/v1/health`, `http://TEAM_SERVER:3000`으로 확인한다.

## 1. 전제

팀서버:

- Ubuntu 22.04 또는 24.04
- SSH 접속 가능
- `ubuntu` 또는 sudo 가능한 사용자
- outbound internet 가능
- inbound `3000`, `4000` 포트 접근 가능
- Docker Compose 모드에서는 Docker Hub 접근 가능

로컬 Mac:

- Homebrew Ansible 설치 완료
- 이 repo checkout 완료
- 팀서버 SSH key 준비 완료

확인:

```bash
ssh ubuntu@TEAM_SERVER_IP 'lsb_release -a'
ssh ubuntu@TEAM_SERVER_IP 'sudo -n true && echo sudo-ok'
```

`sudo -n true`가 실패하면 실행 시 `--ask-become-pass`를 붙인다.

## 2. 로컬 Ansible 환경 설정

repo root로 이동한다.

```bash
cd /Users/ethan/Desktop/eth-treasury-staking-automation
```

Ansible config와 temp 경로를 지정한다.

```bash
mkdir -p /private/tmp/ansible-local /private/tmp/ansible-remote

export ANSIBLE_CONFIG=infra/ansible/ansible.cfg
export ANSIBLE_LOCAL_TEMP=/private/tmp/ansible-local
export ANSIBLE_REMOTE_TEMP=/private/tmp/ansible-remote
```

설치 확인:

```bash
ansible --version
```

## 3. 팀서버 Inventory 만들기

private inventory는 repo 밖에 둔다.

```bash
mkdir -p ~/.config/eth-staking-ansible/team-server
cp infra/ansible/inventories/team-server.example/hosts.yml \
  ~/.config/eth-staking-ansible/team-server/hosts.yml
```

파일을 연다.

```bash
$EDITOR ~/.config/eth-staking-ansible/team-server/hosts.yml
```

다음을 실제 값으로 바꾼다.

```yaml
all:
  children:
    team_server:
      hosts:
        team_server_1:
          ansible_host: TEAM_SERVER_IP
          ansible_user: ubuntu
      vars:
        control_plane_deploy_mode: systemd
        control_plane_api_port: 4000
        control_plane_web_port: 3000
        control_plane_api_base_url: http://TEAM_SERVER_IP:4000
        control_plane_app_base_url: http://TEAM_SERVER_IP:3000
        control_plane_auth_secret: LONG_RANDOM_AUTH_SECRET
        control_plane_health_sync_token: LONG_RANDOM_SYNC_TOKEN
        control_plane_postgres_database: eth_staking_automation
        control_plane_postgres_user: eth_staking_app
        control_plane_postgres_password: LONG_RANDOM_DB_PASSWORD
```

secret 생성 예:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32; echo
```

주의:

- 이 inventory는 commit하지 않는다.
- `control_plane_auth_secret`, `control_plane_health_sync_token`, `control_plane_postgres_password`는 서로 다른 값을 쓴다.
- `control_plane_postgres_password`는 shell quoting 이슈를 피하려고 영문/숫자 위주로 만든다.
- `control_plane_deploy_mode: systemd`는 Node.js/pnpm/PostgreSQL을 host에 설치하고 API/Web을 systemd로 실행한다.
- `control_plane_deploy_mode: compose`는 Docker Compose로 `api`, `web`, `postgres`를 같은 compose 네트워크에 올린다. 이 모드에서는 `control_plane_database_url`을 따로 주지 않으면 `postgres` service name을 쓰는 내부 URL이 자동 생성된다.
- systemd 모드에서 서버의 Docker 등이 `5432`를 이미 쓰고 있으면 Ubuntu PostgreSQL 클러스터가 `5433` 같은 다른 포트로 올라갈 수 있으며, role은 실제 클러스터 포트를 자동 감지해 `DATABASE_URL`에 반영한다.

## 4. Syntax Check

먼저 playbook 구조만 검사한다.

```bash
ansible-playbook --syntax-check \
  -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  infra/ansible/playbooks/team-server-mvp.yml
```

대상 host 해석 확인:

```bash
ansible-inventory \
  -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  --graph
```

## 5. SSH Ping

Ansible로 SSH 접속이 되는지 확인한다.

```bash
ansible \
  -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  team_server \
  -m ping
```

sudo가 password를 요구하면:

```bash
ansible \
  -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  team_server \
  -m ping \
  --ask-become-pass
```

## 6. MVP 배포 실행

기본 실행:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  infra/ansible/playbooks/team-server-mvp.yml
```

sudo password가 필요하면:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  infra/ansible/playbooks/team-server-mvp.yml \
  --ask-become-pass
```

이 playbook은 팀서버에서 다음을 수행한다.

`control_plane_deploy_mode: systemd`:

1. 필수 변수 검증
2. PostgreSQL 설치 및 시작
3. local DB user/database 생성
4. NodeSource Node.js 20 repository 등록
5. Node.js 20 설치
6. npm으로 pnpm 10 고정 버전 설치
7. control-plane Linux user/group 생성
8. repo release archive를 팀서버로 배포
9. `pnpm install --frozen-lockfile`
10. `pnpm db:generate`
11. `pnpm db:push`
12. `pnpm db:seed`
13. `pnpm build`
14. `eth-staking-api`, `eth-staking-web` systemd service 등록
15. API/Web health check

`control_plane_deploy_mode: compose`:

1. 필수 변수 검증
2. Docker/Docker Compose plugin 설치 및 시작
3. control-plane Linux user/group 생성
4. repo release archive를 팀서버로 배포
5. 기존 `eth-staking-api`, `eth-staking-web` systemd service가 있으면 중지
6. `/etc/eth-treasury-staking-automation/docker-compose.yml`, `compose.env` 작성
7. API/Web image build
8. PostgreSQL compose service 시작
9. `docker compose run --rm api pnpm db:push`
10. `docker compose run --rm api pnpm db:seed`
11. API/Web compose service 시작
12. API/Web health check

## 7. 배포 확인

로컬에서 확인:

```bash
curl http://TEAM_SERVER_IP:4000/v1/health
curl http://TEAM_SERVER_IP:3000/
curl http://TEAM_SERVER_IP:4000/v1/inventory/validators
```

브라우저:

```text
http://TEAM_SERVER_IP:3000
http://TEAM_SERVER_IP:4000/docs
```

팀서버에서 service 확인:

```bash
ssh ubuntu@TEAM_SERVER_IP 'systemctl status eth-staking-api --no-pager'
ssh ubuntu@TEAM_SERVER_IP 'systemctl status eth-staking-web --no-pager'
```

Compose 모드 service 확인:

```bash
ssh ubuntu@TEAM_SERVER_IP \
  'sudo docker compose -f /etc/eth-treasury-staking-automation/docker-compose.yml ps'
```

로그 확인:

```bash
ssh ubuntu@TEAM_SERVER_IP 'journalctl -u eth-staking-api -n 100 --no-pager'
ssh ubuntu@TEAM_SERVER_IP 'journalctl -u eth-staking-web -n 100 --no-pager'
```

DB 확인:

```bash
ssh ubuntu@TEAM_SERVER_IP \
  'sudo -u postgres psql -d eth_staking_automation -c "select count(*) from \"Cluster\";"'
```

Compose 모드 DB 확인:

```bash
ssh ubuntu@TEAM_SERVER_IP \
  'sudo docker compose -f /etc/eth-treasury-staking-automation/docker-compose.yml exec -T postgres psql -U eth_staking_app -d eth_staking_automation -c "select count(*) from \"Cluster\";"'
```

## 8. 다시 배포하기

코드 변경 후 같은 명령을 다시 실행하면 된다.

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/team-server/hosts.yml \
  infra/ansible/playbooks/team-server-mvp.yml
```

role은 새 release archive를 만들고, dependency/build/schema/service restart를 다시 수행한다.

## 9. Health Sync까지 테스트하기

팀서버에 Control Plane이 뜬 뒤, operator host가 따로 있다면 operator inventory에 다음 값을 맞춘다.

```yaml
health_sync_endpoint_url: http://TEAM_SERVER_IP:4000/v1/internal/cdvn/health-sync
health_sync_token: SAME_VALUE_AS_control_plane_health_sync_token
```

Preview:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/operator/hosts.yml \
  infra/ansible/playbooks/health-sync.yml \
  --limit operator_1 \
  --extra-vars @~/.config/eth-staking-ansible/operator/operator.vars.yml
```

Submit:

```bash
ansible-playbook \
  -i ~/.config/eth-staking-ansible/operator/hosts.yml \
  infra/ansible/playbooks/health-sync.yml \
  --limit operator_1 \
  --extra-vars @~/.config/eth-staking-ansible/operator/operator.vars.yml \
  --extra-vars '{"execute":true}'
```

현재 팀서버 한 대만으로는 CDVN operator runtime metadata가 없을 수 있으므로, health-sync는 operator runtime render/rollout 후 테스트한다.

## 10. OVH Bare-Metal로 옮길 때

OVH 서버도 Ubuntu로 설치하면 같은 절차를 쓴다.

바꿀 값:

- `ansible_host`
- `control_plane_api_base_url`
- `control_plane_app_base_url`
- DB password/auth token류

추가로 확인할 것:

- OVH 방화벽/security group에서 22, 3000, 4000 접근 허용
- 장기 운영 시 3000/4000 직접 노출 대신 nginx + TLS로 reverse proxy 구성
- 운영 DB는 local PostgreSQL 대신 managed/external DB로 분리 가능
- Prisma migration history가 생기면 `control_plane_schema_mode: migrate`로 전환

## 11. 문제 해결

role not found:

```bash
export ANSIBLE_CONFIG=infra/ansible/ansible.cfg
```

temp permission error:

```bash
mkdir -p /private/tmp/ansible-local /private/tmp/ansible-remote
export ANSIBLE_LOCAL_TEMP=/private/tmp/ansible-local
export ANSIBLE_REMOTE_TEMP=/private/tmp/ansible-remote
```

NodeSource apt repository 실패:

```bash
ssh ubuntu@TEAM_SERVER_IP 'curl -I https://deb.nodesource.com'
```

PostgreSQL DB 생성 실패:

```bash
ssh ubuntu@TEAM_SERVER_IP 'systemctl status postgresql --no-pager'
ssh ubuntu@TEAM_SERVER_IP 'sudo -u postgres psql -c "\du"'
```

API 500:

```bash
ssh ubuntu@TEAM_SERVER_IP 'journalctl -u eth-staking-api -n 200 --no-pager'
```

Web이 API 데이터를 못 읽는 경우:

```bash
ssh ubuntu@TEAM_SERVER_IP 'cat /etc/eth-treasury-staking-automation/web.env'
ssh ubuntu@TEAM_SERVER_IP 'curl http://127.0.0.1:4000/v1/inventory/validators'
```
