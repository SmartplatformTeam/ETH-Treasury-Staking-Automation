너는 Senior Full-stack Engineer + DevOps Engineer + Ansible Automation Engineer다.

작업 대상 저장소:
https://github.com/SmartplatformTeam/ETH-Treasury-Staking-Automation

이번 작업의 최종 판단:
새 프로젝트를 만들지 않는다.
기존 저장소에 feature branch를 만들고, Ansible + Backend automation module + Control Plane automation UI를 추가한다.

권장 branch:
feat/ansible-control-plane-mvp

============================================================
0. 작업 전 행동 원칙
============================================================

아래 원칙은 이번 작업 전체에 적용된다.

1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly.
- If multiple interpretations exist, present them. Do not pick silently.
- If a simpler approach exists, say so.
- Push back when the requested design would create unnecessary complexity or security risk.
- If something is genuinely blocking, stop, name what is confusing, and ask.
- If uncertainty is non-blocking, proceed with the safest minimal assumption and document it.

Before coding, write:
- assumptions
- interpretation of the goal
- non-goals
- brief implementation plan
- verification plan

2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

Rules:
- No features beyond what was asked.
- No abstractions for single-use code.
- No "future-proof" flexibility unless explicitly required.
- No generic workflow engine.
- No Terraform.
- No queue system unless the repo already has a simple pattern that can be reused with minimal changes.
- No Kubernetes.
- No cloud or bare-metal provider integration.
- No secret manager integration unless already present.
- No complex plugin system.
- If an implementation grows too large, simplify it.
- Prefer readable, explicit code over clever abstractions.

Ask yourself before each file:
"Would a senior engineer say this is overcomplicated?"
If yes, rewrite it simpler.

3. Surgical Changes

Touch only what is necessary.

When editing existing code:
- Do not improve adjacent code.
- Do not refactor unrelated modules.
- Do not reformat files unnecessarily.
- Match the existing repo style.
- Do not rename existing APIs, models, routes, folders, or package boundaries unless required.
- If you find unrelated dead code, mention it in final notes. Do not delete it.
- Remove only imports, variables, functions, or files made unused by your own changes.
- Every changed line should trace directly to the requested MVP.

4. Goal-Driven Execution

Define success criteria and verify them.

For each major step, use this structure:
1. Add/modify X → verify: Y
2. Add/modify X → verify: Y
3. Add/modify X → verify: Y

Examples:
- Add API DTO validation → verify with invalid payload tests or typecheck.
- Add command builder → verify it never returns shell-interpolated strings.
- Add Ansible playbooks → verify syntax check command is documented and, if possible, executed.
- Add UI page → verify it builds and follows existing API usage style.

Do not claim "done" unless verification has been attempted.
If a verification command cannot run, explain exactly why.

============================================================
1. Repository Context
============================================================

This repository is an ETH Treasury Staking Automation monorepo.

Existing expected structure:
- apps/web
  - Next.js operator backoffice
  - Dashboard / Validators / Nodes / Clusters / Alerts / Deposits / Approvals / Rewards / Audit screens
- apps/api
  - NestJS API
  - auth stub
  - RBAC guard
  - OpenAPI entrypoint
- apps/worker
  - health evaluation job skeleton
- packages/db
  - Prisma schema and seed data
- packages/domain
  - domain types, RBAC, fixtures
- packages/ui
  - shared UI shell components
- packages/config
  - runtime env loader
- packages/observability
  - structured logger
- infra/obol-cdvn
  - Obol CDVN runtime baseline
  - overlays
  - inventory examples
  - runtime scripts

Existing runtime scripts to reuse:
- infra/obol-cdvn/scripts/render.sh
- infra/obol-cdvn/scripts/stage-charon-artifacts.sh
- infra/obol-cdvn/scripts/verify-baseline.sh
- infra/obol-cdvn/scripts/verify.sh
- infra/obol-cdvn/scripts/rollout.sh
- infra/obol-cdvn/scripts/host-preflight.sh
- infra/obol-cdvn/scripts/rollout-exec.sh
- infra/obol-cdvn/scripts/drift-check.sh
- infra/obol-cdvn/scripts/health-sync.sh

Important:
Do not replace these scripts.
Do not rewrite CDVN deployment logic from scratch.
Ansible should orchestrate these scripts safely.

============================================================
2. MVP Goal
============================================================

Implement an MVP where:

Control Plane button
→ Backend API creates AutomationRun
→ Backend validates RBAC and approval
→ Backend safely calls ansible-playbook
→ Ansible connects to an already-prepared bare-metal operator host
→ Ansible runs existing CDVN runtime scripts on that host
→ Backend collects sanitized stdout/stderr
→ Backend stores run status and log events
→ Control Plane displays run status and logs

This MVP assumes bare-metal hosts already exist.
Terraform is intentionally excluded.

============================================================
3. Non-Goals
============================================================

Do not implement:
- Terraform
- cloud provider integration
- bare-metal provider integration
- automatic server rental/provisioning
- Kubernetes
- Helm
- mnemonic generation
- seed phrase storage
- raw validator signing key storage
- validator keystore storage
- Web3Signer client private key storage
- jwt.hex storage in DB or public repo
- DKG ceremony automation
- deposit transaction submission
- Safe direct execution
- slash recovery automation
- automatic emergency failover
- rollback automation
- generic workflow engine
- complex queue infrastructure unless already trivial in repo

The MVP is not "fully automated Ethereum staking."
The MVP is "safe Control Plane → Backend → Ansible → existing CDVN scripts integration."

============================================================
4. Security Contract
============================================================

Never store the following in the public repo, control plane DB, or backend logs:
- mnemonic
- seed phrase
- raw validator signing key
- validator keystore
- validator key share
- keystore password file
- Web3Signer client private key
- jwt.hex
- actual cluster.yml
- actual host.yml
- actual hosts.yml
- actual approval env files
- actual .charon operator-specific artifact source
- DKG raw output
- deposit data export containing sensitive material

Operator-specific DKG artifacts must remain on each operator host.

Allowed stage targets only:
- .charon/cluster-lock.json
- .charon/charon-enr-private-key
- optional validator-pubkeys.txt

Forbidden stage targets:
- .charon/validator_keys/
- keystore-*.json
- keystore password files
- mnemonic
- seed
- raw secret
- raw key material
- deposit data export files

Control Plane must not upload or collect original artifacts.
Control Plane may store only metadata such as:
- approval id
- cluster id
- host id
- operation type
- hash/reference
- status
- timestamps
- redacted logs
- audit metadata

============================================================
5. Desired Architecture
============================================================

Add these layers to the existing repo.

A. Ansible Layer

Path:
infra/ansible/

Purpose:
Run existing infra/obol-cdvn scripts on target operator hosts.

B. Backend Automation Layer

Path:
apps/api/src/modules/automation/

Purpose:
Validate operation request, check RBAC/approval, spawn ansible-playbook safely, store run status and logs.

C. Database Persistence

Path:
packages/db/prisma/schema.prisma

Purpose:
Store AutomationRun and AutomationRunEvent.

D. Control Plane UI

Path:
apps/web/src/app/automation/page.tsx

Purpose:
Allow operator to start dry-run/execute operations and inspect logs.

E. Docs

Paths:
docs/ansible-control-plane-mvp.md
infra/ansible/README.md
Update root README.md if appropriate.
Update docs/README.md if appropriate.

============================================================
6. Ansible Implementation
============================================================

Create:

infra/ansible/ansible.cfg
infra/ansible/inventories/example/hosts.yml
infra/ansible/group_vars/all.example.yml

infra/ansible/roles/common/tasks/main.yml
infra/ansible/roles/cdvn_runtime/tasks/main.yml
infra/ansible/roles/cdvn_artifacts/tasks/main.yml
infra/ansible/roles/cdvn_compose/tasks/main.yml
infra/ansible/roles/cdvn_health/tasks/main.yml

infra/ansible/playbooks/bootstrap-host.yml
infra/ansible/playbooks/render-runtime.yml
infra/ansible/playbooks/verify-runtime.yml
infra/ansible/playbooks/rollout-runtime.yml
infra/ansible/playbooks/preflight-host.yml
infra/ansible/playbooks/stage-charon-artifacts.yml
infra/ansible/playbooks/execute-compose.yml
infra/ansible/playbooks/full-operator-mvp.yml

infra/ansible/README.md

Ansible rules:
- Keep playbooks minimal.
- Use ansible.builtin modules where appropriate.
- Use ansible.builtin.command for existing script execution.
- Avoid shell unless absolutely necessary.
- Avoid shell interpolation.
- Use variables with safe defaults only for examples.
- Do not put real IPs, real hostnames, real secrets, or real approvals in repo.
- Make example inventory public-safe.
- Add changed_when and failed_when where useful.
- Do not log secrets.
- Do not create secret values.
- Do not copy secret values from the backend.
- Do not upload artifacts from Control Plane to hosts.

Expected example inventory:

infra/ansible/inventories/example/hosts.yml

It should contain placeholder hosts only, for example:
- operator_1
- operator_2
- operator_3
- operator_4

Use safe placeholder values:
- REPLACE_WITH_OPERATOR_1_HOST
- REPLACE_WITH_OPERATOR_2_HOST
- ansible_user: ubuntu
- cluster_name: treasury-mainnet-obol-a
- deployment_path: /opt/obol/treasury-mainnet-obol-a
- secure_config_dir: /secure/config
- artifact_source_dir: /var/lib/eth-treasury-operator-artifacts/treasury-mainnet-obol-a
- approval_dir: /secure/approvals/active

Do not include actual addresses.

Playbook behavior:

1. bootstrap-host.yml

Purpose:
Prepare already-rented bare-metal host.

Tasks:
- install/check Docker
- install/check Docker Compose plugin
- install/check rsync
- install/check curl
- install/check jq
- install/check ca-certificates
- install/check chrony or systemd-timesyncd
- create deployment path
- create expected parent directories only

Do not:
- create jwt.hex
- create Web3Signer certs
- create signing keys
- create DKG artifacts
- copy secrets

2. render-runtime.yml

Purpose:
Run existing render script on target host.

Expected command:
infra/obol-cdvn/scripts/render.sh
  --cluster-file /secure/config/cluster.yml
  --host-file /secure/config/host.yml
  --output-dir /tmp/cdvn-operator-runtime
  --force

Notes:
- This should run on the operator host.
- Repo/scripts must be available on the host via a safe mechanism.
- For MVP, choose the simplest repo-consistent mechanism:
  either copy/sync the relevant infra/obol-cdvn directory to a temporary working path,
  or document that the operator host must have the repo checkout.
- Prefer minimal copy over complex Git logic.

3. verify-runtime.yml

Purpose:
Run:
infra/obol-cdvn/scripts/verify.sh
  --render-dir /tmp/cdvn-operator-runtime

Stop if verification fails.

4. rollout-runtime.yml

Purpose:
Run existing rollout script.

Dry-run mode:
- allowed without approval if RBAC permits.

Execute mode:
- requires approval.
- use approval file path from approved secure path.
- must not continue on failure.

Expected behavior:
- render output gets rsynced to deployment path.
- default rollout excludes sensitive paths as defined by existing script.

5. preflight-host.yml

Purpose:
Run existing host-preflight script.

Check:
- Docker
- compose
- rsync
- curl
- deployment path
- disk
- required secret files if configured

6. stage-charon-artifacts.yml

Purpose:
Run existing stage-charon-artifacts script.

Dry-run:
- allowed for permitted infra role.

Execute:
- requires charon artifact stage approval.

Rules:
- stage only from operator host-local source path.
- source dir:
  /var/lib/eth-treasury-operator-artifacts/{{ cluster_name }}
- runtime dir:
  /opt/obol/{{ cluster_name }} or configured deployment_path
- use --runtime-dir for production-like stage.
- never collect artifact into backend/control plane.
- never use central staging host.
- never stage validator_keys.

7. execute-compose.yml

Purpose:
Run existing rollout-exec script.

Dry-run:
- docker compose commands are previewed or validated according to existing script behavior.

Execute:
- requires rollout/compose approval.

Expected sequence:
- docker compose config
- docker compose pull
- docker compose up -d
- docker compose ps

8. full-operator-mvp.yml

Purpose:
Run the full MVP flow for one operator host.

Order:
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
11. health-sync dry-run or status collection

Stop rule:
If any step fails, stop immediately.
Do not proceed to execute-related steps without approval.
Do not proceed from render to rollout if verify fails.
Do not proceed from stage to compose if deployed verify fails.

============================================================
7. Backend API Implementation
============================================================

Add module:

apps/api/src/modules/automation/automation.module.ts
apps/api/src/modules/automation/automation.controller.ts
apps/api/src/modules/automation/automation.service.ts
apps/api/src/modules/automation/automation-runner.service.ts
apps/api/src/modules/automation/automation-command-builder.ts
apps/api/src/modules/automation/log-redactor.ts
apps/api/src/modules/automation/dto/create-automation-run.dto.ts
apps/api/src/modules/automation/dto/automation-run-response.dto.ts

Keep the module small and explicit.

API endpoints:

POST /v1/automation/runs

Creates an automation run.

Body:
- operation
- clusterId
- hostId
- dryRun
- approvalId?
- extraVars?

Response:
- runId
- status
- operation
- createdAt

GET /v1/automation/runs

Returns recent automation runs.

GET /v1/automation/runs/:id

Returns one automation run with redacted log events.

POST /v1/automation/runs/:id/cancel

MVP behavior:
- mark cancellation requested.
- actual process kill is optional.
- if implementing process kill adds complexity, do not implement it.
- document the limitation.

Supported operation enum:
- BOOTSTRAP_HOST
- RENDER_RUNTIME
- VERIFY_RUNTIME
- ROLLOUT_DRY_RUN
- ROLLOUT_EXECUTE
- PREFLIGHT_HOST
- STAGE_ARTIFACTS_DRY_RUN
- STAGE_ARTIFACTS_EXECUTE
- DEPLOYED_VERIFY
- COMPOSE_DRY_RUN
- COMPOSE_EXECUTE
- FULL_OPERATOR_MVP
- HEALTH_SYNC_DRY_RUN

Backend execution rules:
- Use child_process.spawn.
- Do not use exec.
- Do not use shell: true.
- Do not use sh -c.
- Do not interpolate user input into command strings.
- Build command as binary + args array.
- ansible-playbook path must be fixed.
- playbook path must come from an allowlist.
- inventory path must come from an allowlist or generated ephemeral safe file.
- extraVars must be allowlist-validated.
- Pass extraVars as JSON string via --extra-vars.
- Capture stdout and stderr.
- Redact logs before saving.
- Store system events.
- Store startedAt/completedAt/exitCode/failureReason.
- Write audit log if existing AuditLog model/service pattern is available.
- If audit integration requires broad refactor, add a narrow TODO and store AutomationRunEvent instead.

Command builder example:

command:
ansible-playbook

args:
-i
<inventoryPath>
<playbookPath>
--extra-vars
<JSON.stringify(extraVars)>

Never produce:
ansible-playbook ${userInput}
sh -c "..."
exec(commandString)

============================================================
8. RBAC and Approval Rules
============================================================

Use existing auth/RBAC patterns.

Role policy:

ADMIN:
- can run all operations.

INFRA_OPERATOR:
- can run dry-run operations.
- can run render, verify, preflight.
- execute operations require approval.

APPROVER:
- can approve if existing approval flow supports it.
- should not automatically execute dangerous operations merely because they are an approver.

TREASURY_OPERATOR:
- read-only or limited view for automation.

FINANCE_REVIEWER:
- read-only or no automation execute.

AUDITOR:
- read-only.

Execute operations:
- ROLLOUT_EXECUTE
- STAGE_ARTIFACTS_EXECUTE
- COMPOSE_EXECUTE
- FULL_OPERATOR_MVP

These require:
- approvalId exists
- approval status is APPROVED
- approval policy matches the operation
- approval cluster matches target cluster
- approval host matches target host
- requested operation matches approved operation or approved policy
- mismatch means stop immediately

Do not fake approval success.
If existing approval model is read-only or incomplete:
- implement the minimal safe validation possible.
- if the data model cannot represent the required approval contract, create a minimal extension or document the limitation.
- never allow execute operations to proceed without an explicit approved approval record or configured safe mock approval in development only.

Development mode exception:
- A local-only mock approval may be allowed only if the repo already uses dev auth stubs.
- It must be clearly marked as development-only.
- It must not be enabled by default for production.
- It must not weaken the safety contract.

============================================================
9. Prisma Schema
============================================================

Update:

packages/db/prisma/schema.prisma

Add minimal models:

AutomationRun:
- id
- operation
- status
- clusterId?
- hostId?
- approvalId?
- requestedById?
- playbook
- inventoryRef
- dryRun
- startedAt?
- completedAt?
- exitCode?
- failureReason?
- createdAt
- updatedAt

AutomationRunEvent:
- id
- runId
- sequence
- stream
- message
- redacted
- createdAt

Add enums if consistent with repo style:
AutomationOperation
AutomationRunStatus
AutomationRunStream

AutomationRunStatus:
- QUEUED
- RUNNING
- SUCCEEDED
- FAILED
- CANCEL_REQUESTED
- CANCELLED

AutomationRunStream:
- STDOUT
- STDERR
- SYSTEM

Use existing Prisma naming/style conventions.
Do not redesign existing schema.
Do not migrate unrelated models.

After schema change:
- ensure pnpm db:generate works.
- if migration files are not used in this repo, do not introduce migration complexity unnecessarily.

============================================================
10. Control Plane UI
============================================================

Add a minimal UI page:

apps/web/src/app/automation/page.tsx

Or, if the existing route pattern suggests another location, follow the existing app style.

UI features:
- Cluster selector
- Operator host selector
- Operation selector
- Dry-run / execute indicator
- Approval ID input for execute operations
- Run button
- Recent automation runs list
- Run detail view
- Redacted stdout/stderr log display
- Status badge
- Failure reason
- Dangerous action confirmation for execute operations

Keep UI simple.
Use existing shared UI components if available.
Do not add a new design system.
Do not add complex state management.
Polling is acceptable for MVP.

UI copy must clearly say:
- Terraform is not used in this MVP.
- Existing bare-metal hosts are required.
- Backend invokes Ansible.
- Execute operations require approval.
- Operator-specific artifacts are not uploaded to Control Plane.
- Artifact stage happens only from secure host-local path.

UI must never include:
- SSH private key input
- jwt.hex input
- Web3Signer private key input
- mnemonic input
- seed input
- validator keystore upload
- DKG artifact upload
- raw .charon artifact upload

============================================================
11. Inventory and Config Handling
============================================================

For MVP, keep actual production inventory out of repo.

Allowed:
- public-safe example inventory
- placeholder hostnames
- placeholder cluster names
- placeholder paths
- documentation

Forbidden:
- real host IPs
- real SSH users if sensitive
- real internal DNS
- real approval paths
- real secret paths if sensitive
- actual host.yml
- actual cluster.yml
- actual hosts.yml
- actual approval env files

Backend inventory strategy:
Choose the simplest safe approach.

Acceptable MVP options:
1. Use a configured secure inventory path allowlist.
2. Generate a temporary inventory file from known DB host metadata and delete it after execution.
3. Use an example inventory only for local smoke test.

Do not implement dynamic inventory plugins unless needed.

============================================================
12. Docs
============================================================

Add:

docs/ansible-control-plane-mvp.md

Must include:
- Why Terraform is excluded
- Why existing repo is extended instead of creating a new project
- Control Plane → Backend → Ansible → CDVN scripts flow
- Ansible role
- Backend role
- UI role
- DB persistence role
- Approval requirements
- RBAC expectations
- Secure path policy
- Public repo forbidden files
- MVP operation list
- Stop rules
- Smoke test instructions
- Known limitations
- Future work

Add:

infra/ansible/README.md

Must include:
- directory structure
- example inventory
- required host preparation
- secure config assumptions
- command examples
- syntax check
- dry-run vs execute explanation
- artifact stage rules
- secret handling rules

Update root README.md only if it can be done surgically.
Update docs/README.md only if it can be done surgically.

Do not rewrite the entire docs.

============================================================
13. Validation and Tests
============================================================

Try to add tests where repo style supports it.

Preferred tests:
- automation-command-builder unit test
- log-redactor unit test
- DTO validation test
- RBAC/approval validation test
- automation status transition test

Minimum verification commands:

pnpm install
pnpm db:generate
pnpm typecheck
pnpm build

Ansible syntax check:

ansible-playbook --syntax-check \
  infra/ansible/playbooks/full-operator-mvp.yml \
  -i infra/ansible/inventories/example/hosts.yml

If test infrastructure is incomplete:
- do not invent a large testing framework.
- add small focused tests only if consistent with existing setup.
- document manual verification steps.

============================================================
14. Implementation Plan
============================================================

Follow this order.

Step 1:
Analyze current repo structure.
State assumptions, uncertainties, and exact change plan.

Verify:
- identify existing NestJS module style
- identify existing RBAC style
- identify existing Prisma model style
- identify existing Next.js page/component style
- identify package scripts

Step 2:
Create infra/ansible skeleton.

Verify:
- files are present
- example inventory is public-safe
- no real secret/config included

Step 3:
Implement Ansible playbooks/roles that call existing CDVN scripts.

Verify:
- syntax check can be run or documented
- playbooks use command, not shell, where possible
- execute operations require approval variables

Step 4:
Update Prisma schema with AutomationRun and AutomationRunEvent.

Verify:
- pnpm db:generate

Step 5:
Add Backend automation module.

Verify:
- command builder uses spawn-compatible args
- no shell interpolation
- operation to playbook mapping is allowlisted
- extra vars validation exists
- logs are redacted
- run status transitions are explicit

Step 6:
Add RBAC and approval checks.

Verify:
- execute operations cannot run without approval
- dry-run operations work for permitted infra roles
- mismatch approval stops execution

Step 7:
Add Control Plane Automation UI.

Verify:
- page builds
- UI does not collect secrets or artifacts
- execute actions show confirmation and require approval id

Step 8:
Add docs.

Verify:
- docs explain exact MVP flow and limitations
- docs do not expose sensitive examples

Step 9:
Run verification commands.

Verify:
- pnpm db:generate
- pnpm typecheck
- pnpm build
- ansible syntax check if Ansible is available

Step 10:
Final response with precise summary.

============================================================
15. Expected File Additions
============================================================

Likely additions:

infra/ansible/ansible.cfg
infra/ansible/inventories/example/hosts.yml
infra/ansible/group_vars/all.example.yml
infra/ansible/roles/common/tasks/main.yml
infra/ansible/roles/cdvn_runtime/tasks/main.yml
infra/ansible/roles/cdvn_artifacts/tasks/main.yml
infra/ansible/roles/cdvn_compose/tasks/main.yml
infra/ansible/roles/cdvn_health/tasks/main.yml
infra/ansible/playbooks/bootstrap-host.yml
infra/ansible/playbooks/render-runtime.yml
infra/ansible/playbooks/verify-runtime.yml
infra/ansible/playbooks/rollout-runtime.yml
infra/ansible/playbooks/preflight-host.yml
infra/ansible/playbooks/stage-charon-artifacts.yml
infra/ansible/playbooks/execute-compose.yml
infra/ansible/playbooks/full-operator-mvp.yml
infra/ansible/README.md

apps/api/src/modules/automation/automation.module.ts
apps/api/src/modules/automation/automation.controller.ts
apps/api/src/modules/automation/automation.service.ts
apps/api/src/modules/automation/automation-runner.service.ts
apps/api/src/modules/automation/automation-command-builder.ts
apps/api/src/modules/automation/log-redactor.ts
apps/api/src/modules/automation/dto/create-automation-run.dto.ts
apps/api/src/modules/automation/dto/automation-run-response.dto.ts

apps/web/src/app/automation/page.tsx

docs/ansible-control-plane-mvp.md

Likely modifications:
packages/db/prisma/schema.prisma
apps/api/src/app.module.ts or equivalent module registry
apps/web navigation/sidebar if existing pattern requires it
README.md, only minimally
docs/README.md, only minimally

Do not treat this list as mandatory if the existing repo structure suggests a cleaner minimal equivalent.
Match existing style.

============================================================
16. Log Redaction
============================================================

Implement a small redactor.

Redact patterns such as:
- private key
- secret
- token
- password
- mnemonic
- seed
- jwt.hex contents
- bearer token
- authorization header
- Web3Signer client key
- keystore password
- API key

Keep it simple.
Do not build an overly complex DLP system.

Replacement format:
[REDACTED]

Store:
- original stream type
- redacted message
- redacted boolean

Never store unredacted logs.

============================================================
17. Operation to Playbook Mapping
============================================================

Use explicit allowlist mapping.

Example:

BOOTSTRAP_HOST:
infra/ansible/playbooks/bootstrap-host.yml

RENDER_RUNTIME:
infra/ansible/playbooks/render-runtime.yml

VERIFY_RUNTIME:
infra/ansible/playbooks/verify-runtime.yml

ROLLOUT_DRY_RUN:
infra/ansible/playbooks/rollout-runtime.yml
extra var: execute=false

ROLLOUT_EXECUTE:
infra/ansible/playbooks/rollout-runtime.yml
extra var: execute=true

PREFLIGHT_HOST:
infra/ansible/playbooks/preflight-host.yml

STAGE_ARTIFACTS_DRY_RUN:
infra/ansible/playbooks/stage-charon-artifacts.yml
extra var: execute=false

STAGE_ARTIFACTS_EXECUTE:
infra/ansible/playbooks/stage-charon-artifacts.yml
extra var: execute=true

DEPLOYED_VERIFY:
infra/ansible/playbooks/verify-runtime.yml
extra var: verify_deployed=true

COMPOSE_DRY_RUN:
infra/ansible/playbooks/execute-compose.yml
extra var: execute=false

COMPOSE_EXECUTE:
infra/ansible/playbooks/execute-compose.yml
extra var: execute=true

FULL_OPERATOR_MVP:
infra/ansible/playbooks/full-operator-mvp.yml

HEALTH_SYNC_DRY_RUN:
Use the smallest safe implementation.
Either add a dedicated playbook if needed, or include it in cdvn_health role.

Do not let client choose arbitrary playbook path.

============================================================
18. Backend DTO Validation
============================================================

Create DTO validation with:
- operation must be enum
- clusterId required
- hostId required
- dryRun boolean
- approvalId required for execute operations
- extraVars optional but restricted

Allowed extra vars only:
- cluster_name
- host_name
- deployment_path
- secure_config_dir
- approval_file
- artifact_source_dir
- runtime_dir
- execute
- dry_run

Reject or ignore unknown extra vars.
Prefer reject with clear error.

Do not allow:
- arbitrary command
- arbitrary script path
- arbitrary shell args
- arbitrary environment variables
- arbitrary SSH private key
- arbitrary secret values

============================================================
19. Final Response Format
============================================================

After implementation, respond with:

1. Assumptions made
2. Summary of changes
3. Files added
4. Files modified
5. API endpoints added
6. Ansible playbooks added
7. Security boundaries enforced
8. Verification commands run and results
9. What could not be verified
10. MVP limitations
11. Suggested next steps

Do not exaggerate.
Do not say something passed if it was not run.
Do not hide failures.
Do not claim production readiness.

============================================================
20. Final Reminder
============================================================

This task is about integrating Ansible into the existing staking automation control plane.

The correct shape is:

Existing repo
+ infra/ansible
+ apps/api automation module
+ packages/db AutomationRun persistence
+ apps/web automation page
+ docs

Not:

new project
not Terraform
not full staking automation
not custody automation
not key management automation
not artifact upload system
not generic workflow platform

Keep it safe, minimal, and verifiable.