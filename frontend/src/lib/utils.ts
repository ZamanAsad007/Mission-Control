import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUtcTime(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'recently';
  try {
    const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'recently';
  }
}

// 1 Lunar Distance ≈ 384,400 km
export const KM_PER_LD = 384400;

export function kmToLd(km: number | string): number {
  const num = typeof km === 'string' ? parseFloat(km) : km;
  if (isNaN(num)) return 0;
  return +(num / KM_PER_LD).toFixed(2);
}

export function formatKm(km: number | string): string {
  const num = typeof km === 'string' ? parseFloat(km) : km;
  if (isNaN(num)) return '0 km';
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' km';
}

export function getCategoryBadge(category: string): {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: string;
} {
  const cat = (category || '').toLowerCase();
  if (cat.includes('flare') || cat === 'solar_flare') {
    return {
      label: 'Solar Flare',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-400/10',
      borderClass: 'border-amber-400/30',
      icon: 'bolt',
    };
  }
  if (cat.includes('cme')) {
    return {
      label: 'Coronal Mass Ejection',
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-400/10',
      borderClass: 'border-orange-400/30',
      icon: 'cyclone',
    };
  }
  if (cat.includes('wildfire')) {
    return {
      label: 'Wildfire',
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-400/10',
      borderClass: 'border-rose-400/30',
      icon: 'local_fire_department',
    };
  }
  if (cat.includes('storm')) {
    return {
      label: 'Severe Storm',
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-400/10',
      borderClass: 'border-blue-400/30',
      icon: 'air',
    };
  }
  if (cat.includes('volcano')) {
    return {
      label: 'Volcano',
      colorClass: 'text-fuchsia-400',
      bgClass: 'bg-fuchsia-400/10',
      borderClass: 'border-fuchsia-400/30',
      icon: 'volcano',
    };
  }
  if (cat.includes('ice')) {
    return {
      label: 'Sea/Lake Ice',
      colorClass: 'text-cyan-300',
      bgClass: 'bg-cyan-300/10',
      borderClass: 'border-cyan-300/30',
      icon: 'ac_unit',
    };
  }
  if (cat.includes('asteroid')) {
    return {
      label: 'Near-Earth Object',
      colorClass: 'text-purple-400',
      bgClass: 'bg-purple-400/10',
      borderClass: 'border-purple-400/30',
      icon: 'radar',
    };
  }
  return {
    label: category || 'Event',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary/30',
    icon: 'flare',
  };
}
