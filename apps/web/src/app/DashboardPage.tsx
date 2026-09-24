import {
  PING_STATUS_FILTERS,
  STATS_WINDOWS,
  type PingStatusFilter,
  type StatsWindow,
} from '@bizscout/shared';
import { useCallback, useState } from 'react';
import { SegmentedControl } from '../components/SegmentedControl';
import { PingDetailDrawer } from '../features/pings/components/PingDetailDrawer';
import { PingTable } from '../features/pings/components/PingTable';
import { ResponseTimeChart } from '../features/pings/components/ResponseTimeChart';
import { StatsCards } from '../features/pings/components/StatsCards';
import { useLiveStream, type EventSourceFactory } from '../features/realtime/use-live-stream';
import { AppShell } from './AppShell';

const STATUS_LABELS: Record<PingStatusFilter, string> = {
  all: 'All',
  success: 'Successes',
  failure: 'Failures',
};

export function DashboardPage({ eventSourceFactory }: { eventSourceFactory?: EventSourceFactory }) {
  useLiveStream(eventSourceFactory);
  const [statsWindow, setStatsWindow] = useState<StatsWindow>('24h');
  const [status, setStatus] = useState<PingStatusFilter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const closeDetail = useCallback(() => setSelectedId(null), []);

  return (
    <AppShell>
      <section aria-labelledby="overview-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="overview-heading" className="text-base font-semibold text-slate-900">
            Overview
          </h2>
          <SegmentedControl
            label="Time window"
            options={STATS_WINDOWS}
            value={statsWindow}
            onChange={setStatsWindow}
          />
        </div>
        <StatsCards window={statsWindow} />
        <ResponseTimeChart window={statsWindow} />
      </section>

      <section aria-labelledby="responses-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="responses-heading" className="text-base font-semibold text-slate-900">
            Responses
          </h2>
          <SegmentedControl
            label="Filter by outcome"
            options={PING_STATUS_FILTERS}
            value={status}
            onChange={setStatus}
            format={(option) => STATUS_LABELS[option]}
          />
        </div>
        <PingTable status={status} onSelect={setSelectedId} />
      </section>

      {selectedId !== null && <PingDetailDrawer id={selectedId} onClose={closeDetail} />}
    </AppShell>
  );
}
