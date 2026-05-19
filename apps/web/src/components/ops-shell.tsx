import Link from "next/link";
import type { ReactNode } from "react";

import { hasPermission, opsNavigation, userRoleLabels } from "@eth-staking/domain";

import { getWebAuthSession } from "../lib/auth-session";

type OpsShellProps = {
  currentPath: string;
  title: string;
  description: string;
  children: ReactNode;
};

export async function OpsShell(props: OpsShellProps) {
  const session = await getWebAuthSession();
  const allowedSections = opsNavigation.filter((item) =>
    hasPermission(session, item.requiredPermission),
  );

  return (
    <div className="min-h-screen bg-[var(--miro-canvas)] text-[var(--miro-ink)] overflow-x-auto">
      <div className="m-stripe-divider" />
      <div className="mx-auto grid max-w-[1440px] gap-8 px-6 py-10 lg:px-10 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] p-6">
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center bg-[var(--miro-ink)] text-sm font-bold uppercase tracking-[0.12em] text-[var(--miro-on-primary)]">
                ET
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miro-ink)]">
                ETH Treasury Ops
              </p>
            </div>
            <h1 className="text-2xl font-bold uppercase leading-tight tracking-[0.04em] text-[var(--miro-ink)]">
              Staking Control Plane
            </h1>
            <p className="mt-3 text-sm font-light leading-6 text-[var(--miro-slate)]">
              Obol CDVN baseline, Web3Signer custody, Safe export workflow.
            </p>
          </div>
          <nav className="space-y-1">
            {opsNavigation.map((item) => {
              const isActive = props.currentPath === item.href;
              const isAllowed = hasPermission(session, item.requiredPermission);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block border px-4 py-3 transition ${
                    isActive
                      ? "border-[var(--miro-ink)] bg-[var(--miro-ink)] text-[var(--miro-on-primary)]"
                      : isAllowed
                        ? "border-transparent text-[var(--miro-charcoal)] hover:border-[var(--miro-hairline)] hover:bg-[var(--miro-surface)]"
                        : "border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] text-[var(--miro-muted)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`text-xs font-bold uppercase tracking-[0.12em] ${
                        isActive ? "text-[var(--miro-on-primary)]" : "text-inherit"
                      }`}
                    >
                      {item.label}
                    </span>
                    {!isAllowed ? (
                      <span className="border border-[var(--miro-hairline-strong)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--miro-muted)]">
                        blocked
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`mt-1 text-xs font-light leading-5 ${
                      isActive
                        ? "text-[var(--miro-on-primary)] opacity-70"
                        : "text-[var(--miro-slate)]"
                    }`}
                  >
                    {item.description}
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 border border-[var(--miro-hairline)] bg-[var(--miro-surface)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--miro-muted)]">
              Stub Session
            </p>
            <p className="mt-3 text-sm font-bold text-[var(--miro-ink)]">{session.name}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--miro-m-blue-dark)]">
              {userRoleLabels[session.role]}
            </p>
            <p className="mt-3 text-xs font-light leading-5 text-[var(--miro-slate)]">
              {session.email}
            </p>
            <p className="mt-2 text-[10px] font-light leading-5 text-[var(--miro-muted)]">
              Source: {session.source} / {allowedSections.length} permitted sections
            </p>
          </div>
        </aside>
        <main className="space-y-8">
          <header className="border-b border-[var(--miro-hairline)] pb-8 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--miro-muted)]">
              {props.currentPath}
            </p>
            <h2 className="mt-3 text-5xl font-bold uppercase leading-none tracking-[0.02em] text-[var(--miro-ink)]">
              {props.title}
            </h2>
            <p className="mt-4 max-w-3xl text-base font-light leading-7 text-[var(--miro-slate)]">
              {props.description}
            </p>
          </header>
          {props.children}
        </main>
      </div>
    </div>
  );
}
