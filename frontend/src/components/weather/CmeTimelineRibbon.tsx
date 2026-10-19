import React from 'react';
import type { MissionEvent } from '@/types';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface CmeTimelineRibbonProps {
  cmeEvents: MissionEvent[];
}

export const CmeTimelineRibbon: React.FC<CmeTimelineRibbonProps> = ({ cmeEvents }) => {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-md">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[1.25rem] text-orange-400">
            cyclone
          </span>
          <span className="font-headline-sm text-sm font-semibold text-on-surface">
            Coronal Mass Ejection (CME) Impact Tracker
          </span>
        </div>
        <span className="font-label-caps text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20">
          DONKI CME Telemetry
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cmeEvents.length === 0 ? (
          <div className="col-span-3 py-6 text-center text-xs text-on-surface-variant font-data-sm">
            No coronal mass ejections registered in the selected epoch.
          </div>
        ) : (
          cmeEvents.slice(0, 3).map((cme) => {
            const payload = cme.payload || {};
            const speed = payload.speed || payload.cmeAnalyses?.[0]?.speed || 480;
            const halfAngle = payload.halfAngle || payload.cmeAnalyses?.[0]?.halfAngle || 32;
            const isEarthDirected = payload.isEarthDirected ?? (speed > 600 || halfAngle > 40);

            return (
              <div
                key={cme.id || cme.source_id}
                className="p-3.5 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col justify-between gap-2.5 hover:border-orange-400/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-xs font-semibold text-on-surface truncate">
                    {cme.source_id}
                  </span>
                  {isEarthDirected ? (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-label-caps text-[0.6rem] font-bold border border-rose-500/30">
                      EARTH-DIRECTED
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-label-caps text-[0.6rem] border border-emerald-500/20">
                      DEFLECTED
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between font-data-sm text-xs">
                  <div className="flex flex-col">
                    <span className="text-[0.625rem] text-on-surface-variant">EXPANSION SPEED</span>
                    <span className="text-orange-400 font-bold">{speed} km/s</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[0.625rem] text-on-surface-variant">ANGULAR WIDTH</span>
                    <span className="text-on-surface font-bold">{halfAngle}°</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 font-data-sm text-[0.6875rem] text-on-surface-variant/80">
                  <span>{formatDate(cme.started_at)}</span>
                  <span>{formatRelativeTime(cme.started_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
