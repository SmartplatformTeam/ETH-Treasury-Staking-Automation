# Ansible CDVN Runtime Orchestration

`infra/ansible` is the MVP orchestration layer between the Control Plane backend and the existing `infra/obol-cdvn/scripts` runtime scripts.

It does not replace the CDVN scripts and does not create hosts, secrets, keys, DKG artifacts, or Terraform state.

It also includes a minimal control-plane deployment role for the Web/API/Postgres-facing application host. That role prepares a release directory, applies the Prisma schema, builds the monorepo, registers systemd services, and verifies API/Web health.

If you are new to Ansible, start with `USAGE.md`.

For the first one-server Ubuntu MVP test on the current team server, follow `TEAM_SERVER_MVP.md`.

## Directory Structure

```text
infra/ansible
├── ansible.cfg
├── USAGE.md
├── TEAM_SERVER_MVP.md
├── group_vars/all.example.yml
├── inventories/example/hosts.yml
├── inventories/team-server.example/hosts.yml
├── playbooks
│   ├── team-server-mvp.yml
│   ├── control-plane.yml
│   ├── bootstrap-host.yml
│   ├── render-runtime.yml
│   ├── verify-runtime.yml
│   ├── rollout-runtime.yml
│   ├── preflight-host.yml
│   ├── stage-charon-artifacts.yml
│   ├── execute-compose.yml
│   ├── health-sync.yml
│   └── full-operator-mvp.yml
└── roles
    ├── control_plane
    ├── common
    ├── cdvn_runtime
    ├── cdvn_artifacts
    ├── cdvn_compose
    └── cdvn_health
```

## Example Inventory

`inventories/example/hosts.yml` contains public-safe placeholder hosts:

- `control_plane_1`
- `operator_1`
- `operator_2`
- `operator_3`
- `operator_4`

`control_plane_1` is the host that runs the Web/API services. The example variables intentionally use `REPLACE_WITH_*` values and must be replaced by a private inventory or extra-vars file before execution.

The operator group contains:

- `operator_1`
- `operator_2`
- `operator_3`
- `operator_4`

The values are public-safe placeholders such as `REPLACE_WITH_OPERATOR_1_HOST`. Production inventory must live outside the public repo and should be selected by backend configuration, not by a request body.

## Host Assumptions

The target is an already-prepared bare-metal operator host reachable by Ansible. The host must have or be able to install:

- Docker
- Docker Compose plugin
- `rsync`
- `curl`
- `jq`
- `ca-certificates`
- `chrony` or an equivalent time sync service

The control-plane host must have:

- Node.js 20+
- `pnpm`
- outbound access to the configured PostgreSQL database
- systemd

For the team-server MVP playbook, Node.js and pnpm are installed automatically on Ubuntu.

The host-local secure paths are assumed to exist or be created as directories only:

- `/secure/config`
- `/secure/approvals/active`
- `/var/lib/eth-treasury-operator-artifacts/<cluster>`
- `/opt/obol/<cluster>`

The playbooks never create `jwt.hex`, validator keys, mnemonic material, Web3Signer private keys, or raw DKG output.

## Secure Config Policy

The render playbook expects the operator host to have:

- `/secure/config/cluster.yml`
- `/secure/config/host.yml`

These files are not copied from the Control Plane and are not stored in this repo.

Execute playbooks expect host-local approval files, for example:

- `/secure/approvals/active/rollout-approval.env`
- `/secure/approvals/active/charon-artifact-approval.env`

The backend stores the approval id and metadata. It does not store approval env contents.

## Control Plane Deployment

The control-plane deployment role expects private values for:

- `control_plane_database_url`
- `control_plane_auth_secret`
- `control_plane_health_sync_token`
- `control_plane_api_base_url`
- `control_plane_app_base_url`

Example:

```bash
ansible-playbook \
  -i infra/ansible/inventories/prod/hosts.yml \
  infra/ansible/playbooks/control-plane.yml \
  --extra-vars @infra/ansible/private/control-plane.vars.yml
```

The role performs:

1. validates required runtime variables
2. creates an application user and directories
3. checks Node.js 20+ and pnpm
4. builds a local public-safe release archive from the repository
5. unpacks the archive on the control-plane host
6. runs `pnpm install --frozen-lockfile`
7. generates Prisma client
8. applies schema with `pnpm db:push` by default
9. optionally runs `pnpm db:seed`
10. runs `pnpm build`
11. writes API/Web env files under `/etc/eth-treasury-staking-automation`
12. registers `eth-staking-api` and `eth-staking-web` systemd services
13. checks `http://127.0.0.1:4000/v1/health` and Web root

`control_plane_schema_mode` defaults to `push` because this repository currently has a Prisma schema and seed, but no migration history. Production should switch to `migrate` after migrations are added.

## Runtime Health Sync

`health-sync.yml` can either preview or submit a CDVN runtime payload from an operator host.

Preview mode is the default:

```bash
ansible-playbook -i infra/ansible/inventories/example/hosts.yml infra/ansible/playbooks/health-sync.yml --limit operator_1
```

Submit mode posts to the internal API endpoint:

```bash
ansible-playbook \
  -i infra/ansible/inventories/prod/hosts.yml \
  infra/ansible/playbooks/health-sync.yml \
  --limit operator_1 \
  --extra-vars '{"execute":true}'
```

The API endpoint is `POST /v1/internal/cdvn/health-sync` and requires the `x-control-plane-sync-token` header. The Ansible role passes that header through the `HEALTH_SYNC_TOKEN` environment variable so the token is not printed in the command line.

## Command Examples

From the repository root:

```bash
ANSIBLE_CONFIG=infra/ansible/ansible.cfg \
  ansible-playbook --syntax-check \
  -i infra/ansible/inventories/example/hosts.yml \
  infra/ansible/playbooks/control-plane.yml
```

```bash
ANSIBLE_CONFIG=infra/ansible/ansible.cfg \
  ansible-playbook \
  -i infra/ansible/inventories/example/hosts.yml \
  infra/ansible/playbooks/render-runtime.yml
```

```bash
ANSIBLE_CONFIG=infra/ansible/ansible.cfg \
  ansible-playbook \
  -i infra/ansible/inventories/example/hosts.yml \
  infra/ansible/playbooks/rollout-runtime.yml \
  --extra-vars '{"execute":false}'
```

```bash
ANSIBLE_CONFIG=infra/ansible/ansible.cfg \
  ansible-playbook \
  -i infra/ansible/inventories/example/hosts.yml \
  infra/ansible/playbooks/full-operator-mvp.yml \
  --limit operator_1
```

Syntax check:

```bash
ANSIBLE_CONFIG=infra/ansible/ansible.cfg \
  ansible-playbook --syntax-check \
  -i infra/ansible/inventories/example/hosts.yml \
  infra/ansible/playbooks/full-operator-mvp.yml
```

## Dry-Run vs Execute

Dry-run operations call the existing CDVN scripts without `--execute` where the script supports preview mode.

Execute operations pass `--execute` to the existing scripts and require:

- backend RBAC permission
- an approved backend `Approval` record
- cluster, host, and operation match on the approval record
- host-local approval file expected by the CDVN script

## Artifact Stage Rules

`stage-charon-artifacts.yml` runs `stage-charon-artifacts.sh` on the operator host and reads from the host-local source path:

```text
/var/lib/eth-treasury-operator-artifacts/<cluster>
```

Allowed staged targets:

- `.charon/cluster-lock.json`
- `.charon/charon-enr-private-key`
- optional `validator-pubkeys.txt`

Forbidden targets:

- `.charon/validator_keys/`
- `keystore-*.json`
- keystore password files
- mnemonic or seed material
- raw key material
- deposit data export files

The Control Plane never uploads, downloads, or centrally stages original operator artifacts.

## Secret Handling

Do not commit real inventory, approval env files, secure config, host config, cluster config, SSH keys, `jwt.hex`, DKG output, validator keystores, Web3Signer keys, or `.charon` raw artifacts.

The Ansible role output is intended for redacted backend logging. The backend redacts stdout/stderr before persistence, but playbooks should still avoid printing secret values.
