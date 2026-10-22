import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { formatUtcTime } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { StreamStatus } from '@/hooks/useEventStream';

interface HeaderProps {
  streamStatus?: StreamStatus;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  streamStatus = 'connected',
  searchTerm = '',
  onSearchChange,
  onOpenProfile,
}) => {
  const [utcTime, setUtcTime] = useState(formatUtcTime());
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(formatUtcTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="fixed top-0 left-0 md:left-60 right-0 h-16 bg-surface-container-low/85 backdrop-blur-xl border-b border-outline-variant/30 z-40 px-4 md:px-6 flex items-center justify-between select-none">
      {/* Mobile Branding (Visible only on <md) */}
      <div className="flex md:hidden items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-primary-container shadow-[0_0_12px_rgba(34,211,238,0.25)] border border-primary-container/30">
          <span className="material-symbols-outlined text-[18px]">satellite_alt</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-label-caps text-[9px] text-primary tracking-widest leading-none">
            NASA // MC
          </span>
          <span className="font-title-hud text-xs text-on-surface leading-tight tracking-wider uppercase truncate">
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-container-high/60 ml-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-container"></span>
          </span>
          <span className="font-label-caps text-[9px] text-primary-container tracking-wider">
            LIVE
          </span>
        </div>
      </div>

      {/* Desktop Search Bar (Visible only on md+) */}
      <div className="hidden md:flex items-center flex-1 max-w-lg">
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

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-space-lg">
        {/* Desktop Live Stream Telemetry Indicator */}
        <div className="hidden md:flex items-center gap-space-md border-r border-outline-variant/30 pr-space-lg">
          <div className="flex items-center gap-space-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-radar absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span>
            </span>
            <span className="font-label-caps text-label-caps text-primary-container font-bold uppercase tracking-wider">
              {streamStatus === 'connected'
                ? 'LIVE'
                : streamStatus === 'fallback_polling'
                  ? 'POLLING'
                  : 'CONNECTING'}
            </span>
          </div>
          <span className="font-data-md text-data-md text-on-surface tracking-wider font-semibold">
            {utcTime}
          </span>
        </div>

        {/* Mobile Search Toggle */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="flex md:hidden p-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Toggle search"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>

        {/* Alerts Link */}
        <NavLink
          to="/alerts"
          title="Active Alert Monitor"
          className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface-variant hover:text-primary transition-all relative"
        >
          <span className="material-symbols-outlined text-[1.25rem]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400"></span>
        </NavLink>

        {/* Desktop API Docs Link */}
        <a
          href="/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          title="Swagger API Documentation"
          className="hidden md:flex p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface-variant hover:text-primary transition-all items-center gap-1.5 font-label-caps text-xs"
        >
          <span className="material-symbols-outlined text-[1.25rem]">menu_book</span>
          <span className="hidden lg:inline">API DOCS</span>
        </a>

        {/* User Avatar / Profile Button */}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary hover:scale-105 transition-transform shadow-sm"
            title={`${user?.email || 'Operator'} - Edit Profile`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </button>
        ) : (
          <NavLink
            to="/login"
            className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-primary hover:scale-105 transition-transform"
            title="Operator Sign In"
          >
            <span className="material-symbols-outlined text-[18px]">key</span>
          </NavLink>
        )}
      </div>

      {/* Expandable Mobile Search Field */}
      {showMobileSearch && (
        <div className="absolute top-16 left-0 right-0 p-3 bg-surface-container-low/95 backdrop-blur-xl border-b border-outline-variant/30 md:hidden flex items-center gap-2 shadow-xl animate-in slide-in-from-top duration-200">
          <div className="relative flex-1 flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search telemetry, events..."
              className="w-full h-9 pl-9 pr-8 rounded-lg bg-surface-container border border-outline-variant/40 font-body-sm text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange?.('')}
                className="absolute right-2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setShowMobileSearch(false)}
            className="text-xs font-label-caps text-on-surface-variant px-2 py-1"
          >
            Cancel
          </button>
        </div>
      )}
    </header>
  );
};
