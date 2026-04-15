import type { ReactNode } from "react";

import type { MetricCard, StatusTone } from "@eth-staking/domain";

const toneClassMap: Record<StatusTone, string> = {
  healthy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  degraded: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  critical: "border-rose-500/50 bg-rose-500/10 text-rose-100",
  warning: "border-orange-500/40 bg-orange-500/10 text-orange-100",
  neutral: "border-slate-700 bg-slate-900 text-slate-200"
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
      className={`inline-flex items-center rounded-full border px-4 py-4 text-xs font-semibold uppercase tracking-[0.18em] ${toneClassMap[props.tone]}`}
    >
      {props.children}
    </span>
  );
}

export function Panel(props: PanelProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.35)]">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-50">{props.title}</h2>
        {props.description ? <p className="text-sm text-slate-400">{props.description}</p> : null}
      </div>
      {props.children}
    </section>
  );
}

export function MetricStrip(props: { items: MetricCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item) => (
        <article
          key={item.label}
          className="rounded-3xl border border-slate-800 bg-slate-950/85 p-5 shadow-[0_16px_45px_rgba(2,6,23,0.28)]"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <StatusBadge tone={item.tone}>{item.tone}</StatusBadge>
          </div>
          <p className="text-3xl font-semibold text-slate-50">{item.value}</p>
          <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
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
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
        <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.18em] text-slate-500">
          <tr>
            {props.columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/70">
          {props.rows.map((row, index) => (
            <tr key={index} className="align-top">
              {props.columns.map((column) => (
                <td key={String(column.key)} className="px-4 py-3 text-slate-200">
                  {column.render ? column.render(row) : row[column.key as keyof Row]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
