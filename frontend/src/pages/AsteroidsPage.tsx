import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAsteroids } from '@/lib/api';
import { AsteroidRadar3D } from '@/components/asteroids/AsteroidRadar3D';
import { AsteroidTable } from '@/components/asteroids/AsteroidTable';
import { AsteroidDateSlider } from '@/components/asteroids/AsteroidDateSlider';
import { AsteroidInspectionCard } from '@/components/asteroids/AsteroidInspectionCard';
import { kmToLd, formatDate } from '@/lib/utils';
import type { Asteroid } from '@/types';

export const AsteroidsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'3d' | 'table'>('3d');
  const [selectedAsteroid, setSelectedAsteroid] = useState<Asteroid | null>(null);
  const [hoveredAsteroid, setHoveredAsteroid] = useState<Asteroid | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [currentDayOffset, setCurrentDayOffset] = useState<number>(0);

  // Fetch 7-day window
  const { data: asteroidsResponse, isLoading } = useQuery({
    queryKey: ['asteroids', '7days'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      return getAsteroids({ from: today, to: nextWeek });
    },
    refetchInterval: 60000,
  });

  const allAsteroids = asteroidsResponse?.data || [];

  // Filter asteroids by the selected scrub day offset (or all if offset === 0 or showing range)
  const targetDateStr = new Date(Date.now() + currentDayOffset * 86400000).toISOString().split('T')[0];

  const displayedAsteroids = useMemo(() => {
    if (currentDayOffset === 0) return allAsteroids;
    return allAsteroids.filter((ast) => ast.approach_date <= targetDateStr);
  }, [allAsteroids, currentDayOffset, targetDateStr]);

  const hazardousCount = allAsteroids.filter((a) => a.hazardous).length;
  const closestAsteroid = useMemo(() => {
    if (allAsteroids.length === 0) return null;
    return [...allAsteroids].sort((a, b) => Number(a.miss_distance_km) - Number(b.miss_distance_km))[0];
  }, [allAsteroids]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Telemetry Status Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
              3D Asteroid Radar (NeoWs)
            </h1>
          </div>
          <p className="font-body-md text-xs text-on-surface-variant">
            Planetary Defense Telemetry · Real-time Trajectory Mapping (1 LD = 384,400 km)
          </p>
        </div>

        {/* View Switcher: 3D Radar vs Data Table */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="grid grid-cols-2 p-1 rounded-lg bg-surface-container border border-outline-variant/30 text-xs font-label-caps">
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === '3d'
                  ? 'bg-secondary text-[#070b14] font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[1rem]">3d_rotation</span>
              <span>3D Radar</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-secondary text-[#070b14] font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[1rem]">table_chart</span>
              <span>Table View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sentry Planetary Defense Risk Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-caps text-[0.6875rem] text-on-surface-variant uppercase">
              Tracked 7D Approaches
            </span>
            <span className="font-data-lg text-2xl font-bold text-on-surface mt-1">
              {isLoading ? '...' : allAsteroids.length} Objects
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[1.5rem]">radar</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-caps text-[0.6875rem] text-rose-400 uppercase font-semibold">
              Potentially Hazardous (PHA)
            </span>
            <span className="font-data-lg text-2xl font-bold text-rose-400 mt-1">
              {hazardousCount} Asteroids
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
            <span className="material-symbols-outlined text-[1.5rem]">warning</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-caps text-[0.6875rem] text-primary uppercase">
              Closest Approach Perigee
            </span>
            <span className="font-data-lg text-xl font-bold text-primary mt-1">
              {closestAsteroid ? `${kmToLd(closestAsteroid.miss_distance_km)} LD` : 'N/A'}
            </span>
            <span className="font-data-sm text-[0.65rem] text-on-surface-variant truncate max-w-[150px]">
              {closestAsteroid?.name}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[1.5rem]">near_me</span>
          </div>
        </div>
      </div>

      {/* Date Slider Scrub Control */}
      <AsteroidDateSlider
        currentDayOffset={currentDayOffset}
        onChangeOffset={setCurrentDayOffset}
      />

      {/* Main Content Arena */}
      {viewMode === '3d' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left/Center: 3D Scene Viewport */}
          <div className="lg:col-span-8 flex flex-col gap-3 relative">
            <AsteroidRadar3D
              asteroids={displayedAsteroids}
              selectedAsteroid={selectedAsteroid}
              onSelectAsteroid={setSelectedAsteroid}
              onHoverAsteroid={(ast, pos) => {
                setHoveredAsteroid(ast);
                setHoverPos(pos);
              }}
            />

            {/* Hover Tooltip Overlay */}
            {hoveredAsteroid && hoverPos && (
              <div
                className="fixed z-50 pointer-events-none p-3 rounded-xl bg-surface-container/95 border border-primary/40 backdrop-blur-md shadow-2xl flex flex-col gap-1 -translate-x-1/2 -translate-y-full mb-3"
                style={{ left: hoverPos.x, top: hoverPos.y }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-xs font-bold text-on-surface">
                    {hoveredAsteroid.name}
                  </span>
                  {hoveredAsteroid.hazardous && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-label-caps text-[0.6rem] font-bold">
                      PHA
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[0.6875rem] font-data-sm text-on-surface-variant">
                  <span>Distance: <b className="text-secondary">{kmToLd(hoveredAsteroid.miss_distance_km)} LD</b></span>
                  <span>Speed: <b className="text-primary">{Number(hoveredAsteroid.velocity_kps).toFixed(1)} km/s</b></span>
                </div>
                <span className="text-[0.65rem] font-data-sm text-on-surface-variant/80">
                  Perigee: {formatDate(hoveredAsteroid.approach_date)}
                </span>
              </div>
            )}
          </div>

          {/* Right: Inspection Card / Quick Telemetry Matrix */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {selectedAsteroid ? (
              <AsteroidInspectionCard
                asteroid={selectedAsteroid}
                onClose={() => setSelectedAsteroid(null)}
              />
            ) : (
              <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
                <span className="material-symbols-outlined text-[2.5rem] text-secondary/40">
                  radar
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                    Target Identification Standby
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant max-w-xs">
                    Click any asteroid in the 3D radar arena or scrub the timeline to inspect physical
                    properties and impact probabilities.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Accessible Fallback Table View */
        <AsteroidTable
          asteroids={displayedAsteroids}
          selectedAsteroid={selectedAsteroid}
          onSelectAsteroid={setSelectedAsteroid}
        />
      )}
    </div>
  );
};
