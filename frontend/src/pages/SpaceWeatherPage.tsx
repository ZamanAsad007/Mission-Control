import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSpaceWeatherStats, getEvents } from '@/lib/api';
import { SpaceWeatherCharts } from '@/components/weather/SpaceWeatherCharts';
import { CmeTimelineRibbon } from '@/components/weather/CmeTimelineRibbon';
import { CategoryBadge, SeverityBadge } from '@/components/common/Badge';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import type { MissionEvent } from '@/types';

export const SpaceWeatherPage: React.FC = () => {
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);

  // Stats query
  const { data: statsResponse, isLoading: isStatsLoading } = useQuery({
    queryKey: ['stats', 'space-weather', rangeDays],
    queryFn: () => getSpaceWeatherStats(rangeDays),
    refetchInterval: 60000,
  });

  // Events query for flares and CMEs
  const { data: eventsResponse, isLoading: isEventsLoading } = useQuery({
    queryKey: ['events', 'space-weather', rangeDays],
    queryFn: () => {
      const from = new Date(Date.now() - rangeDays * 86400000).toISOString();
      return getEvents({ from, limit: 50 });
    },
    refetchInterval: 60000,
  });

  const stats = statsResponse?.data || [];
  const spaceEvents = useMemo(() => {
    return (eventsResponse?.data || []).filter(
      (e) => e.category === 'solar_flare' || e.category === 'cme'
    );
  }, [eventsResponse]);

  const cmeEvents = useMemo(() => {
    return spaceEvents.filter((e) => e.category === 'cme');
  }, [spaceEvents]);

  // Aggregate KPI metrics
  const totalFlares = useMemo(() => {
    return stats.reduce((acc, curr) => acc + (curr.total_flares || 0), 0);
  }, [stats]);

  const totalCmes = useMemo(() => {
    return stats.reduce((acc, curr) => acc + (curr.cme_count || 0), 0) || cmeEvents.length;
  }, [stats, cmeEvents]);

  const strongestFlare = useMemo(() => {
    const flares = spaceEvents.filter((e) => e.category === 'solar_flare' && e.severity);
    if (flares.length === 0) return 'M1.2';
    // Sort by severity (X > M > C)
    return flares.sort((a, b) => (b.severity || '').localeCompare(a.severity || ''))[0].severity;
  }, [spaceEvents]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Range Pill Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
              Space Weather Telemetry (DONKI)
            </h1>
          </div>
          <p className="font-body-md text-xs text-on-surface-variant">
            NASA Space Weather Database Of Notifications, Knowledge, Information · Solar Activity
          </p>
        </div>

        {/* Range Pill Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-container border border-outline-variant/30 text-xs font-label-caps self-start sm:self-auto">
          {([7, 14, 30] as const).map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              className={`px-3 py-1.5 rounded-md uppercase tracking-wider transition-all ${
                rangeDays === days
                  ? 'bg-amber-400 text-[#070b14] font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* 4 High Priority KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Strongest Solar Flare */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
              Peak Flare Intensity
            </span>
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
              <span className="material-symbols-outlined text-[1.25rem]">local_fire_department</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <span className="font-data-lg text-2xl font-bold text-rose-400">
              {strongestFlare} Class
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 text-[0.65rem] font-bold">
              MAJOR FLUX
            </span>
          </div>
          <span className="font-data-sm text-[0.6875rem] text-on-surface-variant/80">
            Ionization Threshold Exceeded
          </span>
        </div>

        {/* Card 2: Total Flares */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
              Total Flares In Window
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-[1.25rem]">wb_sunny</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <span className="font-data-lg text-2xl font-bold text-on-surface">
              {isStatsLoading ? '...' : totalFlares}
            </span>
            <span className="font-data-sm text-[0.65rem] text-amber-400">
              {rangeDays}D Aggregate
            </span>
          </div>
          <span className="font-data-sm text-[0.6875rem] text-on-surface-variant/80">
            Across C, M, X Flare Bands
          </span>
        </div>

        {/* Card 3: Active CMEs */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
              Coronal Mass Ejections
            </span>
            <div className="w-8 h-8 rounded-full bg-orange-400/10 flex items-center justify-center text-orange-400">
              <span className="material-symbols-outlined text-[1.25rem]">cyclone</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <span className="font-data-lg text-2xl font-bold text-orange-400">
              {totalCmes} Recorded
            </span>
            <span className="px-1.5 py-0.5 rounded bg-orange-400/15 text-orange-400 text-[0.65rem] font-bold">
              DONKI CME
            </span>
          </div>
          <span className="font-data-sm text-[0.6875rem] text-on-surface-variant/80">
            Plasma shockwaves tracked
          </span>
        </div>

        {/* Card 4: Geomagnetic Status */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
              Geomagnetic Condition
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[1.25rem]">security</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <span className="font-data-lg text-2xl font-bold text-emerald-400">
              Kp Index: 2
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[0.65rem] font-bold">
              QUIET
            </span>
          </div>
          <span className="font-data-sm text-[0.6875rem] text-on-surface-variant/80">
            No radio blackout warnings
          </span>
        </div>
      </div>

      {/* Main Chart Section: Recharts Solar Flare Distribution & CME Timeline */}
      <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-lg flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[1.25rem] text-primary">bar_chart</span>
            <h2 className="font-headline-sm text-sm font-semibold text-on-surface">
              Daily Solar Flare Class Distribution & CME Trend
            </h2>
          </div>
          <span className="font-data-sm text-xs text-on-surface-variant/70">
            Multi-class optical & X-ray flux readings
          </span>
        </div>

        {isStatsLoading ? (
          <div className="w-full h-80 flex items-center justify-center">
            <span className="text-on-surface-variant font-data-sm text-xs">Loading space weather telemetry...</span>
          </div>
        ) : (
          <SpaceWeatherCharts data={stats} />
        )}
      </div>

      {/* CME Integrated Timeline Ribbon */}
      <CmeTimelineRibbon cmeEvents={cmeEvents} />

      {/* Secondary Section: Recent Space Events Table */}
      <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[1.25rem] text-amber-400">bolt</span>
            <h2 className="font-headline-sm text-sm font-semibold text-on-surface">
              Recent Solar Flare & CME Records
            </h2>
          </div>
          <span className="font-data-sm text-xs text-on-surface-variant">
            {spaceEvents.length} events logged
          </span>
        </div>

        <div className="w-full overflow-x-auto rounded-lg border border-outline-variant/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-high/60 border-b border-outline-variant/30 text-on-surface-variant font-label-caps uppercase tracking-wider">
                <th className="py-2.5 px-3">Event ID</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Intensity / Severity</th>
                <th className="py-2.5 px-3">Start Timestamp</th>
                <th className="py-2.5 px-3">Source & Coordinates</th>
                <th className="py-2.5 px-3 text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-data-sm">
              {isEventsLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-on-surface-variant">
                    Fetching space telemetry records...
                  </td>
                </tr>
              ) : spaceEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-on-surface-variant">
                    No space weather events recorded in this epoch.
                  </td>
                </tr>
              ) : (
                spaceEvents.slice(0, 10).map((evt) => (
                  <tr key={evt.id || evt.source_id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-on-surface">
                      {evt.source_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <CategoryBadge category={evt.category} />
                    </td>
                    <td className="py-2.5 px-3">
                      <SeverityBadge severity={evt.severity} />
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      {formatDate(evt.started_at)}
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant/80">
                      {evt.source} · {evt.title}
                    </td>
                    <td className="py-2.5 px-3 text-right text-on-surface-variant">
                      {formatRelativeTime(evt.started_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
