import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';
import { getApodToday, getEvents, getAsteroids, getSpaceWeatherStats, getHealth } from '@/lib/api';
import { useEventStream } from '@/hooks/useEventStream';
import { formatDate, formatRelativeTime, kmToLd, formatKm } from '@/lib/utils';
import { CategoryBadge, SeverityBadge } from '@/components/common/Badge';
import { Skeleton } from '@/components/common/Skeleton';
import type { MissionEvent } from '@/types';

export const DashboardPage: React.FC = () => {
  const { searchTerm = '' } = useOutletContext<{ searchTerm?: string }>() || {};
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showApodModal, setShowApodModal] = useState<boolean>(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Queries
  const { data: apodData, isLoading: isApodLoading } = useQuery({
    queryKey: ['apod', 'today'],
    queryFn: getApodToday,
  });

  const { data: initialEventsData, isLoading: isEventsLoading } = useQuery({
    queryKey: ['events', 'feed'],
    queryFn: () => getEvents({ limit: 40 }),
    refetchInterval: 60000,
  });

  const { data: asteroidsData, isLoading: isAsteroidsLoading } = useQuery({
    queryKey: ['asteroids', 'upcoming'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      return getAsteroids({ from: today, to: nextWeek });
    },
  });

  const { data: spaceStatsData } = useQuery({
    queryKey: ['stats', 'space-weather', 7],
    queryFn: () => getSpaceWeatherStats(7),
  });

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  });

  // Real-Time SSE Stream
  const { status: streamStatus, liveEvents } = useEventStream({
    enabled: true,
  });

  // Merge live events with queried events
  const mergedEvents = useMemo(() => {
    const map = new Map<string, MissionEvent>();

    // Add live events first
    liveEvents.forEach((evt) => {
      map.set(evt.id || `${evt.source}_${evt.source_id}`, evt);
    });

    // Add fetched events
    if (initialEventsData?.data && Array.isArray(initialEventsData.data)) {
      initialEventsData.data.forEach((evt) => {
        const key = evt.id || `${evt.source}_${evt.source_id}`;
        if (!map.has(key)) {
          map.set(key, evt);
        }
      });
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }, [liveEvents, initialEventsData]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return mergedEvents.filter((event) => {
      const matchesSearch =
        !searchTerm ||
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.source_id && event.source_id.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'flares') return event.category === 'solar_flare';
      if (selectedCategory === 'cme') return event.category === 'cme';
      if (selectedCategory === 'natural')
        return ['wildfire', 'severeStorms', 'volcanoes', 'seaLakeIce'].includes(event.category);
      if (selectedCategory === 'asteroids') return event.category === 'asteroid';
      return true;
    });
  }, [mergedEvents, searchTerm, selectedCategory]);

  const apod = apodData?.data;
  const asteroids = asteroidsData?.data || [];
  const hazardousCount = asteroids.filter((a) => a.hazardous).length;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. HERO SECTION: APOD BANNER */}
      {isApodLoading ? (
        <Skeleton className="w-full h-80 rounded-xl" />
      ) : apod ? (
        <section className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-surface-container-lowest min-h-[380px] md:min-h-[420px] flex flex-col justify-end p-6 md:p-8 border border-outline-variant/30">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url('${apod.url}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/40 to-transparent" />

          <div className="relative z-10 flex flex-col max-w-4xl gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label-caps text-label-caps tracking-widest uppercase border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                ASTRONOMY PICTURE OF THE DAY · APOD / NASA
              </span>
              <span className="font-data-sm text-data-sm text-on-surface-variant/80 tracking-wide">
                {formatDate(apod.date)}
              </span>
            </div>

            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-tight">
              {apod.title}
            </h1>

            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed line-clamp-2 md:line-clamp-3">
              {apod.explanation}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => setShowApodModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-sm hover:bg-primary transition-all shadow-lg shadow-primary-container/20 font-semibold"
              >
                <span>Read full briefing & HD imagery</span>
                <span className="material-symbols-outlined text-[1.125rem]">open_in_new</span>
              </button>

              {apod.copyright && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high/80 text-on-surface-variant font-data-sm text-xs backdrop-blur-md border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[1rem] text-primary">verified</span>
                  <span>Credit: {apod.copyright}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* 2. KPI METRICS ROW */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Events */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-primary/40 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Active Events (24H)
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[1.25rem]">radar</span>
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="font-data-lg text-3xl font-bold text-on-surface">
              {mergedEvents.length}
            </span>
            <div className="flex items-center gap-1 text-primary font-data-sm text-xs">
              <span className="material-symbols-outlined text-[1rem]">sensors</span>
              <span>{streamStatus === 'connected' ? 'STREAMING' : 'POLLING'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-primary font-data-sm text-xs">
            <span className="material-symbols-outlined text-[1rem]">bolt</span>
            <span>DONKI + EONET Live Feed</span>
          </div>
        </div>

        {/* KPI 2: Near-Earth Asteroids */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-secondary/40 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              NEO Approaches (7D)
            </span>
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[1.25rem]">orbit</span>
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="font-data-lg text-3xl font-bold text-on-surface">
              {isAsteroidsLoading ? '...' : asteroids.length}
            </span>
            <span className="font-data-sm text-xs px-2 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20">
              NeoWs Feed
            </span>
          </div>
          <div className="flex items-center gap-1 text-secondary font-data-sm text-xs">
            <span className="material-symbols-outlined text-[1rem]">warning</span>
            <span>{hazardousCount} Potentially Hazardous</span>
          </div>
        </div>

        {/* KPI 3: Space Weather Flares */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-amber-400/40 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Solar Flares (7D)
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-[1.25rem]">wb_sunny</span>
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="font-data-lg text-3xl font-bold text-on-surface">
              {spaceStatsData?.data?.reduce((acc, curr) => acc + (curr.total_flares || 0), 0) ??
                mergedEvents.filter((e) => e.category === 'solar_flare').length}
            </span>
            <div className="flex items-center gap-1 text-amber-400 font-data-sm text-xs">
              <span className="material-symbols-outlined text-[1rem]">flare</span>
              <span>DONKI FLR</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-amber-400 font-data-sm text-xs">
            <span className="material-symbols-outlined text-[1rem]">security</span>
            <span>Radiation Level Nominal</span>
          </div>
        </div>

        {/* KPI 4: Ingestion Health */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-emerald-400/40 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              Telemetry Status
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-400/10 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[1.25rem]">check_circle</span>
            </div>
          </div>
          <div className="my-3 flex items-baseline justify-between">
            <span className="font-data-lg text-2xl font-bold text-emerald-400">
              {healthData?.data?.status === 'ok' ? 'NOMINAL' : 'ONLINE'}
            </span>
            <span className="font-data-sm text-xs text-on-surface-variant">4/4 Nodes</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 font-data-sm text-xs">
            <span className="material-symbols-outlined text-[1rem]">cached</span>
            <span>Scheduled Auto-Sync</span>
          </div>
        </div>
      </section>

      {/* 3. MAIN BODY: TWO-COLUMN ASYMMETRIC GRID (60% / 40%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: LIVE EVENT FEED (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-radar absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-container"></span>
              </span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Live Telemetry & Event Feed
              </h2>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'flares', label: 'Flares' },
                { id: 'cme', label: 'CME' },
                { id: 'natural', label: 'Natural' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1 rounded-full font-label-caps text-[0.6875rem] font-bold uppercase tracking-wider transition-all ${
                    selectedCategory === tab.id
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed List Container */}
          <div className="flex flex-col gap-3">
            {isEventsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-24 rounded-xl" />
              ))
            ) : filteredEvents.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[2rem] text-primary/40">
                  satellite_alt
                </span>
                <p className="font-body-md">No telemetry events matching the current criteria.</p>
              </div>
            ) : (
              filteredEvents.slice(0, 15).map((evt) => {
                const isExpanded = expandedEventId === evt.id;
                return (
                  <div
                    key={evt.id || `${evt.source}_${evt.source_id}`}
                    className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CategoryBadge category={evt.category} />
                        <SeverityBadge severity={evt.severity} />
                      </div>
                      <span className="font-data-sm text-xs text-on-surface-variant/70">
                        {formatRelativeTime(evt.started_at)}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                        {evt.title}
                      </h3>
                      {evt.location && (
                        <span className="font-data-sm text-xs text-primary/80 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[0.875rem]">
                            location_on
                          </span>
                          <span>
                            {evt.location.coordinates[1].toFixed(2)}°N,{' '}
                            {evt.location.coordinates[0].toFixed(2)}°E
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-xs font-data-sm text-on-surface-variant">
                      <span className="uppercase tracking-wider text-[0.6875rem]">
                        SRC: {evt.source} · ID: {evt.source_id}
                      </span>
                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                        <span className="material-symbols-outlined text-[1rem]">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </div>

                    {isExpanded && evt.payload && (
                      <pre className="p-3 rounded-lg bg-surface-container-lowest text-[0.7rem] text-primary/90 font-mono overflow-x-auto max-h-48 border border-outline-variant/30">
                        {JSON.stringify(evt.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ASTEROIDS & SPACE WEATHER (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* CARD A: UPCOMING ASTEROIDS (NEOWS) */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[1.25rem] text-secondary">
                  radar
                </span>
                <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                  Upcoming Asteroid Approaches
                </h3>
              </div>
              <Link
                to="/asteroids"
                className="text-xs font-label-caps text-secondary hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1"
              >
                <span>3D Radar</span>
                <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {isAsteroidsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-16 rounded-lg" />
                ))
              ) : asteroids.length === 0 ? (
                <p className="text-on-surface-variant font-body-sm text-xs py-4 text-center">
                  No upcoming asteroids in current approach window.
                </p>
              ) : (
                asteroids.slice(0, 4).map((ast) => (
                  <div
                    key={ast.neo_id}
                    className="p-3 rounded-lg bg-surface-container border border-outline-variant/30 flex items-center justify-between hover:border-secondary/50 transition-all"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-xs font-semibold text-on-surface truncate">
                          {ast.name}
                        </span>
                        {ast.hazardous && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-label-caps text-[0.6rem] font-bold border border-rose-500/30">
                            HAZARDOUS
                          </span>
                        )}
                      </div>
                      <span className="font-data-sm text-[0.7rem] text-on-surface-variant">
                        Approach: {formatDate(ast.approach_date)}
                      </span>
                    </div>

                    <div className="flex flex-col items-end text-right">
                      <span className="font-data-sm text-xs text-secondary font-bold">
                        {kmToLd(ast.miss_distance_km)} LD
                      </span>
                      <span className="font-data-sm text-[0.6875rem] text-on-surface-variant/70">
                        {Number(ast.velocity_kps).toFixed(1)} km/s
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CARD B: SOLAR FLARE ACTIVITY BAR CHART */}
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[1.25rem] text-amber-400">
                  bolt
                </span>
                <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                  Solar Activity (7 Days)
                </h3>
              </div>
              <Link
                to="/space-weather"
                className="text-xs font-label-caps text-amber-400 hover:text-primary transition-colors uppercase tracking-wider flex items-center gap-1"
              >
                <span>Analytics</span>
                <span className="material-symbols-outlined text-[1rem]">arrow_forward</span>
              </Link>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-label-caps">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                <span className="text-on-surface-variant">C-Class</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                <span className="text-on-surface-variant">M-Class</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                <span className="text-on-surface-variant">X-Class</span>
              </div>
            </div>

            {/* SVG Visual Bar Chart for 7 Days */}
            <div className="flex items-end justify-between gap-2 h-36 pt-4 border-b border-outline-variant/30 px-2">
              {(spaceStatsData?.data && spaceStatsData.data.length > 0
                ? spaceStatsData.data.slice(-7)
                : [
                    { date: '10-13', c_class: 2, m_class: 0, x_class: 0, total_flares: 2 },
                    { date: '10-14', c_class: 2, m_class: 2, x_class: 0, total_flares: 4 },
                    { date: '10-15', c_class: 3, m_class: 2, x_class: 0, total_flares: 5 },
                    { date: '10-16', c_class: 2, m_class: 0, x_class: 1, total_flares: 3 },
                    { date: '10-17', c_class: 3, m_class: 2, x_class: 1, total_flares: 6 },
                    { date: '10-18', c_class: 1, m_class: 0, x_class: 0, total_flares: 1 },
                    { date: 'Today', c_class: 1, m_class: 1, x_class: 1, total_flares: 3 },
                  ]
              ).map((day, idx) => {
                const total = Math.max(day.total_flares || 1, 1);
                const heightPct = Math.min((total / 8) * 100, 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col-reverse justify-start rounded bg-surface-container overflow-hidden h-28">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full flex flex-col-reverse rounded overflow-hidden"
                      >
                        <div
                          style={{ height: `${(day.c_class / total) * 100}%` }}
                          className="bg-emerald-400 w-full"
                        />
                        <div
                          style={{ height: `${(day.m_class / total) * 100}%` }}
                          className="bg-amber-400 w-full"
                        />
                        <div
                          style={{ height: `${(day.x_class / total) * 100}%` }}
                          className="bg-rose-500 w-full"
                        />
                      </div>
                    </div>
                    <span className="font-data-sm text-[0.625rem] text-on-surface-variant truncate w-full text-center">
                      {day.date.substring(5) || day.date}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs font-data-sm text-on-surface-variant">
              <span>DONKI Space Weather Feed</span>
              <span className="text-primary">Kp Index: 2 (Quiet)</span>
            </div>
          </div>
        </div>
      </section>

      {/* APOD Detail Modal */}
      {showApodModal && apod && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-container rounded-2xl border border-primary/30 p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[1.5rem] text-primary">
                  satellite_alt
                </span>
                <h2 className="font-headline-md text-xl font-bold text-on-surface">{apod.title}</h2>
              </div>
              <button
                onClick={() => setShowApodModal(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[1.5rem]">close</span>
              </button>
            </div>

            <div className="w-full rounded-xl overflow-hidden bg-black max-h-[500px] flex items-center justify-center border border-outline-variant/30">
              {apod.media_type === 'video' ? (
                <iframe
                  src={apod.url}
                  title={apod.title}
                  className="w-full h-80 md:h-[450px]"
                  allowFullScreen
                />
              ) : (
                <img
                  src={apod.hd_url || apod.url}
                  alt={apod.title}
                  className="w-full h-auto object-contain max-h-[500px]"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-data-sm text-on-surface-variant">
                <span>Date: {formatDate(apod.date)}</span>
                {apod.copyright && <span>Credit: {apod.copyright}</span>}
              </div>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                {apod.explanation}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
              {apod.hd_url && (
                <a
                  href={apod.hd_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary font-headline-sm text-xs border border-primary/30 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[1rem]">fullscreen</span>
                  <span>View Full HD Image</span>
                </a>
              )}
              <button
                onClick={() => setShowApodModal(false)}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-xs font-semibold hover:bg-primary transition-all"
              >
                Close Briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
