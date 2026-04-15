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
    hasPermission(session, item.requiredPermission)
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(120,53,15,0.18),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#020617_48%,_#0f172a_100%)] text-slate-100">
      <div className="mx-auto grid max-w-[1560px] gap-6 px-6 py-8 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-slate-800 bg-slate-950/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.42)]">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">ETH Treasury Ops</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-50">Staking Control Plane</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
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
                  className={`block rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? "border-cyan-400/30 bg-cyan-400/10 text-slate-50"
                      : isAllowed
                        ? "border-transparent bg-slate-900/60 text-slate-300 hover:border-slate-800 hover:bg-slate-900"
                        : "border-slate-900 bg-slate-950/80 text-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-sm font-medium">
                    <span>{item.label}</span>
                    {!isAllowed ? (
                      <span className="rounded-full border border-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        blocked
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{item.description}</div>
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Stub Session</p>
            <p className="mt-3 text-sm font-semibold text-slate-100">{session.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-cyan-300">
              {userRoleLabels[session.role]}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-400">{session.email}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Source: {session.source} • {allowedSections.length} permitted sections
            </p>
          </div>
        </aside>
        <main className="space-y-6">
          <header className="rounded-[2rem] border border-slate-800 bg-slate-950/80 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.38)]">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{props.currentPath}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">{props.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{props.description}</p>
          </header>
          {props.children}
        </main>
      </div>
    </div>
  );
}
