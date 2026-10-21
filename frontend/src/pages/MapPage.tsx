import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEvents, getNearbyEvents } from '@/lib/api';
import { TacticalMap } from '@/components/map/TacticalMap';
import { MapFilterPanel } from '@/components/map/MapFilterPanel';
import { EventDetailDrawer } from '@/components/map/EventDetailDrawer';
import { getEventCoordinates } from '@/lib/utils';
import type { MissionEvent } from '@/types';

function getNormalizedCategory(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('wildfire')) return 'wildfires';
  if (c.includes('storm')) return 'severeStorms';
  if (c.includes('volcano')) return 'volcanoes';
  if (c.includes('ice')) return 'seaLakeIce';
  if (c.includes('flood')) return 'floods';
  return c;
}

export const MapPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<MissionEvent | null>(null);

  // Geolocation & Nearby State
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isNearbyMode, setIsNearbyMode] = useState<boolean>(false);

  // Fetch events based on dateRange
  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['events', 'map', dateRange],
    queryFn: () => {
      const now = Date.now();
      const days = dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : 30;
      const from = new Date(now - days * 86400000).toISOString();
      return getEvents({ from, limit: 300 });
    },
    refetchInterval: 60000,
  });

  // Fetch nearby events when in nearby mode and userLocation is available
  const { data: nearbyEventsResponse, isLoading: isNearbyLoading } = useQuery({
    queryKey: ['events', 'nearby', userLocation?.[0], userLocation?.[1]],
    queryFn: () => {
      if (!userLocation) return Promise.resolve({ success: true, data: [] });
      return getNearbyEvents(userLocation[0], userLocation[1], 1000);
    },
    enabled: !!userLocation && isNearbyMode,
  });

  const handleLocateMe = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation([lat, lng]);
        setIsNearbyMode(true);
        setIsLocating(false);
      },
      (error) => {
        setLocationError(`Location request failed: ${error.message}`);
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const handleClearNearby = () => {
    setIsNearbyMode(false);
  };

  const allEvents = useMemo(() => {
    const source = isNearbyMode && nearbyEventsResponse?.data ? nearbyEventsResponse.data : eventsResponse?.data || [];
    return source.filter((e) => getEventCoordinates(e) !== null);
  }, [isNearbyMode, nearbyEventsResponse, eventsResponse]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allEvents.length };
    allEvents.forEach((evt) => {
      const cat = getNormalizedCategory(evt.category);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((evt) => {
      if (selectedCategory !== 'all') {
        const evtCat = getNormalizedCategory(evt.category);
        const selCat = getNormalizedCategory(selectedCategory);
        if (evtCat !== selCat) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = evt.title?.toLowerCase().includes(q);
        const matchesCat = evt.category?.toLowerCase().includes(q);
        const matchesSource = evt.source?.toLowerCase().includes(q);
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

        {/* Action Buttons: Geolocation / Mode Toggle */}
        <div className="flex items-center gap-3">
          {isNearbyMode ? (
            <button
              onClick={handleClearNearby}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-xs font-label-caps text-on-surface transition-all"
            >
              <span className="material-symbols-outlined text-[1rem]">public</span>
              <span>Reset to Global View</span>
            </button>
          ) : (
            <button
              onClick={handleLocateMe}
              disabled={isLocating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary font-headline-sm text-xs font-semibold shadow-md shadow-primary-container/20 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[1.125rem]">
                {isLocating ? 'sync' : 'my_location'}
              </span>
              <span>{isLocating ? 'Acquiring GPS...' : 'Events Near Me (1,000 km)'}</span>
            </button>
          )}

          <span className="font-data-sm text-xs text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
            {isLoading || isNearbyLoading ? 'Scanning...' : `${filteredEvents.length} Active Hotspots`}
          </span>
        </div>
      </div>

      {locationError && (
        <div className="p-3 rounded-lg bg-error-container/30 border border-error/40 text-error font-body-sm text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[1.125rem]">warning</span>
          <span>{locationError}</span>
        </div>
      )}

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

      {/* Map Viewport Container */}
      <div className="relative">
        <TacticalMap
          events={filteredEvents}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
          userLocation={userLocation}
        />

        {/* Selected Event Detail Drawer */}
        <EventDetailDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onCenterMap={(evt) => setSelectedEvent({ ...evt })}
        />

        {/* Bottom-Left Tactical HUD Map Legend */}
        <div className="absolute bottom-4 left-4 z-10 p-3 rounded-xl bg-surface-container-low/90 backdrop-blur-md border border-outline-variant/40 shadow-xl flex flex-col gap-2 max-w-xs select-none">
          <span className="font-label-caps text-[0.625rem] text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/20 pb-1">
            Hazard Spectrum Key
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.7rem] font-data-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fb5a3c]" />
              <span className="text-on-surface">Wildfire</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
              <span className="text-on-surface">Storm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
              <span className="text-on-surface">Volcano</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
              <span className="text-on-surface">Sea Ice</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf]" />
              <span className="text-on-surface">Flood</span>
            </div>
            {userLocation && (
              <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-outline-variant/20">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
                <span className="text-primary-container font-bold">Your Station Location</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
