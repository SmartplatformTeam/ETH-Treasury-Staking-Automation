"use client";

import { useState } from "react";

type Props = {
  value: string;
  /** Number of leading chars after `0x` to keep. Default 6. */
  head?: number;
  /** Number of trailing chars to keep. Default 4. */
  tail?: number;
};

function shortenAddress(value: string, head: number, tail: number): string {
  const stripped = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  if (stripped.length <= head + tail) {
    return value;
  }
  const prefix = value.startsWith("0x") || value.startsWith("0X") ? value.slice(0, 2) : "";
  return `${prefix}${stripped.slice(0, head)}…${stripped.slice(-tail)}`;
}

export function CopyableAddress({ value, head = 6, tail = 4 }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be blocked in some contexts
    }
  };

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-xs">
      <span title={value} className="text-[var(--miro-ink)]">
        {shortenAddress(value, head, tail)}
      </span>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy address"}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-none border border-[var(--miro-hairline)] bg-[var(--miro-surface)] text-[var(--miro-slate)] transition hover:border-[var(--miro-ink)] hover:text-[var(--miro-ink)]"
      >
        {copied ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-3.5"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-3.5"
          >
            <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
            <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
          </svg>
        )}
      </button>
    </span>
  );
}
