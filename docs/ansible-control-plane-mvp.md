# Ansible Control Plane MVP

This document describes the MVP that extends the existing ETH Treasury Staking Automation monorepo with Ansible-backed operator automation.

## Scope

The correct shape is:

```text
Control Plane UI
  -> NestJS API
  -> AutomationRun / AutomationRunEvent
  -> ansible-playbook
  -> infra/ansible playbooks
  -> existing infra/obol-cdvn scripts
  -> already-prepared operator host
```

This is not a new project and not a Terraform implementation. The existing repository already owns the UI, API, Prisma schema, RBAC model, CDVN runtime scripts, and public safety policy, so the MVP extends those layers surgically.

## Why Terraform Is Excluded

Terraform is excluded because this MVP assumes bare-metal operator hosts already exist. The problem being solved is controlled runtime execution from the Control Plane to Ansible to existing CDVN scripts, not provider provisioning or server rental.

Adding Terraform would expand the blast radius into credentials, provider state, networking, and machine lifecycle. That is intentionally outside this MVP.

## Added Layers

- `infra/ansible`: minimal Ansible playbooks and roles that invoke `infra/obol-cdvn/scripts`.
- `apps/api/src/modules/automation`: API module that validates RBAC, approval, operation allowlists, extra vars, and spawns `ansible-playbook`.
- `packages/db/prisma/schema.prisma`: `AutomationRun` and `AutomationRunEvent` persistence plus approval metadata needed for safe execute validation.
- `apps/web/src/app/automation/page.tsx`: Control Plane page to start runs and inspect redacted logs.

## MVP Operation List

- `BOOTSTRAP_HOST`
- `RENDER_RUNTIME`
- `VERIFY_RUNTIME`
- `ROLLOUT_DRY_RUN`
- `ROLLOUT_EXECUTE`
- `PREFLIGHT_HOST`
- `STAGE_ARTIFACTS_DRY_RUN`
- `STAGE_ARTIFACTS_EXECUTE`
- `DEPLOYED_VERIFY`
- `COMPOSE_DRY_RUN`
- `COMPOSE_EXECUTE`
- `FULL_OPERATOR_MVP`
- `HEALTH_SYNC_DRY_RUN`

Each operation maps to an allowlisted playbook path. The client cannot choose arbitrary playbooks or command arguments.

## Backend Execution Contract

The backend uses `child_process.spawn` with:

- fixed binary: `ansible-playbook`
- args array only
- `shell: false`
- allowlisted playbook mapping
- configured inventory path selected by backend configuration
- JSON `--extra-vars`
- restricted extra var keys

Unknown extra vars are rejected. The backend does not accept arbitrary commands, script paths, shell args, environment variables, SSH private keys, or secret values.

## RBAC Expectations

- `ADMIN`: can start all operations.
- `INFRA_OPERATOR`: can start dry-run, render, verify, preflight, and approval-gated execute operations.
- `APPROVER`: can review approvals but does not automatically gain execute authority.
- `TREASURY_OPERATOR`, `FINANCE_REVIEWER`, `AUDITOR`: read-only or no automation execute access.

The API still uses the repository's auth stub and RBAC guard, but execute safety is enforced in the automation service itself.

## Approval Requirements

Execute operations are:

- `ROLLOUT_EXECUTE`
- `STAGE_ARTIFACTS_EXECUTE`
- `COMPOSE_EXECUTE`
- `FULL_OPERATOR_MVP`

They require an `approvalId` whose record is:

- `finalStatus = APPROVED`
- policy matches the operation
- cluster id matches the requested cluster
- host id matches the requested host
- `automationOperation` matches the requested operation

The schema adds optional approval metadata fields so this can be represented explicitly. Legacy approvals without this metadata do not satisfy execute validation.

## Secure Path Policy

Production inventory, secure config, and approval env files stay outside the public repo.

Expected host-local paths:

- `/secure/config/cluster.yml`
- `/secure/config/host.yml`
- `/secure/approvals/active/rollout-approval.env`
- `/secure/approvals/active/charon-artifact-approval.env`
- `/var/lib/eth-treasury-operator-artifacts/<cluster>`
- `/opt/obol/<cluster>`

The Control Plane may store approval id, cluster id, host id, operation type, status, timestamps, redacted logs, and audit metadata. It must not store raw artifact or secret file contents.

## Public Repo Forbidden Files

Do not commit:

- mnemonic or seed material
- validator signing keys
- validator keystores
- key share material
- keystore passwords
- Web3Signer private keys
- `jwt.hex`
- real `cluster.yml`, `host.yml`, or `hosts.yml`
- approval env files
- raw `.charon` operator artifacts
- DKG raw output
- deposit data exports containing sensitive material

## Artifact Stage Boundary

Artifact staging happens only on the operator host from the secure host-local source path.

Allowed stage targets:

- `.charon/cluster-lock.json`
- `.charon/charon-enr-private-key`
- optional `validator-pubkeys.txt`

Forbidden stage targets:

- `.charon/validator_keys/`
- `keystore-*.json`
- keystore password files
- mnemonic or seed material
- raw key material
- deposit data exports

## Stop Rules

The full MVP playbook runs one host at a time and stops immediately on failure:

1. render
2. base verify
3. rollout dry-run
4. rollout execute
5. preflight
6. artifact stage dry-run
7. artifact stage execute
8. deployed verify
9. compose dry-run
10. compose execute
11. health-sync dry-run

It does not proceed from render to rollout if verification fails, from stage to compose if deployed verification fails, or into execute steps without backend approval and host-local approval files.

## Smoke Test

Install dependencies and generate the Prisma client:

```bash
pnpm install
pnpm db:generate
```

Run TypeScript checks:

```bash
pnpm typecheck
```

Build:

```bash
pnpm build
```

Run Ansible syntax check if Ansible is installed:

```bash
ansible-playbook --syntax-check infra/ansible/playbooks/full-operator-mvp.yml -i infra/ansible/inventories/example/hosts.yml
```

Start local dev services:

```bash
pnpm dev
```

Open:

- Web: `http://localhost:3000/automation`
- API: `http://localhost:4000/v1/automation/runs`
- OpenAPI: `http://localhost:4000/docs`

## Known Limitations

- Cancellation only marks `CANCEL_REQUESTED`; the MVP does not kill the child process.
- Production inventory selection is backend-configured. The UI does not upload or edit inventory.
- The backend targets a host by an inventory alias derived from `OperatorHost.name` by replacing `-` with `_`.
- `FULL_OPERATOR_MVP` uses one backend approval record plus the host-local approval files expected by the underlying scripts.
- There is no queue system, Terraform, secret manager, DKG automation, deposit submission, rollback automation, or failover automation.

## Future Work

- Add a first-class approval creation flow for automation operations.
- Add explicit inventory alias metadata to `OperatorHost`.
- Add process-kill support for cancellation if operationally required.
- Add focused unit tests for command builder, redactor, DTO validation, and approval validation.
- Add production inventory deployment documentation outside the public repo.
