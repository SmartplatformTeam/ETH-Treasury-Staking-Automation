import { notFound } from "next/navigation";

import { Panel } from "@eth-staking/ui";

import { DocToc } from "../../../components/doc-toc";
import { MarkdownView } from "../../../components/markdown-view";
import { OpsShell } from "../../../components/ops-shell";
import { docPages, extractToc, readDocFile } from "../../../lib/docs";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return docPages.map((page) => ({ slug: page.slug }));
}

export default async function DocPage(props: PageProps) {
  const { slug } = await props.params;
  const page = docPages.find((entry) => entry.slug === slug);
  if (!page) notFound();

  let markdown: string;
  try {
    markdown = await readDocFile(page.filePath);
  } catch {
    notFound();
  }

  const toc = extractToc(markdown);

  return (
    <OpsShell currentPath="/docs" title={page.title} description={page.description}>
      <Panel title={page.title} description={`Source: docs/${page.filePath}`}>
        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <DocToc entries={toc} />
          <article className="min-w-0">
            <MarkdownView source={markdown} />
          </article>
        </div>
      </Panel>
    </OpsShell>
  );
}
