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

  return (
    <div className="absolute right-4 top-4 bottom-4 w-96 max-w-[calc(100%-2rem)] z-20 bg-surface-container/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Top Header */}
      <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/80">
        <div className="flex items-center gap-2">
          <CategoryBadge category={event.category} />
          <SeverityBadge severity={event.severity} />
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[1.25rem]">close</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
        {/* Title & Time */}
        <div className="flex flex-col gap-1">
          <span className="font-data-sm text-[0.6875rem] text-primary tracking-widest uppercase">
            NASA EONET INCIDENT REPORT
          </span>
          <h2 className="font-headline-sm text-lg font-bold text-on-surface leading-snug">
            {event.title}
          </h2>
          <span className="font-data-sm text-xs text-on-surface-variant/80">
            Recorded: {formatDate(event.started_at)} ({formatRelativeTime(event.started_at)})
          </span>
        </div>

        {/* Coordinates Card */}
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
          <span className="font-label-caps text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
            Target Geolocation Coordinates
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex flex-col p-2 rounded bg-surface-container border border-outline-variant/20">
              <span className="text-on-surface-variant text-[0.625rem]">LATITUDE</span>
              <span className="text-primary font-bold">{lat.toFixed(4)}°</span>
            </div>
            <div className="flex flex-col p-2 rounded bg-surface-container border border-outline-variant/20">
              <span className="text-on-surface-variant text-[0.625rem]">LONGITUDE</span>
              <span className="text-primary font-bold">{lng.toFixed(4)}°</span>
            </div>
          </div>
        </div>

        {/* Incident Metadata Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex flex-col">
            <span className="font-label-caps text-[0.625rem] text-on-surface-variant uppercase">
              Sensor Source
            </span>
            <span className="font-data-sm text-xs font-bold text-on-surface">{event.source}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex flex-col">
            <span className="font-label-caps text-[0.625rem] text-on-surface-variant uppercase">
              Incident ID
            </span>
            <span className="font-data-sm text-xs font-bold text-on-surface truncate">
              {event.source_id}
            </span>
          </div>
        </div>

        {/* Geometries History / Track Points */}
        {geometries.length > 1 && (
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <span className="font-label-caps text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
              Track Observations ({geometries.length} coordinates)
            </span>
            <span className="text-xs text-on-surface-variant">
              Dynamic tracking points monitored by Earth observation satellites.
            </span>
          </div>
        )}

        {/* Sources / NASA references */}
        {sources.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-label-caps text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
              Verification Sources
            </span>
            <div className="flex flex-col gap-1">
              {sources.map((src: any, i: number) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs text-primary hover:underline flex items-center justify-between"
                >
                  <span className="truncate">{src.id || src.url}</span>
                  <span className="material-symbols-outlined text-[0.875rem]">open_in_new</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/90 flex flex-col gap-2">
        <button
          onClick={() => onCenterMap(event)}
          className="w-full py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary border border-primary/30 font-headline-sm text-xs transition-all flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[1rem]">center_focus_strong</span>
          <span>Center On Target</span>
        </button>

        <Link
          to={`/alerts?category=${encodeURIComponent(event.category)}&lat=${lat}&lng=${lng}`}
          className="w-full py-2 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-xs font-semibold hover:bg-primary transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary-container/20"
        >
          <span className="material-symbols-outlined text-[1rem]">notification_add</span>
          <span>Set Geofence Alert Rule</span>
        </Link>
      </div>
    </div>
  );
};
