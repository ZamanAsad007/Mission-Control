import React from 'react';
import { cn, getCategoryBadge } from '@/lib/utils';

interface CategoryBadgeProps {
  category: string;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, className }) => {
  const { label, colorClass, bgClass, borderClass, icon } = getCategoryBadge(category);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-label-caps text-[0.6875rem] font-bold uppercase tracking-wider',
        bgClass,
        borderClass,
        colorClass,
        className
      )}
    >
      <span className="material-symbols-outlined text-[0.875rem]">{icon}</span>
      <span>{label}</span>
    </span>
  );
};

interface SeverityBadgeProps {
  severity?: string | null;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className }) => {
  if (!severity) return null;

  const s = severity.toUpperCase();
  let color = 'bg-primary/10 text-primary border-primary/30';

  if (s.startsWith('X') || s === 'CRITICAL' || s === 'HIGH') {
    color = 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse';
  } else if (s.startsWith('M') || s === 'MODERATE' || s === 'MED') {
    color = 'bg-amber-500/15 text-amber-400 border-amber-500/40';
  } else if (s.startsWith('C') || s === 'LOW') {
    color = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded border font-data-sm text-[0.7rem] font-bold tracking-wider',
        color,
        className
      )}
    >
      {severity}
    </span>
  );
};
