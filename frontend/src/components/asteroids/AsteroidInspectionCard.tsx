import React from 'react';
import { Link } from 'react-router-dom';
import type { Asteroid } from '@/types';
import { kmToLd, formatKm, formatDate } from '@/lib/utils';

interface AsteroidInspectionCardProps {
  asteroid: Asteroid | null;
  onClose: () => void;
}

export const AsteroidInspectionCard: React.FC<AsteroidInspectionCardProps> = ({
  asteroid,
  onClose,
}) => {
  if (!asteroid) return null;

  const ld = kmToLd(asteroid.miss_distance_km);
  const minD = Math.round(Number(asteroid.diameter_min_m) || 0);
  const maxD = Math.round(Number(asteroid.diameter_max_m) || 0);

  return (
    <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[1.25rem] text-secondary">
            satellite
          </span>
          <span className="font-title-hud text-xs text-secondary tracking-widest uppercase">
            NEO TELEMETRY INSPECTION
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[1.125rem]">close</span>
        </button>
      </div>

      {/* Target Designation & Hazard Pill */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-data-sm text-[0.625rem] text-on-surface-variant uppercase">
            OBJECT DESIGNATION
          </span>
          <h2 className="font-headline-md text-xl font-bold text-on-surface">{asteroid.name}</h2>
          <span className="font-data-sm text-xs text-on-surface-variant">
            NASA JPL ID: {asteroid.neo_id}
          </span>
        </div>

        {asteroid.hazardous ? (
          <span className="px-2.5 py-1 rounded bg-rose-500/15 text-rose-400 font-label-caps text-xs font-bold border border-rose-500/30 animate-pulse">
            PHA HAZARDOUS
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-label-caps text-xs border border-emerald-500/20">
            SAFE ORBIT
          </span>
        )}
      </div>

      {/* Telemetry Metric Grid */}
      <div className="grid grid-cols-2 gap-2.5 font-data-sm">
        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col">
          <span className="text-on-surface-variant text-[0.625rem] uppercase">MISS DISTANCE</span>
          <span className="text-secondary font-bold text-base">{ld} LD</span>
          <span className="text-on-surface-variant/70 text-[0.6875rem]">
            {formatKm(asteroid.miss_distance_km)}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col">
          <span className="text-on-surface-variant text-[0.625rem] uppercase">APPROACH VELOCITY</span>
          <span className="text-primary font-bold text-base">
            {Number(asteroid.velocity_kps).toFixed(1)} km/s
          </span>
          <span className="text-on-surface-variant/70 text-[0.6875rem]">Relative to Earth</span>
        </div>

        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col">
          <span className="text-on-surface-variant text-[0.625rem] uppercase">ESTIMATED DIAMETER</span>
          <span className="text-on-surface font-bold text-base">
            {minD} - {maxD} m
          </span>
          <span className="text-on-surface-variant/70 text-[0.6875rem]">Optical Extinction</span>
        </div>

        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col">
          <span className="text-on-surface-variant text-[0.625rem] uppercase">CLOSE APPROACH DATE</span>
          <span className="text-on-surface font-bold text-sm">
            {formatDate(asteroid.approach_date)}
          </span>
          <span className="text-on-surface-variant/70 text-[0.6875rem]">Perigee Window</span>
        </div>
      </div>

      {/* Planetary Defense Assessment */}
      <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/20 flex flex-col gap-1 text-xs">
        <span className="font-label-caps text-[0.625rem] text-primary uppercase tracking-wider">
          Planetary Defense Sentry Assessment
        </span>
        <p className="font-body-sm text-on-surface-variant leading-relaxed">
          {asteroid.hazardous
            ? 'Flagged by NASA Center for Near-Earth Object Studies (CNEOS) due to optical diameter exceeding 140m and orbital intersection distance within 0.05 AU.'
            : 'Nominal trajectory with zero terrestrial impact probability within current ephemeris epoch.'}
        </p>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between gap-3">
        <Link
          to={`/alerts?type=asteroid&hazardousOnly=${asteroid.hazardous}&maxMissDistanceKm=${Math.round(Number(asteroid.miss_distance_km))}`}
          className="flex-1 py-2 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-xs font-semibold hover:bg-primary transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary-container/20"
        >
          <span className="material-symbols-outlined text-[1rem]">notification_add</span>
          <span>Set Alert Rule for this Target</span>
        </Link>
      </div>
    </div>
  );
};
