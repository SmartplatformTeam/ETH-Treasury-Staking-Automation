import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";

import { AutomationOperation } from "@eth-staking/db";

import type { AutomationExtraVars } from "./dto/create-automation-run.dto";

type OperationConfig = {
  playbook: string;
  defaultExtraVars?: Record<string, string | boolean | number>;
};

export type AutomationCommand = {
  binary: "ansible-playbook";
  args: string[];
  cwd: string;
  playbook: string;
  inventoryRef: string;
  extraVars: Record<string, string | boolean | number>;
};

const operationConfig: Record<AutomationOperation, OperationConfig> = {
  [AutomationOperation.BOOTSTRAP_HOST]: {
    playbook: "infra/ansible/playbooks/bootstrap-host.yml",
  },
  [AutomationOperation.VERIFY_BASELINE]: {
    playbook: "infra/ansible/playbooks/verify-baseline.yml",
  },
  [AutomationOperation.RENDER_RUNTIME]: {
    playbook: "infra/ansible/playbooks/render-runtime.yml",
  },
  [AutomationOperation.VERIFY_RUNTIME]: {
    playbook: "infra/ansible/playbooks/verify-runtime.yml",
    defaultExtraVars: { verify_deployed: false },
  },
  [AutomationOperation.ROLLOUT_DRY_RUN]: {
    playbook: "infra/ansible/playbooks/rollout-runtime.yml",
    defaultExtraVars: { execute: false, dry_run: true },
  },
  [AutomationOperation.ROLLOUT_EXECUTE]: {
    playbook: "infra/ansible/playbooks/rollout-runtime.yml",
    defaultExtraVars: { execute: true, dry_run: false },
  },
  [AutomationOperation.PREFLIGHT_HOST]: {
    playbook: "infra/ansible/playbooks/preflight-host.yml",
  },
  [AutomationOperation.STAGE_ARTIFACTS_DRY_RUN]: {
    playbook: "infra/ansible/playbooks/stage-charon-artifacts.yml",
    defaultExtraVars: { execute: false, dry_run: true },
  },
  [AutomationOperation.STAGE_ARTIFACTS_EXECUTE]: {
    playbook: "infra/ansible/playbooks/stage-charon-artifacts.yml",
    defaultExtraVars: { execute: true, dry_run: false },
  },
  [AutomationOperation.DEPLOYED_VERIFY]: {
    playbook: "infra/ansible/playbooks/verify-runtime.yml",
    defaultExtraVars: { verify_deployed: true },
  },
  [AutomationOperation.COMPOSE_DRY_RUN]: {
    playbook: "infra/ansible/playbooks/execute-compose.yml",
    defaultExtraVars: { execute: false, dry_run: true },
  },
  [AutomationOperation.COMPOSE_EXECUTE]: {
    playbook: "infra/ansible/playbooks/execute-compose.yml",
    defaultExtraVars: { execute: true, dry_run: false },
  },
  [AutomationOperation.FULL_OPERATOR_MVP]: {
    playbook: "infra/ansible/playbooks/full-operator-mvp.yml",
    defaultExtraVars: { execute: true, dry_run: false },
  },
  [AutomationOperation.HEALTH_SYNC_DRY_RUN]: {
    playbook: "infra/ansible/playbooks/health-sync.yml",
    defaultExtraVars: { execute: false, dry_run: true },
  },
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function resolveRepoRoot() {
  const candidates = [
    process.env.AUTOMATION_REPO_ROOT,
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
    path.resolve(moduleDir, "../../../../../"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const repoRoot = candidates.find((candidate) =>
    existsSync(path.join(candidate, "infra/ansible/playbooks/full-operator-mvp.yml")),
  );

  if (!repoRoot) {
    throw new InternalServerErrorException("Unable to resolve repository root for automation.");
  }

  return repoRoot;
}

function resolveInventoryPath(repoRoot: string) {
  const exampleInventory = path.join(repoRoot, "infra/ansible/inventories/example/hosts.yml");
  const configuredInventory = process.env.AUTOMATION_ANSIBLE_INVENTORY
    ? path.resolve(process.env.AUTOMATION_ANSIBLE_INVENTORY)
    : undefined;
  const allowedInventories = new Set([
    exampleInventory,
    ...(configuredInventory ? [configuredInventory] : []),
  ]);
  const selectedInventory = configuredInventory ?? exampleInventory;

  if (!allowedInventories.has(selectedInventory) || !existsSync(selectedInventory)) {
    throw new InternalServerErrorException(
      "Configured Ansible inventory is not allowlisted or does not exist.",
    );
  }

  return selectedInventory;
}

function buildMappedExtraVars(operation: AutomationOperation, extraVars: AutomationExtraVars) {
  const mappedExtraVars: Record<string, string | boolean | number> = {};

  if (extraVars.cluster_name !== undefined) {
    mappedExtraVars.cluster_name = extraVars.cluster_name;
  }

  if (extraVars.host_name !== undefined) {
    mappedExtraVars.host_name = extraVars.host_name;
  }

  if (extraVars.deployment_path !== undefined) {
    mappedExtraVars.deployment_path = extraVars.deployment_path;
  }

  if (extraVars.secure_config_dir !== undefined) {
    mappedExtraVars.secure_config_dir = extraVars.secure_config_dir;
  }

  if (extraVars.artifact_source_dir !== undefined) {
    mappedExtraVars.artifact_source_dir = extraVars.artifact_source_dir;
  }

  if (extraVars.runtime_dir !== undefined) {
    mappedExtraVars.deployment_path = extraVars.runtime_dir;
  }

  if (extraVars.execute !== undefined) {
    mappedExtraVars.execute = extraVars.execute;
  }

  if (extraVars.dry_run !== undefined) {
    mappedExtraVars.dry_run = extraVars.dry_run;
  }

  if (extraVars.approval_file !== undefined) {
    if (
      operation === AutomationOperation.STAGE_ARTIFACTS_DRY_RUN ||
      operation === AutomationOperation.STAGE_ARTIFACTS_EXECUTE
    ) {
      mappedExtraVars.artifact_approval_file = extraVars.approval_file;
    } else {
      mappedExtraVars.rollout_approval_file = extraVars.approval_file;
    }
  }

  return mappedExtraVars;
}

@Injectable()
export class AutomationCommandBuilder {
  build(
    operation: AutomationOperation,
    extraVars: AutomationExtraVars,
    inventoryLimit: string,
  ): AutomationCommand {
    const config = operationConfig[operation];

    if (!config) {
      throw new BadRequestException(`Unsupported automation operation: ${operation}`);
    }

    const repoRoot = resolveRepoRoot();
    const playbookPath = path.join(repoRoot, config.playbook);

    if (!existsSync(playbookPath)) {
      throw new InternalServerErrorException(
        `Allowlisted playbook does not exist: ${config.playbook}`,
      );
    }

    if (operation === AutomationOperation.VERIFY_BASELINE) {
      return {
        binary: "ansible-playbook",
        args: ["-i", "localhost,", "--connection=local", playbookPath],
        cwd: repoRoot,
        playbook: config.playbook,
        inventoryRef: "inline:localhost",
        extraVars: {},
      };
    }

    const inventoryPath = resolveInventoryPath(repoRoot);

    if (!/^[A-Za-z0-9_.:-]+$/.test(inventoryLimit)) {
      throw new BadRequestException("Inventory limit contains unsupported characters.");
    }

    const mergedExtraVars = {
      ...(config.defaultExtraVars ?? {}),
      ...buildMappedExtraVars(operation, extraVars),
    };

    return {
      binary: "ansible-playbook",
      args: [
        "-i",
        inventoryPath,
        "--limit",
        inventoryLimit,
        playbookPath,
        "--extra-vars",
        JSON.stringify(mergedExtraVars),
      ],
      cwd: repoRoot,
      playbook: config.playbook,
      inventoryRef: path.relative(repoRoot, inventoryPath),
      extraVars: mergedExtraVars,
    };
  }
}
