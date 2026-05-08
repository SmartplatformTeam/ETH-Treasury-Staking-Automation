import type { ReactNode } from "react";

import type { MetricCard, StatusTone } from "@eth-staking/domain";

const toneClassMap: Record<StatusTone, string> = {
  healthy: "border-[#9be7d8] bg-[var(--miro-teal-soft)] text-[#07584f]",
  degraded: "border-[#f1c1d2] bg-[var(--miro-rose-soft)] text-[#7a1f45]",
  critical: "border-[#ffb294] bg-[var(--miro-coral-soft)] text-[#7c260c]",
  warning: "border-[#f4d84f] bg-[var(--miro-yellow-soft)] text-[#5b4b00]",
  neutral: "border-[var(--miro-hairline)] bg-[var(--miro-surface)] text-[var(--miro-charcoal)]",
};

type PanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

type TableColumn<Row> = {
  key: keyof Row | string;
  header: string;
  render?: (row: Row) => ReactNode;
};

export function StatusBadge(props: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center rounded-md border px-2.5 py-1 text-xs font-semibold uppercase ${toneClassMap[props.tone]}`}
    >
      {props.children}
    </span>
  );
}

export function Panel(props: PanelProps) {
  return (
    <section className="rounded-xl border border-[var(--miro-hairline)] bg-white p-5 shadow-[0_4px_12px_rgba(5,0,56,0.04)]">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-medium text-[var(--miro-primary)]">{props.title}</h2>
        {props.description ? (
          <p className="text-sm leading-6 text-[var(--miro-slate)]">{props.description}</p>
        ) : null}
      </div>
      {props.children}
    </section>
  );
}

const metricSurfaceMap: Record<StatusTone, string> = {
  healthy: "bg-[var(--miro-teal-soft)]",
  degraded: "bg-[var(--miro-rose-soft)]",
  critical: "bg-[var(--miro-coral-soft)]",
  warning: "bg-[var(--miro-yellow-soft)]",
  neutral: "bg-white",
};

export function MetricStrip(props: { items: MetricCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item) => (
        <article
          key={item.label}
          className={`rounded-xl border border-[var(--miro-hairline)] p-5 ${metricSurfaceMap[item.tone]}`}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-xs uppercase text-[var(--miro-slate)]">{item.label}</p>
            <StatusBadge tone={item.tone}>{item.tone}</StatusBadge>
          </div>
          <p className="text-3xl font-medium text-[var(--miro-primary)]">{item.value}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--miro-charcoal)]">{item.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function DataTable<Row extends Record<string, string>>(props: {
  columns: TableColumn<Row>[];
  rows: Row[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--miro-hairline)] bg-white">
      <table className="min-w-[760px] table-fixed divide-y divide-[var(--miro-hairline)] text-left text-sm text-[var(--miro-charcoal)] lg:min-w-full">
        <thead className="bg-[var(--miro-surface)] text-xs uppercase text-[var(--miro-slate)]">
          <tr>
            {props.columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--miro-hairline)] bg-white">
          {props.rows.map((row) => (
            <tr key={JSON.stringify(row)} className="align-top">
              {props.columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="min-w-0 px-4 py-3 text-[var(--miro-primary)]"
                >
                  {column.render ? (
                    column.render(row)
                  ) : (
                    <span className="block truncate" title={row[column.key as keyof Row]}>
                      {row[column.key as keyof Row]}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
