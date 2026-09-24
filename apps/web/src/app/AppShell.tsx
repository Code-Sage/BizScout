import type { ReactNode } from 'react';
import { LiveIndicator } from '../features/realtime/LiveIndicator';

export function AppShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">BizScout Uptime Monitor</h1>
            <p className="text-sm text-slate-500">POST to httpbin.org/anything every 5 minutes</p>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <LiveIndicator />
          </div>
        </div>
      </header>
      {/* pb-24 keeps the last rows clear of the bottom-right alert toasts (Phase 7). */}
      <main className="mx-auto max-w-6xl space-y-8 px-4 pt-6 pb-24 sm:px-6">{children}</main>
    </div>
  );
}
