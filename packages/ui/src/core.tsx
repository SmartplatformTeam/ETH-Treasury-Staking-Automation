import type { ReactNode } from "react";

import type { MetricCard, StatusTone } from "@eth-staking/domain";

const toneClassMap: Record<StatusTone, string> = {
  healthy: "border-[var(--miro-success)] bg-[var(--miro-teal-soft)] text-[#5ee07b]",
  degraded: "border-[var(--miro-yellow)] bg-[var(--miro-yellow-soft)] text-[var(--miro-yellow)]",
  critical: "border-[var(--miro-m-red)] bg-[var(--miro-coral-soft)] text-[#ff6a52]",
  warning: "border-[var(--miro-yellow)] bg-[var(--miro-yellow-soft)] text-[var(--miro-yellow)]",
  neutral: "border-[var(--miro-hairline)] bg-[var(--miro-surface)] text-[var(--miro-slate)]",
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
  /** CSS width passed to the matching <col> element (e.g. "120px", "20%", "1fr"). */
  width?: string;
};

export function StatusBadge(props: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      style={{ wordBreak: "keep-all", overflowWrap: "normal" }}
      className={`inline-flex min-h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-none border px-3 py-1.5 text-[11px] font-bold uppercase leading-none tracking-[0.12em] ${toneClassMap[props.tone]}`}
    >
      {props.children}
    </span>
  );
}

export function Panel(props: PanelProps) {
  return (
    <section className="border border-[var(--miro-hairline)] bg-[var(--miro-surface)] p-6 overflow-x-auto rounded">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-bold uppercase tracking-[0.08em] text-[var(--miro-ink)]">
          {props.title}
        </h2>
        {props.description ? (
          <p className="text-sm font-light leading-6 text-[var(--miro-slate)]">
            {props.description}
          </p>
        ) : null}
      </div>
      {props.children}
    </section>
  );
}

const metricSurfaceMap: Record<StatusTone, string> = {
  healthy: "bg-[var(--miro-surface)] border-[var(--miro-hairline)]",
  degraded: "bg-[var(--miro-surface)] border-[var(--miro-yellow)]",
  critical: "bg-[var(--miro-surface)] border-[var(--miro-m-red)]",
  warning: "bg-[var(--miro-surface)] border-[var(--miro-yellow)]",
  neutral: "bg-[var(--miro-surface)] border-[var(--miro-hairline)]",
};

export function MetricStrip(props: { items: MetricCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item) => (
        <article key={item.label} className={`border p-6 ${metricSurfaceMap[item.tone]}`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
              {item.label}
            </p>
            <StatusBadge tone={item.tone}>{item.tone}</StatusBadge>
          </div>
          <p className="text-4xl font-bold leading-none text-[var(--miro-ink)]">{item.value}</p>
          <p className="mt-3 text-sm font-light leading-6 text-[var(--miro-slate)]">
            {item.detail}
          </p>
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
    <div className="w-full bg-[var(--miro-surface-soft)] ">
      <table className="w-full border border-[var(--miro-hairline)]  divide-y divide-[var(--miro-hairline)] text-sm text-[var(--miro-charcoal)]">
        <colgroup>
          {props.columns.map((column) => (
            <col
              key={String(column.key)}
              style={column.width ? { width: column.width } : undefined}
            />
          ))}
        </colgroup>
        <thead className="bg-[var(--miro-canvas)] text-[11px] uppercase tracking-[0.12em] text-[var(--miro-slate)]">
          <tr>
            {props.columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3 font-bold">
                <div
                  className="overflow-hidden text-ellipsis"
                  style={{ textAlign: "center", whiteSpace: "nowrap" }}
                >
                  {column.header}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] ">
          {props.rows.map((row) => (
            <tr key={JSON.stringify(row)} className="align-middle">
              {props.columns.map((column) => {
                const rawValue = row[column.key as keyof Row];
                const titleValue = typeof rawValue === "string" ? rawValue : undefined;
                return (
                  <td
                    key={String(column.key)}
                    className="px-4 py-3 text-center font-light text-[var(--miro-ink)]"
                  >
                    <div
                      className="overflow-hidden text-ellipsis"
                      style={{ textAlign: "center", whiteSpace: "nowrap" }}
                      title={titleValue}
                    >
                      {column.render ? column.render(row) : rawValue}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
