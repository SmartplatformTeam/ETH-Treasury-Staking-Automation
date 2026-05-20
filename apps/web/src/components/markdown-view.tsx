import type { ComponentProps, ReactNode } from "react";

import ReactMarkdown from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

type MarkdownViewProps = {
  source: string;
};

type LinkProps = ComponentProps<"a">;
type CodeProps = ComponentProps<"code"> & { inline?: boolean };
type PreProps = ComponentProps<"pre">;
type TableProps = ComponentProps<"table">;
type BlockquoteProps = ComponentProps<"blockquote">;
type HeadingProps = ComponentProps<"h2">;

const headingBase =
  "scroll-mt-24 font-bold uppercase tracking-[0.08em] text-[var(--miro-ink)]";

function H1({ children, ...rest }: HeadingProps) {
  return (
    <h1 {...rest} className={`${headingBase} mt-8 mb-4 text-2xl`}>
      {children}
    </h1>
  );
}

function H2({ children, ...rest }: HeadingProps) {
  return (
    <h2
      {...rest}
      className={`${headingBase} mt-10 mb-3 border-b border-[var(--miro-hairline)] pb-2 text-xl`}
    >
      {children}
    </h2>
  );
}

function H3({ children, ...rest }: HeadingProps) {
  return (
    <h3 {...rest} className={`${headingBase} mt-6 mb-2 text-base`}>
      {children}
    </h3>
  );
}

function H4({ children, ...rest }: HeadingProps) {
  return (
    <h4 {...rest} className={`${headingBase} mt-5 mb-2 text-sm`}>
      {children}
    </h4>
  );
}

function P({ children }: { children?: ReactNode }) {
  return (
    <p className="mb-4 text-sm font-light leading-7 text-[var(--miro-ink)]">{children}</p>
  );
}

function Ul({ children }: { children?: ReactNode }) {
  return (
    <ul className="mb-4 ml-5 list-disc text-sm font-light leading-7 text-[var(--miro-ink)] [&_li]:mb-1">
      {children}
    </ul>
  );
}

function Ol({ children }: { children?: ReactNode }) {
  return (
    <ol className="mb-4 ml-5 list-decimal text-sm font-light leading-7 text-[var(--miro-ink)] [&_li]:mb-1">
      {children}
    </ol>
  );
}

function Anchor({ children, href, ...rest }: LinkProps) {
  const isExternal = href && /^https?:/.test(href);
  return (
    <a
      {...rest}
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer noopener" : undefined}
      className="text-[var(--miro-ink)] underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

function Code({ children, className, inline }: CodeProps) {
  if (inline) {
    return (
      <code className="rounded-none border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] px-1.5 py-0.5 font-mono text-[12.5px] text-[var(--miro-ink)]">
        {children}
      </code>
    );
  }
  return (
    <code className={`${className ?? ""} font-mono text-[12.5px] text-[var(--miro-ink)]`}>
      {children}
    </code>
  );
}

function Pre({ children }: PreProps) {
  return (
    <pre className="mb-4 overflow-x-auto rounded-none border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] p-4 text-[12.5px] leading-6">
      {children}
    </pre>
  );
}

function Table({ children }: TableProps) {
  return (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border border-[var(--miro-hairline)] text-left text-sm">
        {children}
      </table>
    </div>
  );
}

function Th({ children }: ComponentProps<"th">) {
  return (
    <th className="border-b border-[var(--miro-hairline)] bg-[var(--miro-canvas)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--miro-slate)]">
      {children}
    </th>
  );
}

function Td({ children }: ComponentProps<"td">) {
  return (
    <td className="border-b border-[var(--miro-hairline)] px-3 py-2 align-top font-light text-[var(--miro-ink)]">
      {children}
    </td>
  );
}

function Blockquote({ children }: BlockquoteProps) {
  return (
    <blockquote className="mb-4 border-l-2 border-[var(--miro-yellow)] bg-[var(--miro-surface-soft)] px-4 py-2 text-sm font-light leading-7 text-[var(--miro-ink)]">
      {children}
    </blockquote>
  );
}

function Hr() {
  return <hr className="my-8 border-t border-[var(--miro-hairline)]" />;
}

export function MarkdownView({ source }: MarkdownViewProps) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            { behavior: "append", properties: { className: "anchor-link", ariaHidden: true } }
          ]
        ]}
        components={{
          h1: H1,
          h2: H2,
          h3: H3,
          h4: H4,
          p: P,
          ul: Ul,
          ol: Ol,
          a: Anchor,
          code: Code,
          pre: Pre,
          table: Table,
          th: Th,
          td: Td,
          blockquote: Blockquote,
          hr: Hr
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
