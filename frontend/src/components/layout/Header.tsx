import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { formatUtcTime } from '@/lib/utils';
import type { StreamStatus } from '@/hooks/useEventStream';

interface HeaderProps {
  streamStatus?: StreamStatus;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  streamStatus = 'connected',
  searchTerm = '',
  onSearchChange,
}) => {
  const [utcTime, setUtcTime] = useState(formatUtcTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(formatUtcTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="fixed top-0 left-60 right-0 h-16 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/30 z-40 px-6 flex items-center justify-between select-none">
      {/* Global Search Bar */}
      <div className="flex items-center flex-1 max-w-lg">
        <div className="relative w-full flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[1.25rem] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search events, coordinates, asteroid IDs..."
            className="w-full h-10 pl-10 pr-12 rounded-lg bg-surface-container border border-outline-variant/50 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-data-sm text-[0.7rem] border border-outline-variant/30 pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls: Telemetry Clock & Live Stream Indicators */}
      <div className="flex items-center gap-space-lg">
        {/* Live Stream Telemetry Indicator */}
        <div className="hidden md:flex items-center gap-space-md border-r border-outline-variant/30 pr-space-lg">
          <div className="flex items-center gap-space-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-radar absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span>
            </span>
            <span className="font-label-caps text-label-caps text-primary-container font-bold uppercase tracking-wider">
              {streamStatus === 'connected' ? 'LIVE' : streamStatus === 'fallback_polling' ? 'POLLING' : 'CONNECTING'}
            </span>
          </div>
          <span className="font-data-md text-data-md text-on-surface tracking-wider font-semibold">
            {utcTime}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <NavLink
            to="/alerts"
            title="Active Alert Monitor"
            className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface-variant hover:text-primary transition-all relative"
          >
            <span className="material-symbols-outlined text-[1.25rem]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400"></span>
          </NavLink>

          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            title="Swagger API Documentation"
            className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 font-label-caps text-xs"
          >
            <span className="material-symbols-outlined text-[1.25rem]">menu_book</span>
            <span className="hidden lg:inline">API DOCS</span>
          </a>
        </div>
      </div>
    </header>
  );
};
