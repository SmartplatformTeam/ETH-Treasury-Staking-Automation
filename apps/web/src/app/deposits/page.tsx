import Link from "next/link";

import { DataTable, Panel, StatusBadge } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { statusToneFromLabel } from "../../components/status-tone";
import { getWebAuthSession } from "../../lib/auth-session";
import { loadDepositClusterOptions, loadTreasuryOptions } from "../../lib/deposits";
import { loadDeposits } from "../../lib/workflows";

import { CreateDepositForm } from "./create-form";

type DepositDisplayRow = {
  id: string;
  request: string;
  approvalPolicy: string;
  status: string;
  requestedBy: string;
  exportTarget: string;
};

export default async function DepositsPage() {
  const [deposits, session, clusters, treasuries] = await Promise.all([
    loadDeposits(),
    getWebAuthSession(),
    loadDepositClusterOptions(),
    loadTreasuryOptions()
  ]);
  const canCreate = session.role === "ADMIN" || session.role === "TREASURY_OPERATOR";

  const rows: DepositDisplayRow[] = deposits.rows;

  return (
    <OpsShell
      currentPath="/deposits"
      title="Deposits"
      description="Deposit requests move through validation → approval → Safe payload export → Safe UI submission. Execution stays outside the app."
    >
      {canCreate ? (
        <CreateDepositForm clusters={clusters} treasuries={treasuries} />
      ) : null}

      <Panel
        title="Deposit Requests"
        description="Click a row to open detail, audit trail, and (for TREASURY/ADMIN) export controls."
      >
        <DataTable
          columns={[
            {
              key: "request",
              header: "Request",
              render: (row) =>
                row.id ? (
                  <Link
                    href={`/deposits/${row.id}`}
                    className="text-[var(--miro-ink)] underline-offset-2 hover:underline"
                  >
                    {row.request}
                  </Link>
                ) : (
                  <span>{row.request}</span>
                )
            },
            { key: "approvalPolicy", header: "Policy" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
              )
            },
            { key: "requestedBy", header: "Requested By" },
            { key: "exportTarget", header: "Export Target" }
          ]}
          rows={rows}
        />
      </Panel>
    </OpsShell>
  );
}
