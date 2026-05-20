import Link from "next/link";

import { Panel } from "@eth-staking/ui";

import { OpsShell } from "../../components/ops-shell";
import { docPages } from "../../lib/docs";

export default function DocsIndexPage() {
  return (
    <OpsShell
      currentPath="/docs"
      title="Docs"
      description="운영자/관리자 시점의 사용 설명서와 phase 별 변경 history."
    >
      <Panel
        title="Available Documents"
        description="모두 docs/ 의 마크다운 파일을 직접 렌더. phase done 마다 갱신."
      >
        <ul className="flex flex-col gap-3">
          {docPages.map((page) => (
            <li
              key={page.slug}
              className="border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] p-4 transition hover:border-[var(--miro-ink)]"
            >
              <Link href={`/docs/${page.slug}`} className="block">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--miro-ink)]">
                  {page.title}
                </p>
                <p className="mt-1 text-xs font-light leading-6 text-[var(--miro-slate)]">
                  {page.description}
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--miro-slate)]">
                  docs/{page.filePath}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </OpsShell>
  );
}
