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
    <div className="min-h-screen bg-[var(--miro-canvas)] text-[var(--miro-ink)]">
      <div className="mx-auto grid max-w-[1520px] gap-6 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-[var(--miro-hairline)] bg-[var(--miro-surface-soft)] p-5">
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-[var(--miro-yellow)] text-sm font-semibold text-[var(--miro-on-yellow)]">
                ET
              </span>
              <p className="text-sm font-medium text-[var(--miro-primary)]">ETH Treasury Ops</p>
            </div>
            <h1 className="text-2xl font-medium leading-tight text-[var(--miro-primary)]">
              Staking Control Plane
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--miro-slate)]">
              Obol CDVN baseline, Web3Signer custody, Safe export workflow.
            </p>
          </div>
          <nav className="space-y-2">
            {opsNavigation.map((item) => {
              const isActive = props.currentPath === item.href;
              const isAllowed = hasPermission(session, item.requiredPermission);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl border px-4 py-3 transition ${
                    isActive
                      ? "border-[var(--miro-primary)] bg-[var(--miro-primary)] text-[var(--miro-on-primary)]"
                      : isAllowed
                        ? "border-transparent bg-white text-[var(--miro-charcoal)] hover:border-[var(--miro-hairline-strong)]"
                        : "border-[var(--miro-hairline)] bg-[var(--miro-surface)] text-[var(--miro-muted)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-sm font-medium">
                    <span className={isActive ? "text-[var(--miro-on-primary)]" : undefined}>
                      {item.label}
                    </span>
                    {!isAllowed ? (
                      <span className="rounded-md border border-[var(--miro-hairline-strong)] px-2 py-0.5 text-[10px] uppercase text-[var(--miro-muted)]">
                        blocked
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={`mt-1 text-xs leading-5 ${
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
          <div className="mt-8 rounded-xl border border-[var(--miro-hairline)] bg-white p-4">
            <p className="text-xs uppercase text-[var(--miro-muted)]">Stub Session</p>
            <p className="mt-3 text-sm font-semibold text-[var(--miro-primary)]">{session.name}</p>
            <p className="mt-1 text-xs uppercase text-[var(--miro-blue)]">
              {userRoleLabels[session.role]}
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--miro-slate)]">{session.email}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--miro-muted)]">
              Source: {session.source} / {allowedSections.length} permitted sections
            </p>
          </div>
        </aside>
        <main className="space-y-6">
          <header className="border-b border-[var(--miro-hairline)] pb-6 pt-2">
            <p className="text-xs uppercase text-[var(--miro-muted)]">{props.currentPath}</p>
            <h2 className="mt-3 text-4xl font-medium leading-tight text-[var(--miro-primary)]">
              {props.title}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--miro-slate)]">
              {props.description}
            </p>
          </header>
          {props.children}
        </main>
      </div>
    </div>
  );
}
