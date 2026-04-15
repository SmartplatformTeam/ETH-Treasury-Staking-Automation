import { DataTable, Panel } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { loadRewards } from "../../lib/insights";

export default async function RewardsPage() {
  const rewards = await loadRewards();

  return (
    <OpsShell
      currentPath="/rewards"
      title="Rewards"
      description="Treasury-oriented reward views separate consensus, execution, MEV, and infra cost to estimate net yield."
    >
      <Panel
        title="Monthly Summary"
        description="Reward accounting is modeled as a ledger so batch recomputation and audit replay stay possible."
      >
        <DataTable
          columns={[
            { key: "period", header: "Period" },
            { key: "strategy", header: "Strategy" },
            { key: "consensusReward", header: "Consensus" },
            { key: "executionReward", header: "Execution" },
            { key: "netApr", header: "Net APR" }
          ]}
          rows={rewards.rows}
        />
      </Panel>
    </OpsShell>
  );
}
