import type { TocEntry } from "../lib/docs";

type DocTocProps = {
  entries: TocEntry[];
};

export function DocToc({ entries }: DocTocProps) {
  if (entries.length === 0) return null;
  return (
    <nav className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
        On this page
      </p>
      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li
            key={entry.anchor}
            className={entry.level === 3 ? "ml-3 text-xs" : "text-xs font-bold"}
          >
            <a
              href={`#${entry.anchor}`}
              className="block text-[var(--miro-slate)] hover:text-[var(--miro-ink)]"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
