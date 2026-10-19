import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBirthdayData } from '@/lib/api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const BirthdayPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('2000-01-01');
  const [activeDate, setActiveDate] = useState<string>('2000-01-01');

  const {
    data: birthdayRes,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cosmic-birthday', activeDate],
    queryFn: () => getBirthdayData(activeDate),
    enabled: !!activeDate,
  });

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDate) {
      setActiveDate(selectedDate);
    }
  };

  const birthdayData = birthdayRes?.data;
  const profile = birthdayData?.cosmicProfile;
  const apod = birthdayData?.apod;
  const epic = birthdayData?.epic;

  const presets = [
    { label: 'Apollo 11 Moon Landing', date: '1969-07-20' },
    { label: 'Hubble Deployment', date: '1990-04-24' },
    { label: 'Millennium Y2K', date: '2000-01-01' },
    { label: 'Curiosity Mars Landing', date: '2012-08-06' },
    { label: 'James Webb Space Telescope', date: '2021-12-25' },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary-container text-xl animate-pulse">
              cake
            </span>
            <span className="text-xs font-title-hud text-primary-container tracking-widest uppercase">
              DEEP SPACE TIME CAPSULE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-headline-sm text-on-surface tracking-wider">
            Cosmic Birthday Explorer
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Discover what NASA's telescopes, planetary probes, and Earth satellites observed on your
            birthday.
          </p>
        </div>

        {/* Date Selector Form */}
        <form onSubmit={handleScan} className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 focus-within:border-primary-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              calendar_month
            </span>
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-on-surface font-title-hud focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary-container text-sm font-title-hud tracking-wider hover:brightness-110 transition shadow-md shadow-primary-container/20"
          >
            <span className="material-symbols-outlined text-lg">travel_explore</span>
            <span>SCAN COSMOS</span>
          </button>
        </form>
      </div>

      {/* Historical Milestones Quick Chips */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-xs text-on-surface-variant/70 uppercase tracking-widest font-title-hud mr-1">
          Historical Presets:
        </span>
        {presets.map((preset) => (
          <button
            key={preset.date}
            onClick={() => {
              setSelectedDate(preset.date);
              setActiveDate(preset.date);
            }}
            className={`px-3 py-1 rounded-full text-xs font-title-hud border transition-all ${
              activeDate === preset.date
                ? 'bg-primary-container/20 border-primary-container text-primary-container shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                : 'bg-surface-container-low border-outline-variant/40 text-on-surface-variant hover:border-primary-container/50 hover:text-on-surface'
            }`}
          >
            {preset.label} ({preset.date})
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 gap-4">
          <LoadingSpinner />
          <p className="text-sm font-title-hud text-primary-container tracking-widest animate-pulse">
            CALIBRATING LAGRANGE & HUBBLE OBSERVATORIES...
          </p>
        </div>
      )}

      {isError && (
        <div className="p-6 rounded-xl bg-error/10 border border-error/30 text-error flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl">error</span>
          <div>
            <p className="text-sm font-bold">Failed to load cosmic birthday telemetry</p>
            <p className="text-xs opacity-80">{(error as any)?.message || 'Unknown network error'}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="ml-auto px-3 py-1 rounded-lg bg-error/20 text-xs font-title-hud hover:bg-error/30 transition"
          >
            RETRY
          </button>
        </div>
      )}

      {birthdayData && (
        <>
          {/* Cosmic Planetary Profile Matrix */}
          {profile && (
            <div className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container">
                    auto_awesome
                  </span>
                  <h2 className="text-lg font-headline-sm text-on-surface">
                    Cosmic Journey & Planetary Ages
                  </h2>
                </div>
                <span className="text-xs font-title-hud text-on-surface-variant uppercase tracking-wider">
                  Target Date: {birthdayData.date}
                </span>
              </div>

              {/* Journey Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/30 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary-container/10 border border-primary-container/30 flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-2xl">timelapse</span>
                  </div>
                  <div>
                    <span className="text-xs text-on-surface-variant font-title-hud tracking-wider uppercase">
                      Days Traveling Space
                    </span>
                    <p className="text-2xl font-bold font-title-hud text-primary-container">
                      {profile.daysAlive.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-on-surface-variant">days</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/30 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <span className="material-symbols-outlined text-2xl">speed</span>
                  </div>
                  <div>
                    <span className="text-xs text-on-surface-variant font-title-hud tracking-wider uppercase">
                      Orbit Distance Around Sun
                    </span>
                    <p className="text-2xl font-bold font-title-hud text-emerald-400">
                      {(profile.distanceAroundSunKm / 1e9).toFixed(2)}{' '}
                      <span className="text-xs font-normal text-on-surface-variant">Billion km</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-lowest/80 border border-outline-variant/30 flex items-center gap-4 md:col-span-2 lg:col-span-1">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <span className="material-symbols-outlined text-2xl">public</span>
                  </div>
                  <div>
                    <span className="text-xs text-on-surface-variant font-title-hud tracking-wider uppercase">
                      Earth Orbit Completions
                    </span>
                    <p className="text-2xl font-bold font-title-hud text-purple-400">
                      {profile.earthYears}{' '}
                      <span className="text-xs font-normal text-on-surface-variant">solar years</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Planetary Age Orbit Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-surface-container-lowest/50 border border-outline-variant/20 flex flex-col items-center text-center">
                  <span className="text-[11px] font-title-hud text-amber-400 uppercase">
                    Mercury
                  </span>
                  <span className="text-xl font-bold font-title-hud text-on-surface mt-1">
                    {profile.mercuryYears}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">88-day orbit</span>
                </div>

                <div className="p-3 rounded-lg bg-surface-container-lowest/50 border border-outline-variant/20 flex flex-col items-center text-center">
                  <span className="text-[11px] font-title-hud text-orange-400 uppercase">Venus</span>
                  <span className="text-xl font-bold font-title-hud text-on-surface mt-1">
                    {profile.venusYears}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">225-day orbit</span>
                </div>

                <div className="p-3 rounded-lg bg-surface-container-lowest/50 border border-outline-variant/20 flex flex-col items-center text-center">
                  <span className="text-[11px] font-title-hud text-red-400 uppercase">Mars</span>
                  <span className="text-xl font-bold font-title-hud text-on-surface mt-1">
                    {profile.marsYears}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">687-day orbit</span>
                </div>

                <div className="p-3 rounded-lg bg-surface-container-lowest/50 border border-outline-variant/20 flex flex-col items-center text-center">
                  <span className="text-[11px] font-title-hud text-amber-200 uppercase">Jupiter</span>
                  <span className="text-xl font-bold font-title-hud text-on-surface mt-1">
                    {profile.jupiterYears}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">11.9-yr orbit</span>
                </div>

                <div className="p-3 rounded-lg bg-surface-container-lowest/50 border border-outline-variant/20 flex flex-col items-center text-center">
                  <span className="text-[11px] font-title-hud text-yellow-500 uppercase">Saturn</span>
                  <span className="text-xl font-bold font-title-hud text-on-surface mt-1">
                    {profile.saturnYears}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">29.5-yr orbit</span>
                </div>
              </div>
            </div>
          )}

          {/* Visual Showcase: APOD & EPIC Earth View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Astronomy Picture of the Day */}
            {apod && (
              <div className="flex flex-col rounded-2xl bg-surface-container-low border border-outline-variant/30 overflow-hidden">
                <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-lowest/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-container">
                      telescope
                    </span>
                    <h3 className="text-base font-headline-sm text-on-surface">
                      Astronomy Picture of the Day
                    </h3>
                  </div>
                  <span className="text-xs font-title-hud text-primary-container px-2 py-0.5 rounded bg-primary-container/10 border border-primary-container/30">
                    {apod.date}
                  </span>
                </div>

                <div className="relative aspect-video bg-black/60 overflow-hidden group">
                  {apod.media_type === 'video' ? (
                    <iframe
                      src={apod.url}
                      title={apod.title}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : (
                    <img
                      src={apod.hd_url || apod.url}
                      alt={apod.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images-assets.nasa.gov/image/PIA12348/PIA12348~orig.jpg';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  {apod.copyright && (
                    <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-[10px] text-on-surface-variant font-mono backdrop-blur-sm">
                      © {apod.copyright}
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col gap-2">
                  <h4 className="text-lg font-bold text-on-surface font-headline-sm leading-snug">
                    {apod.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-6">
                    {apod.explanation}
                  </p>
                  {apod.hd_url && apod.media_type !== 'video' && (
                    <a
                      href={apod.hd_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary-container font-title-hud hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      VIEW FULL RESOLUTION
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* EPIC Earth Polychromatic Camera */}
            {epic && (
              <div className="flex flex-col rounded-2xl bg-surface-container-low border border-outline-variant/30 overflow-hidden">
                <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-lowest/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400">public</span>
                    <h3 className="text-base font-headline-sm text-on-surface">
                      DSCOVR EPIC Earth Observatory
                    </h3>
                  </div>
                  <span className="text-xs font-title-hud text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                    Lagrange 1 (1M mi)
                  </span>
                </div>

                <div className="relative aspect-video bg-black flex items-center justify-center p-4 overflow-hidden group">
                  <img
                    src={epic.imageUrl}
                    alt="NASA DSCOVR Earth"
                    className="max-h-full object-contain drop-shadow-[0_0_25px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback if image path was not archived
                      (e.target as HTMLImageElement).src =
                        'https://epic.gsfc.nasa.gov/archive/natural/2024/01/01/png/epic_1b_20240101003633.png';
                    }}
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-title-hud text-emerald-400">
                    FULL DISC SUNLIT VIEW
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-2">
                  <h4 className="text-lg font-bold text-on-surface font-headline-sm leading-snug">
                    Planet Earth from 1,000,000 Miles
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {epic.caption ||
                      'Captured by the NASA Earth Polychromatic Imaging Camera (EPIC) aboard NOAA DSCOVR satellite in orbit around the Sun-Earth L1 Lagrange point.'}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-on-surface-variant/80 font-title-hud pt-2 border-t border-outline-variant/20 mt-1">
                    <span>STATUS: ACTIVE OBSERVATION</span>
                    <span>SPECTRAL: 10 NARROWBAND CHANNELS</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Historical Anniversary Space & Earth Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Natural Hazards on this Date */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-amber-400">warning</span>
                <h3 className="text-base font-headline-sm text-on-surface">
                  Historical Earth Events on {birthdayData.date.slice(5)}
                </h3>
              </div>
              {birthdayData.anniversaryEvents.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-4 italic">
                  No major hazard events cataloged on this day in active telemetry.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {birthdayData.anniversaryEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/20 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-bold text-on-surface">{evt.title}</span>
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                          <span className="uppercase">{evt.category}</span>
                          <span>•</span>
                          <span>{new Date(evt.started_at).getFullYear()}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-title-hud bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                        {evt.severity || 'Recorded'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Asteroid Close Encounters on this Date */}
            <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-primary-container">radar</span>
                <h3 className="text-base font-headline-sm text-on-surface">
                  Asteroid Encounters on {birthdayData.date.slice(5)}
                </h3>
              </div>
              {birthdayData.anniversaryAsteroids.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-4 italic">
                  No close-approach asteroids cataloged on this day in current radar sweeps.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {birthdayData.anniversaryAsteroids.map((ast) => (
                    <div
                      key={ast.neo_id}
                      className="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/20 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-bold text-on-surface">{ast.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                          <span>Miss: {(Number(ast.miss_distance_km) / 1e6).toFixed(2)}M km</span>
                          <span>•</span>
                          <span>Speed: {Number(ast.velocity_kps).toFixed(1)} km/s</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-title-hud border uppercase ${
                          ast.hazardous
                            ? 'bg-error/10 text-error border-error/30'
                            : 'bg-primary-container/10 text-primary-container border-primary-container/30'
                        }`}
                      >
                        {ast.hazardous ? 'Hazardous' : 'Benign'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
