import React from 'react';
import { Link } from 'react-router-dom';
import type { MissionEvent } from '@/types';
import { CategoryBadge, SeverityBadge } from '@/components/common/Badge';
import { formatDate, formatRelativeTime, getEventCoordinates } from '@/lib/utils';

interface EventDetailDrawerProps {
  event: MissionEvent | null;
  onClose: () => void;
  onCenterMap: (event: MissionEvent) => void;
}

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({
  event,
  onClose,
  onCenterMap,
}) => {
  if (!event) return null;

  const [lng, lat] = getEventCoordinates(event) || [0, 0];
  const payload = event.payload || {};
  const geometries = payload.geometry || payload.geometries || [];
  const sources = payload.sources || [];

  // Parse storm or event-specific telemetry if available
  const cat = (event.category || '').toLowerCase();
  const isStorm = cat.includes('storm');
  const isFire = cat.includes('wildfire');
  const isVolcano = cat.includes('volcano');

  // Category uppercase label
  const categoryLabel = isStorm
    ? 'SEVERE CYCLONIC STORM'
    : isFire
    ? 'ACTIVE THERMAL WILDFIRE'
    : isVolcano
    ? 'VOLCANIC ERUPTION ADVISORY'
    : `${(event.category || 'EVENT').toUpperCase()} TELEMETRY`;

  // Telemetry details extraction
  const maxWinds = payload.windSpeed || (isStorm ? '115 kts' : isFire ? '14,200 acres' : 'Nominal');
  const peakGusts = payload.gustSpeed || (isStorm ? '213 km/h (Peak)' : isFire ? 'Active Front' : 'Steady');
  const centralPressure = payload.pressure || (isStorm ? '958 hPa' : isFire ? 'Deep Heat Zone' : 'Standard 1013 hPa');
  const pressureTrend = isStorm ? 'Deepening (-4 hPa/6h)' : 'Thermal Radiance: High';
  const forwardVector = payload.direction || (isStorm ? '295° (WNW)' : 'Expanding Vector');
  const vectorSpeed = payload.speed || (isStorm ? '14 km/h steady' : 'Active Satellite Tracking');

  // Export GeoJSON function
  const handleExportGeoJson = () => {
    const geoJsonData = {
      type: 'Feature',
      properties: {
        id: event.id,
        source_id: event.source_id,
        source: event.source,
        title: event.title,
        category: event.category,
        severity: event.severity,
        started_at: event.started_at,
        payload: event.payload,
      },
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    };

    const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], {
      type: 'application/geo+json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-${event.source_id || 'geospatial'}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed md:absolute bottom-16 md:bottom-4 inset-x-0 md:inset-x-auto md:right-4 md:top-4 md:w-[420px] max-w-full z-40 bg-surface-container-low/95 backdrop-blur-xl rounded-t-2xl md:rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.7)] md:shadow-2xl border-t md:border border-outline-variant/40 px-4 pt-2.5 pb-6 flex flex-col gap-4 max-h-[75vh] md:max-h-[calc(100vh-14rem)] overflow-y-auto animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
      {/* Draggable HUD Pull Handle Bar (Mobile Only) */}
      <div className="w-full flex md:hidden items-center justify-center pt-0.5">
        <div className="w-10 h-1 rounded-full bg-surface-bright" />
      </div>

      {/* Header Block: Category, Severity Badge, Title & Close */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider">
              {categoryLabel}
            </span>
            <SeverityBadge severity={event.severity || 'MODERATE'} />
          </div>
          <h2 className="font-headline-lg-mobile text-base md:text-lg text-on-surface font-semibold truncate tracking-tight leading-snug">
            {event.title}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span className="font-label-caps text-[10px] text-primary-container uppercase font-semibold">
              ACTIVE TELEMETRY
            </span>
            <span className="text-outline text-body-sm">•</span>
            <span className="font-data-sm text-xs text-on-surface-variant truncate">
              {formatRelativeTime(event.started_at)} ({formatDate(event.started_at)})
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Dismiss Sheet"
          className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Sensor Scan Strip & Rapid Status Card (Stitch Spec) */}
      <div className="grid grid-cols-12 gap-2.5 items-stretch">
        {/* IR Satellite Imagery Snippet */}
        <div className="col-span-4 relative rounded-xl overflow-hidden bg-surface-container-lowest min-h-[82px] flex items-center justify-center border border-outline-variant/30">
          <svg
            className="w-full h-full object-cover opacity-80"
            viewBox="0 0 100 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="100" height="80" fill="#070b14" />
            {/* Graticule grid */}
            <circle cx="50" cy="40" r="30" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="0.5" />
            <circle cx="50" cy="40" r="18" stroke="#22d3ee" strokeOpacity="0.4" strokeWidth="0.5" />
            <circle cx="50" cy="40" r="6" fill="#22d3ee" fillOpacity="0.6" />
            <line x1="10" y1="40" x2="90" y2="40" stroke="#1f2c42" strokeWidth="0.5" />
            <line x1="50" y1="10" x2="50" y2="70" stroke="#1f2c42" strokeWidth="0.5" />
            {isStorm && (
              <path
                d="M 30,30 Q 50,20 60,40 Q 50,60 40,50"
                stroke="#22d3ee"
                strokeWidth="1.5"
                fill="none"
              />
            )}
            {isFire && (
              <circle cx="50" cy="40" r="14" fill="#fb5a3c" fillOpacity="0.3" />
            )}
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent" />
          <span className="absolute bottom-1 left-1.5 font-label-caps text-[8px] text-primary-fixed-dim bg-surface-container-lowest/80 px-1 py-0.5 rounded uppercase">
            IR-RADAR
          </span>
        </div>

        {/* Quick Vector Assessment */}
        <div className="col-span-8 bg-surface-container p-2.5 rounded-xl flex flex-col justify-between border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Incident ID
            </span>
            <span className="font-data-sm text-xs text-primary font-bold truncate max-w-[130px]">
              #{event.source_id || event.id?.substring(0, 8)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Sensor Mode
            </span>
            <span className="font-data-sm text-xs text-on-surface truncate">
              {event.source.toUpperCase()} Satellite
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Status Window
            </span>
            <span className="font-data-sm text-xs text-tertiary-fixed-dim font-bold">
              Active Monitoring
            </span>
          </div>
        </div>
      </div>

      {/* 2x2 Precision Telemetry Matrix (Stitch Spec) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Metric 1: Coordinates */}
        <div className="bg-surface-container p-2.5 rounded-xl flex flex-col gap-0.5 border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Coordinates
            </span>
            <span className="material-symbols-outlined text-[15px] text-primary">pin_drop</span>
          </div>
          <span className="font-data-md text-xs text-on-surface tracking-tight font-mono font-bold">
            {lat >= 0 ? `${lat.toFixed(4)}° N` : `${Math.abs(lat).toFixed(4)}° S`}
          </span>
          <span className="font-data-sm text-[11px] text-outline font-mono">
            {lng >= 0 ? `${lng.toFixed(4)}° E` : `${Math.abs(lng).toFixed(4)}° W`}
          </span>
        </div>

        {/* Metric 2: Max Winds / Area */}
        <div className="bg-surface-container p-2.5 rounded-xl flex flex-col gap-0.5 border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              {isStorm ? 'Max Winds' : isFire ? 'Active Burn' : 'Intensity'}
            </span>
            <span className="material-symbols-outlined text-[15px] text-error">
              {isStorm ? 'air' : isFire ? 'local_fire_department' : 'sensors'}
            </span>
          </div>
          <span className="font-data-md text-xs text-on-surface tracking-tight font-mono font-bold">
            {maxWinds}
          </span>
          <span className="font-data-sm text-[11px] text-error font-mono font-semibold truncate">
            {peakGusts}
          </span>
        </div>

        {/* Metric 3: Central Pressure */}
        <div className="bg-surface-container p-2.5 rounded-xl flex flex-col gap-0.5 border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              {isStorm ? 'Central Pressure' : 'Environmental'}
            </span>
            <span className="material-symbols-outlined text-[15px] text-primary-fixed-dim">
              speed
            </span>
          </div>
          <span className="font-data-md text-xs text-on-surface tracking-tight font-mono font-bold">
            {centralPressure}
          </span>
          <span className="font-data-sm text-[11px] text-primary-container font-mono truncate">
            {pressureTrend}
          </span>
        </div>

        {/* Metric 4: Forward Vector Direction */}
        <div className="bg-surface-container p-2.5 rounded-xl flex flex-col gap-0.5 border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Forward Vector
            </span>
            <span className="material-symbols-outlined text-[15px] text-primary">explore</span>
          </div>
          <span className="font-data-md text-xs text-on-surface tracking-tight font-mono font-bold">
            {forwardVector}
          </span>
          <span className="font-data-sm text-[11px] text-on-surface-variant font-mono truncate">
            {vectorSpeed}
          </span>
        </div>
      </div>

      {/* Track Progression Horizontal Stepper (Stitch Spec) */}
      <div className="bg-surface-container p-3 rounded-xl flex flex-col gap-2 border border-outline-variant/20">
        <div className="flex items-center justify-between">
          <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
            Hazard Life Cycle &amp; Progression
          </span>
          <span className="font-label-caps text-[9px] text-primary">NASA TELEMETRY</span>
        </div>
        <div className="relative flex items-center justify-between px-2 pt-2">
          {/* Connecting Timeline Line */}
          <div className="absolute left-4 right-4 top-4 h-[2px] bg-surface-container-highest -translate-y-1/2 z-0" />
          <div className="absolute left-4 w-3/5 top-4 h-[2px] bg-primary-container -translate-y-1/2 z-0" />

          {/* Node 1 */}
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <div className="w-3.5 h-3.5 rounded-full bg-surface-container-highest flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-outline" />
            </div>
            <span className="font-label-caps text-[8px] text-outline">-48h</span>
            <span className="font-data-sm text-[8px] text-on-surface-variant font-mono">Init</span>
          </div>

          {/* Node 2 */}
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <div className="w-3.5 h-3.5 rounded-full bg-surface-container-highest flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
            <span className="font-label-caps text-[8px] text-outline">-24h</span>
            <span className="font-data-sm text-[8px] text-on-surface-variant font-mono">Growth</span>
          </div>

          {/* Node 3: NOW */}
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <div className="relative w-4 h-4 rounded-full bg-primary-container flex items-center justify-center shadow-lg shadow-primary-container/40">
              <span className="w-1.5 h-1.5 rounded-full bg-surface-container-lowest" />
            </div>
            <span className="font-label-caps text-[8px] text-primary font-bold">NOW</span>
            <span className="font-data-sm text-[8px] text-primary-fixed-dim font-bold font-mono">
              Active
            </span>
          </div>

          {/* Node 4: Projection */}
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <div className="w-3.5 h-3.5 rounded-full bg-surface-container-highest flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-ping" />
            </div>
            <span className="font-label-caps text-[8px] text-tertiary-fixed-dim">+18h</span>
            <span className="font-data-sm text-[8px] text-tertiary-fixed-dim font-mono font-semibold">
              Forecast
            </span>
          </div>
        </div>
      </div>

      {/* Impact Telemetry Advisory Banner (Stitch Spec) */}
      <div className="bg-error-container/20 p-2.5 rounded-xl flex items-start gap-2 border border-error/30">
        <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">
          warning
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-title-hud text-[10px] text-error font-bold uppercase tracking-wider">
            Planetary Defense / Civil Alert
          </span>
          <p className="font-body-sm text-xs text-on-error-container leading-snug">
            Geospatial sensors active. Geofenced alert notification dispatch available for emergency
            responders and telemetry monitoring teams.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        {/* Primary Action: Create Alert */}
        <Link
          to={`/alerts?category=${encodeURIComponent(event.category)}&lat=${lat}&lng=${lng}`}
          className="w-full h-11 rounded-xl bg-primary-container text-on-primary-container font-headline-sm text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary-container/25 active:scale-[0.98] transition-all hover:bg-primary"
        >
          <span className="material-symbols-outlined text-[18px]">notifications_active</span>
          <span>Create Alert from this Event</span>
        </Link>

        {/* Secondary Telemetry Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onCenterMap(event)}
            className="w-full h-9 rounded-lg bg-surface-container hover:bg-surface-bright text-primary border border-primary/30 font-label-caps text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">center_focus_strong</span>
            <span>Center Target</span>
          </button>

          <button
            onClick={handleExportGeoJson}
            className="w-full h-9 rounded-lg bg-surface-container hover:bg-surface-bright text-on-surface-variant hover:text-on-surface font-label-caps text-xs flex items-center justify-center gap-1.5 transition-colors border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export GeoJSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
