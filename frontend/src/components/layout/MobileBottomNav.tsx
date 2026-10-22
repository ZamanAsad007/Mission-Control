import React from 'react';
import { NavLink } from 'react-router-dom';

interface MobileBottomNavProps {
  alertCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ alertCount = 3 }) => {
  const navItems = [
    { name: 'Dash', path: '/', icon: 'dashboard', end: true },
    { name: 'Earth', path: '/map', icon: 'public' },
    { name: 'Asteroids', path: '/asteroids', icon: 'radar' },
    { name: 'Space Wx', path: '/space-weather', icon: 'bolt' },
    { name: 'Alerts', path: '/alerts', icon: 'notifications_active', badge: alertCount },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] select-none"
      aria-label="Mobile Navigation"
    >
      <div className="flex justify-around items-center h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[54px] h-12 gap-0.5 transition-all relative ${
                isActive
                  ? 'text-primary-container font-semibold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            <div className="relative flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-error text-on-error font-data-sm text-[9px] font-bold leading-none animate-pulse">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span className="font-label-caps text-[10px] tracking-wider uppercase leading-none mt-0.5">
              {item.name}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
