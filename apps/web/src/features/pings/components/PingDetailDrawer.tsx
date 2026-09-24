import type { PingDetail } from '@bizscout/shared';
import { useEffect, useRef, type ReactNode } from 'react';
import { ErrorState } from '../../../components/ErrorState';
import { JsonBlock } from '../../../components/JsonBlock';
import { Skeleton } from '../../../components/Skeleton';
import { formatBytes, formatDateTime, formatDuration } from '../../../lib/format';
import { usePingDetail } from '../hooks';
import { StatusBadge } from './StatusBadge';

interface PingDetailDrawerProps {
  id: number;
  onClose: () => void;
}

// Elements a Tab press can land on, for the focus trap below.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PingDetailDrawer({ id, onClose }: PingDetailDrawerProps) {
  const query = usePingDetail(id);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;

      const focusable = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/30"
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ping-detail-title"
        className="relative z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="ping-detail-title" className="text-lg font-semibold text-slate-900">
            Ping #{id}
          </h2>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
          >
            ✕
          </button>
        </header>
        <div className="space-y-5 p-5">
          {query.isPending && <Skeleton className="h-64" />}
          {query.isError && (
            <ErrorState
              title="Couldn't load this ping"
              error={query.error}
              onRetry={() => void query.refetch()}
            />
          )}
          {query.data && <PingDetailBody ping={query.data} />}
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 break-words text-slate-900">{children}</dd>
    </div>
  );
}

function PingDetailBody({ ping }: { ping: PingDetail }) {
  return (
    <>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <Field label="Requested at">{formatDateTime(ping.requestedAt)}</Field>
        <Field label="Status">
          <StatusBadge ping={ping} />
        </Field>
        <Field label="Response time">{formatDuration(ping.responseTimeMs)}</Field>
        <Field label="Size">{formatBytes(ping.responseSizeBytes)}</Field>
        <Field label="Target" wide>
          <code className="text-xs">
            {ping.method} {ping.targetUrl}
          </code>
        </Field>
        {ping.errorMessage && (
          <Field label="Error" wide>
            {ping.errorMessage}
          </Field>
        )}
      </dl>
      <JsonBlock title="Request payload" value={ping.requestPayload} />
      <JsonBlock title="Response body" value={ping.responseBody} />
      {ping.responseHeaders && <JsonBlock title="Response headers" value={ping.responseHeaders} />}
    </>
  );
}
