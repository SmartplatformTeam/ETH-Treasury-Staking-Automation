import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

const DOCS_ROOT = process.env.DOCS_ROOT
  ? path.resolve(process.env.DOCS_ROOT)
  : path.join(process.cwd(), "..", "..", "docs");

export type DocPage = {
  slug: string;
  filePath: string;
  title: string;
  description: string;
};

export const docPages: DocPage[] = [
  {
    slug: "handoff",
    filePath: "SESSION-HANDOFF.md",
    title: "Session Handoff",
    description: "새 세션 진입 시 1분 안에 컨텍스트 복원. 현재 상태, 다음 후보, follow-up."
  },
  {
    slug: "runbook",
    filePath: "operator-runbook.md",
    title: "Operator Runbook",
    description:
      "Operator/admin 의 모든 페이지 사용법, 시나리오, API curl 예제, 트러블슈팅, 알려진 코드 함정."
  },
  {
    slug: "changelog",
    filePath: "CHANGELOG.md",
    title: "Changelog",
    description: "Phase 별 사용자 시점 변경 — 새 페이지/endpoint/env 한 단락씩."
  }
];

export async function readDocFile(filePath: string): Promise<string> {
  const safePath = path.normalize(filePath);
  if (safePath.startsWith("..") || path.isAbsolute(safePath)) {
    throw new Error(`Refusing to read outside docs/: ${filePath}`);
  }
  const absolute = path.join(DOCS_ROOT, safePath);
  return fs.readFile(absolute, "utf-8");
}

export type TocEntry = {
  level: 2 | 3;
  text: string;
  anchor: string;
};

/**
 * Quick regex-based TOC extraction. Mirrors github-slugger behavior closely enough
 * (lowercase, spaces→dashes, strip non-word chars) for our internal use.
 */
export function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = markdown.split("\n");
  const seen = new Map<string, number>();
  let inFence = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match || !match[1] || !match[2]) continue;
    const level = match[1].length as 2 | 3;
    const text = match[2].replace(/`/g, "").trim();
    const baseSlug = text
      .toLowerCase()
      .replace(/[^a-z0-9À-ɏ가-힯\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const slugBase = baseSlug || "section";
    const existing = seen.get(slugBase) ?? 0;
    seen.set(slugBase, existing + 1);
    const anchor = existing === 0 ? slugBase : `${slugBase}-${existing}`;
    entries.push({ level, text, anchor });
  }

  return entries;
}
