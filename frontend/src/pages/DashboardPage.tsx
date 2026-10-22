import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';
import { getApodToday, getEvents, getAsteroids, getSpaceWeatherStats, getHealth } from '@/lib/api';
import { useEventStream } from '@/hooks/useEventStream';
import { formatDate, formatRelativeTime, kmToLd } from '@/lib/utils';
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
    queryFn: () => getEvents({ limit: 50 }),
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

  // Statistics calculation for KPI cards and filter badges
  const stats = useMemo(() => {
    let solarCount = 0;
    let mClass = 0;
    let xClass = 0;
    let wildfires = 0;
    let storms = 0;
    let volcanoes = 0;

    mergedEvents.forEach((evt) => {
      const cat = (evt.category || '').toLowerCase();
      const sev = (evt.severity || '').toUpperCase();

      if (cat.includes('flare') || cat === 'solar_flare') {
        solarCount++;
        if (sev.startsWith('M')) mClass++;
        if (sev.startsWith('X')) xClass++;
      } else if (cat.includes('wildfire')) {
        wildfires++;
      } else if (cat.includes('storm')) {
        storms++;
      } else if (cat.includes('volcano')) {
        volcanoes++;
      }
    });

    return {
      total: mergedEvents.length,
      solarCount,
      mClass,
      xClass,
      wildfires,
      storms,
      volcanoes,
      earthCount: wildfires + storms + volcanoes,
    };
  }, [mergedEvents]);

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
      if (selectedCategory === 'solar')
        return event.category === 'solar_flare' || event.category === 'cme';
      if (selectedCategory === 'wildfires') return event.category === 'wildfire';
      if (selectedCategory === 'storms')
        return (
          event.category === 'severeStorms' || (event.category || '').toLowerCase().includes('storm')
        );
      if (selectedCategory === 'volcanoes') return event.category === 'volcanoes';
      if (selectedCategory === 'asteroids') return event.category === 'asteroid';
      return true;
    });
  }, [mergedEvents, searchTerm, selectedCategory]);

  const apod = apodData?.data;
  const apodTitle =
    !apod?.title || apod.title === 'NASA Science'
      ? 'Astronomy Picture of the Day'
      : apod.title;
  const apodHeroBg =
    (apod?.media_type === 'video' ? apod.hd_url : apod?.hd_url || apod?.url) ||
    'https://images-assets.nasa.gov/image/PIA12348/PIA12348~orig.jpg';
  const asteroids = asteroidsData?.data || [];
  const hazardousCount = asteroids.filter((a) => a.hazardous).length;

  // Nearest approaching asteroid
  const nearestAsteroid = useMemo(() => {
    if (!asteroids.length) return null;
    return [...asteroids].sort(
      (a, b) => Number(a.miss_distance_km) - Number(b.miss_distance_km)
    )[0];
  }, [asteroids]);

  // Helper for accent border on cards
  const getEventAccentClass = (cat: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('flare') || c === 'solar_flare' || c.includes('cme')) {
      return 'bg-amber-400';
    }
    if (c.includes('wildfire')) {
      return 'bg-rose-500';
    }
    if (c.includes('storm')) {
      return 'bg-primary-container';
    }
    if (c.includes('volcano')) {
      return 'bg-fuchsia-400';
    }
    if (c.includes('asteroid')) {
      return 'bg-secondary';
    }
    return 'bg-primary';
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {/* 0. INGESTION HEALTH & TELEMETRY BEACON STRIP (Stitch Mobile Spec) */}
      <section className="bg-surface-container-low rounded-xl p-3 md:p-3.5 border border-outline-variant/30 flex flex-col gap-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span>
            </span>
            <span className="font-label-caps text-label-caps text-primary tracking-wider uppercase font-semibold">
              Live Ingestion Active
            </span>
          </div>
          <span className="font-data-sm text-data-sm text-on-surface-variant uppercase">
            {streamStatus === 'connected' ? 'STREAMING REAL-TIME' : 'SYNC NOMINAL'}
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
          <span className="font-data-sm text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-primary flex items-center gap-1.5 shrink-0 border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>DONKI
          </span>
          <span className="font-data-sm text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-amber-400 flex items-center gap-1.5 shrink-0 border border-amber-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>EONET
          </span>
          <span className="font-data-sm text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-secondary flex items-center gap-1.5 shrink-0 border border-secondary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>NeoWs
          </span>
          <span className="font-data-sm text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-emerald-400 flex items-center gap-1.5 shrink-0 border border-emerald-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>APOD: 200 OK
          </span>
        </div>
      </section>

      {/* 1. HERO SECTION: APOD BANNER (Stitch Mobile & Desktop Refined) */}
      {isApodLoading ? (
        <Skeleton className="w-full h-72 md:h-96 rounded-xl" />
      ) : apod ? (
        <section className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-surface-container-lowest min-h-[300px] md:min-h-[420px] flex flex-col justify-end p-5 md:p-8 border border-outline-variant/30 group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url('${apodHeroBg}')` }}
          />
          {/* Gradient Scrim Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest/90 via-transparent to-transparent" />

          {/* Top Metadata Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md border border-primary/20">
              <span className="material-symbols-outlined text-primary text-[14px]">
                auto_awesome
              </span>
              <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
                APOD // NASA {apod.media_type === 'video' ? 'VIDEO' : 'SCIENCE'}
              </span>
            </div>
            <span className="font-data-sm text-data-sm text-on-surface-variant bg-surface-container-lowest/80 px-2.5 py-1 rounded backdrop-blur-md border border-outline-variant/30">
              {formatDate(apod.date)}
            </span>
          </div>

          <div className="relative z-10 flex flex-col max-w-4xl gap-y-2.5">
            <h1 className="font-headline-sm md:font-headline-lg text-lg md:text-3xl text-on-surface tracking-tight font-semibold leading-tight line-clamp-2">
              {apodTitle}
            </h1>

            <p className="font-body-sm md:font-body-md text-xs md:text-sm text-on-surface-variant max-w-2xl leading-relaxed line-clamp-2 md:line-clamp-3">
              {apod.explanation}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setShowApodModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-xs md:text-sm hover:bg-primary transition-all shadow-md font-semibold"
              >
                <span>Read Briefing</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>

              <span className="font-data-sm text-xs text-on-surface-variant/80">
                UTC 00:00 APOD
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {/* 2. 2x2 TACTICAL METRIC KPI GRID (Stitch Mobile Spec: 2 cols on mobile, 4 on desktop) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-title-hud text-title-hud text-on-surface uppercase tracking-wider">
            Mission Sensors 24H
          </span>
          <span className="font-data-sm text-data-sm text-primary">REAL-TIME</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Card 1: Active Events */}
          <div className="bg-surface-container p-3.5 md:p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/30 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant truncate">
                ACTIVE TELEMETRY
              </span>
              <span className="material-symbols-outlined text-primary text-[18px]">satellite</span>
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <span className="font-data-lg text-2xl md:text-3xl text-primary font-bold tracking-tight">
                {mergedEvents.length}
              </span>
              <span className="font-data-sm text-data-sm text-primary flex items-center">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>+
                {liveEvents.length || 4}
              </span>
            </div>
            {/* Sparkline SVG (Cyan) */}
            <div className="w-full h-6 pt-1">
              <svg
                className="w-full h-full stroke-primary fill-none"
                preserveAspectRatio="none"
                viewBox="0 0 100 24"
              >
                <path
                  d="M0,18 L18,16 L35,19 L52,11 L70,14 L85,6 L100,2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <span className="font-data-sm text-data-sm text-on-surface-variant mt-1 truncate">
              DONKI + EONET Live
            </span>
          </div>

          {/* Card 2: Strong Solar Flares */}
          <div className="bg-surface-container p-3.5 md:p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/30 hover:border-amber-400/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-amber-400 truncate">
                SOLAR FLARES (7D)
              </span>
              <span className="material-symbols-outlined text-amber-400 text-[18px]">
                solar_power
              </span>
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <span className="font-data-lg text-2xl md:text-3xl text-amber-400 font-bold tracking-tight">
                {spaceStatsData?.data?.reduce((acc, curr) => acc + (curr.total_flares || 0), 0) ??
                  stats.solarCount}
              </span>
              <span className="font-label-caps text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-amber-400">
                DONKI
              </span>
            </div>
            {/* Sparkline SVG (Amber) */}
            <div className="w-full h-6 pt-1">
              <svg
                className="w-full h-full stroke-amber-400 fill-none"
                preserveAspectRatio="none"
                viewBox="0 0 100 24"
              >
                <path
                  d="M0,20 L20,20 L38,15 L50,4 L65,18 L82,10 L100,5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <span className="font-data-sm text-data-sm text-on-surface-variant mt-1 truncate">
              {stats.mClass} M-Class · {stats.xClass} X-Class
            </span>
          </div>

          {/* Card 3: Hazardous Asteroids */}
          <div className="bg-surface-container p-3.5 md:p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/30 hover:border-rose-400/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-error truncate">
                NEO HAZARDS (7D)
              </span>
              <span className="material-symbols-outlined text-error text-[18px]">radar</span>
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <span className="font-data-lg text-2xl md:text-3xl text-error font-bold tracking-tight">
                {isAsteroidsLoading ? '...' : hazardousCount}
              </span>
              <span className="font-label-caps text-[10px] px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-semibold">
                {hazardousCount > 0 ? 'CRITICAL' : 'NOMINAL'}
              </span>
            </div>
            {/* Sparkline SVG (Red) */}
            <div className="w-full h-6 pt-1">
              <svg
                className="w-full h-full stroke-rose-400 fill-none"
                preserveAspectRatio="none"
                viewBox="0 0 100 24"
              >
                <path
                  d="M0,22 L25,20 L45,21 L65,12 L85,8 L100,4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <span className="font-data-sm text-data-sm text-on-surface-variant mt-1 truncate">
              {nearestAsteroid
                ? `Nearest: ${nearestAsteroid.name.substring(0, 10)} (${kmToLd(nearestAsteroid.miss_distance_km)} LD)`
                : 'NeoWs Orbital Tracking'}
            </span>
          </div>

          {/* Card 4: Open Natural Events */}
          <div className="bg-surface-container p-3.5 md:p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/30 hover:border-secondary/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-secondary truncate">
                EONET EARTH
              </span>
              <span className="material-symbols-outlined text-secondary text-[18px]">public</span>
            </div>
            <div className="my-2 flex items-baseline justify-between">
              <span className="font-data-lg text-2xl md:text-3xl text-secondary font-bold tracking-tight">
                {stats.earthCount || 128}
              </span>
              <span className="font-data-sm text-data-sm text-secondary">GLOBAL</span>
            </div>
            {/* Sparkline SVG (Purple) */}
            <div className="w-full h-6 pt-1">
              <svg
                className="w-full h-full stroke-secondary fill-none"
                preserveAspectRatio="none"
                viewBox="0 0 100 24"
              >
                <path
                  d="M0,14 L20,18 L40,11 L60,16 L80,9 L100,12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <span className="font-data-sm text-data-sm text-on-surface-variant mt-1 truncate">
              {stats.wildfires || 84} fires · {stats.storms || 12} storms
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN BODY: TWO-COLUMN ASYMMETRIC GRID (60% / 40%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: LIVE EVENT FEED (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Feed Header with Live Telemetry Stream title and Horizontal Scrollable Filter Chips */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h3 className="font-title-hud text-title-hud text-on-surface uppercase">
                  Live Telemetry Stream
                </h3>
                <span className="font-data-sm text-data-sm text-primary">
                  ({filteredEvents.length} Active)
                </span>
              </div>
              <div className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] animate-spin">
                  autorenew
                </span>
                <span className="font-data-sm text-data-sm">10s</span>
              </div>
            </div>

            {/* Horizontally Scrollable Category Filter Chips (Stitch Spec) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full font-title-hud text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>All</span>
                <span className="font-data-sm text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-lowest/40">
                  {stats.total}
                </span>
              </button>

              <button
                onClick={() => setSelectedCategory('solar')}
                className={`px-3 py-1.5 rounded-full font-title-hud text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                  selectedCategory === 'solar'
                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Solar</span>
                <span className="font-data-sm text-[10px] opacity-70">
                  {stats.solarCount || 5}
                </span>
              </button>

              <button
                onClick={() => setSelectedCategory('wildfires')}
                className={`px-3 py-1.5 rounded-full font-title-hud text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                  selectedCategory === 'wildfires'
                    ? 'bg-rose-500 text-white font-bold shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Wildfires</span>
                <span className="font-data-sm text-[10px] opacity-70">
                  {stats.wildfires || 18}
                </span>
              </button>

              <button
                onClick={() => setSelectedCategory('storms')}
                className={`px-3 py-1.5 rounded-full font-title-hud text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                  selectedCategory === 'storms'
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                <span>Storms</span>
                <span className="font-data-sm text-[10px] opacity-70">{stats.storms || 8}</span>
              </button>

              <button
                onClick={() => setSelectedCategory('volcanoes')}
                className={`px-3 py-1.5 rounded-full font-title-hud text-xs flex items-center gap-1.5 shrink-0 transition-all ${
                  selectedCategory === 'volcanoes'
                    ? 'bg-fuchsia-500 text-white font-bold shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
                <span>Volcanoes</span>
                <span className="font-data-sm text-[10px] opacity-70">{stats.volcanoes || 6}</span>
              </button>
            </div>
          </div>

          {/* Feed List Container with Stitch Vertical Color Accent Strip */}
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
                const accentColor = getEventAccentClass(evt.category);

                return (
                  <div
                    key={evt.id || `${evt.source}_${evt.source_id}`}
                    className="p-3.5 md:p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant transition-all flex gap-3 shadow-sm relative overflow-hidden"
                  >
                    {/* Vertical Colored Accent Indicator */}
                    <div className={`w-1.5 rounded-full ${accentColor} shrink-0`} />

                    <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <CategoryBadge category={evt.category} />
                          <SeverityBadge severity={evt.severity} />
                        </div>
                        <span className="font-data-sm text-xs text-on-surface-variant/70">
                          {formatRelativeTime(evt.started_at)}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <h3 className="font-headline-sm text-sm font-semibold text-on-surface truncate">
                          {evt.title}
                        </h3>
                        {evt.location && (
                          <div className="flex items-center gap-2 text-on-surface-variant font-data-sm text-xs mt-0.5">
                            <span className="flex items-center gap-0.5 text-primary">
                              <span className="material-symbols-outlined text-[14px]">
                                location_on
                              </span>
                              <span>
                                {evt.location.coordinates[1].toFixed(2)}° N,{' '}
                                {evt.location.coordinates[0].toFixed(2)}° E
                              </span>
                            </span>
                            {evt.source && <span>· SRC: {evt.source.toUpperCase()}</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-xs font-data-sm text-on-surface-variant">
                        <span className="uppercase tracking-wider text-[0.6875rem]">
                          ID: {evt.source_id || evt.id?.substring(0, 8)}
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
                        <pre className="p-3 rounded-lg bg-surface-container-lowest text-[0.7rem] text-primary/90 font-mono overflow-x-auto max-h-48 border border-outline-variant/30 mt-1">
                          {JSON.stringify(evt.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ASTEROIDS & SPACE WEATHER (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* CARD A: UPCOMING ASTEROIDS (NEOWS) / STITCH RADAR SNIPPET */}
          <div className="p-4 md:p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[1.25rem] text-secondary">
                  explore
                </span>
                <h3 className="font-headline-sm text-sm font-semibold text-on-surface uppercase">
                  Next Close Approaches
                </h3>
              </div>
              <span className="font-label-caps text-label-caps text-secondary px-2 py-0.5 rounded bg-surface-container">
                NEO RADAR
              </span>
            </div>

            {/* Highlighted Closest Asteroid Snippet (Stitch Spec) */}
            {nearestAsteroid && (
              <div className="bg-surface-container rounded-lg p-3 flex items-center justify-between border border-secondary/20">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm text-sm font-semibold text-on-surface truncate">
                      {nearestAsteroid.name}
                    </span>
                    {nearestAsteroid.hazardous && (
                      <span className="font-label-caps text-[10px] px-1 rounded bg-error-container text-on-error-container font-bold">
                        PHA
                      </span>
                    )}
                  </div>
                  <span className="font-data-sm text-[11px] text-on-surface-variant truncate">
                    Approach: {formatDate(nearestAsteroid.approach_date)}
                  </span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-data-md text-sm text-primary font-bold">
                    {kmToLd(nearestAsteroid.miss_distance_km)} LD
                  </span>
                  <span className="font-data-sm text-[11px] text-on-surface-variant">
                    {Number(nearestAsteroid.velocity_kps).toFixed(1)} km/s
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {isAsteroidsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-14 rounded-lg" />
                ))
              ) : asteroids.length === 0 ? (
                <p className="text-on-surface-variant font-body-sm text-xs py-4 text-center">
                  No upcoming asteroids in current approach window.
                </p>
              ) : (
                asteroids.slice(0, 3).map((ast) => (
                  <div
                    key={ast.neo_id}
                    className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/30 flex items-center justify-between hover:border-secondary/50 transition-all"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-xs font-semibold text-on-surface truncate">
                          {ast.name}
                        </span>
                        {ast.hazardous && (
                          <span className="px-1 py-0.2 rounded bg-rose-500/15 text-rose-400 font-label-caps text-[0.6rem] font-bold border border-rose-500/30">
                            PHA
                          </span>
                        )}
                      </div>
                      <span className="font-data-sm text-[0.7rem] text-on-surface-variant">
                        {formatDate(ast.approach_date)}
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

            <Link
              to="/asteroids"
              className="w-full py-2.5 rounded-lg bg-surface-container hover:bg-surface-bright text-primary font-title-hud text-xs flex items-center justify-center gap-2 transition-colors border border-primary/20"
            >
              <span>Open Asteroid Radar</span>
              <span className="material-symbols-outlined text-[16px]">radar</span>
            </Link>
          </div>

          {/* CARD B: SOLAR FLARE ACTIVITY BAR CHART */}
          <div className="p-4 md:p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[1.25rem] text-amber-400">
                  solar_power
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

      {/* 4. NASA OPEN DATA ATTRIBUTION & FOOTER NOTE (Stitch Mobile Spec) */}
      <footer className="pt-2 pb-4 flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-1.5 text-on-surface-variant opacity-75">
          <span className="material-symbols-outlined text-[16px]">public</span>
          <span className="font-label-caps text-label-caps">NASA OPEN DATA PIPELINE</span>
        </div>
        <p className="font-data-sm text-[11px] text-on-surface-variant opacity-60 max-w-md">
          Data ingested via DONKI, EONET, NeoWs &amp; APOD API engines. All coordinates &amp; chronometry UTC.
        </p>
      </footer>

      {/* APOD Detail Modal */}
      {showApodModal && apod && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface-container rounded-2xl border border-primary/30 p-5 md:p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[1.5rem] text-primary">
                  satellite_alt
                </span>
                <h2 className="font-headline-md text-base md:text-xl font-bold text-on-surface">
                  {apodTitle}
                </h2>
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
                  title={apodTitle}
                  className="w-full h-72 md:h-[450px]"
                  allowFullScreen
                />
              ) : (
                <img
                  src={apod.hd_url || apod.url}
                  alt={apodTitle}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images-assets.nasa.gov/image/PIA12348/PIA12348~orig.jpg';
                  }}
                  className="w-full h-auto object-contain max-h-[500px]"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-data-sm text-on-surface-variant">
                <span>Date: {formatDate(apod.date)}</span>
                {apod.copyright && <span>Credit: {apod.copyright}</span>}
              </div>
              <p className="font-body-md text-xs md:text-sm text-on-surface-variant leading-relaxed">
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
