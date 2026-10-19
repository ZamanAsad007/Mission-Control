import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEvents } from '@/lib/api';
import { TacticalMap } from '@/components/map/TacticalMap';
import { MapFilterPanel } from '@/components/map/MapFilterPanel';
import type { MissionEvent } from '@/types';

export const MapPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<MissionEvent | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Fetch events based on dateRange
  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['events', 'map', dateRange],
    queryFn: () => {
      const now = Date.now();
      const days = dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : 30;
      const from = new Date(now - days * 86400000).toISOString();
      return getEvents({ from, limit: 200 });
    },
    refetchInterval: 60000,
  });

  const allEvents = useMemo(() => {
    return (eventsResponse?.data || []).filter((e) => e.location && e.location.coordinates);
  }, [eventsResponse]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allEvents.length };
    allEvents.forEach((evt) => {
      const cat = evt.category;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((evt) => {
      if (selectedCategory !== 'all' && evt.category !== selectedCategory) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(q);
        const matchesCat = evt.category.toLowerCase().includes(q);
        const matchesSource = evt.source.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat && !matchesSource) return false;
      }
      return true;
    });
  }, [allEvents, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
              Earth Events Geospatial Radar
            </h1>
          </div>
          <p className="font-body-md text-xs text-on-surface-variant">
            NASA EONET & DONKI Planetary Hazard Telemetry · Multi-sensor Tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-data-sm text-xs text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
            {isLoading ? 'Scanning...' : `${filteredEvents.length} Active Hotspots`}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <MapFilterPanel
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        dateRange={dateRange}
        onSelectDateRange={setDateRange}
        categoryCounts={categoryCounts}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {/* Map Viewport */}
      <div className="relative">
        <TacticalMap
          events={filteredEvents}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
          userLocation={userLocation}
        />
      </div>
    </div>
  );
};
