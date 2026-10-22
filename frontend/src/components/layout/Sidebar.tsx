import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

interface SidebarProps {
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenProfile }) => {
  const { user, isAuthenticated, logout } = useAuth();

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30000,
  });

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'grid_view' },
    { name: 'Earth Map', path: '/map', icon: 'public' },
    { name: 'Asteroids', path: '/asteroids', icon: 'radar' },
    { name: 'Space Weather', path: '/space-weather', icon: 'bolt' },
    { name: 'Alerts', path: '/alerts', icon: 'notifications_active' },
    { name: 'Cosmic Birthday', path: '/birthday', icon: 'cake' },
  ];

  const lastRunTime = healthData?.data?.ingestion
    ? Object.values(healthData.data.ingestion).reduce<string | null>((latest, curr) => {
        if (!curr?.last_run) return latest;
        if (!latest) return curr.last_run;
        return new Date(curr.last_run) > new Date(latest) ? curr.last_run : latest;
      }, null)
    : null;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 bg-surface-container-low border-r border-outline-variant/30 z-50 flex-col justify-between select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-space-md border-b border-outline-variant/30 flex items-center gap-space-sm bg-surface-container-lowest/60 backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-primary-container/20 border border-primary-container/40 flex items-center justify-center text-primary-container shadow-[0_0_12px_rgba(34,211,238,0.25)]">
            <span className="material-symbols-outlined text-[1.25rem]">rocket_launch</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-title-hud text-title-hud text-primary tracking-widest truncate leading-tight">
              MISSION CONTROL
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant/70 tracking-widest truncate">
              NASA OPEN TELEMETRY
            </span>
          </div>
        </div>

        {/* Section Heading */}
        <div className="px-space-md pt-space-lg pb-space-xs">
          <span className="font-label-caps text-label-caps text-on-surface-variant/50 uppercase tracking-widest px-space-sm">
            Telemetry Navigation
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex flex-col gap-space-xs px-space-sm py-space-xs">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-md shadow-primary-container/20'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container font-body-md'
                }`
              }
            >
              <span className="material-symbols-outlined text-[1.25rem]">{item.icon}</span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Section: Ingestion Telemetry & User Auth */}
      <div className="p-space-md flex flex-col gap-space-sm border-t border-outline-variant/30 bg-surface-container-lowest/40">
        {/* Ingestion Health Telemetry Card */}
        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/30 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-radar absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span>
              </span>
              <span className="font-label-caps text-label-caps text-primary uppercase">
                Ingestion Active
              </span>
            </div>
            <span className="font-data-sm text-data-sm text-on-surface-variant/70">
              {formatRelativeTime(lastRunTime)}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
            All telemetry sources healthy & operational.
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            <span className="font-label-caps text-[0.625rem] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/20">
              DONKI
            </span>
            <span className="font-label-caps text-[0.625rem] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/20">
              EONET
            </span>
            <span className="font-label-caps text-[0.625rem] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/20">
              NeoWs
            </span>
            <span className="font-label-caps text-[0.625rem] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-outline-variant/20">
              APOD
            </span>
          </div>
        </div>

        {/* User profile / Auth Link */}
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container/60 border border-outline-variant/20 hover:border-primary/40 transition-all shadow-sm">
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2 min-w-0 text-left flex-1 hover:opacity-90 group mr-1"
              title="Click to edit operator profile"
            >
              <div className="w-7 h-7 rounded-full bg-secondary/20 text-secondary border border-secondary/30 flex items-center justify-center font-bold text-xs uppercase shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                {user.email.substring(0, 2)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-body-sm text-on-surface truncate text-xs font-medium group-hover:text-primary transition-colors">
                  {user.email}
                </span>
                <span className="font-label-caps text-[0.6rem] text-primary flex items-center gap-1">
                  <span>Flight Operator</span>
                  <span className="material-symbols-outlined text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                    edit
                  </span>
                </span>
              </div>
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={onOpenProfile}
                title="Edit Profile Settings"
                className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[1.125rem]">settings</span>
              </button>
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[1.125rem]">logout</span>
              </button>
            </div>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-body-sm text-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[1rem] text-primary">key</span>
            <span>Operator Sign In</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};
