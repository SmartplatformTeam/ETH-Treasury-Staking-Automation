# Ansible CDVN Runtime Orchestration

`infra/ansible` is the MVP orchestration layer between the Control Plane backend and the existing `infra/obol-cdvn/scripts` runtime scripts.

It does not replace the CDVN scripts and does not create hosts, secrets, keys, DKG artifacts, or Terraform state.

## Directory Structure

```text
infra/ansible
├── ansible.cfg
├── group_vars/all.example.yml
├── inventories/example/hosts.yml
├── playbooks
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
    ├── common
    ├── cdvn_runtime
    ├── cdvn_artifacts
    ├── cdvn_compose
    └── cdvn_health
```

## Example Inventory

`inventories/example/hosts.yml` contains placeholder operator hosts only:

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

## Command Examples

From the repository root:

```bash
ansible-playbook -i infra/ansible/inventories/example/hosts.yml infra/ansible/playbooks/render-runtime.yml
```

```bash
ansible-playbook -i infra/ansible/inventories/example/hosts.yml infra/ansible/playbooks/rollout-runtime.yml --extra-vars '{"execute":false}'
```

```bash
ansible-playbook -i infra/ansible/inventories/example/hosts.yml infra/ansible/playbooks/full-operator-mvp.yml --limit operator_1
```

Syntax check:

```bash
ansible-playbook --syntax-check infra/ansible/playbooks/full-operator-mvp.yml -i infra/ansible/inventories/example/hosts.yml
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
