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
    const source =
      isNearbyMode && nearbyEventsResponse?.data
        ? nearbyEventsResponse.data
        : eventsResponse?.data || [];
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
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Desktop Header Row (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
              Earth Events Geospatial Radar
            </h1>
          </div>
          <p className="font-body-md text-xs text-on-surface-variant">
            NASA EONET &amp; DONKI Planetary Hazard Telemetry · Multi-sensor Tracking
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

      {/* Desktop Filter Bar (Hidden on Mobile) */}
      <div className="hidden md:block">
        <MapFilterPanel
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          dateRange={dateRange}
          onSelectDateRange={setDateRange}
          categoryCounts={categoryCounts}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      </div>

      {/* Map Viewport Container */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl">
        {/* Floating Top Search & Quick Filters Strip (Mobile Only - Stitch Spec) */}
        <div className="md:hidden absolute top-2.5 inset-x-2.5 flex flex-col gap-2 z-20">
          {/* Primary Search Pill */}
          <div className="flex items-center gap-2 bg-surface-container/90 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-lg border border-outline-variant/30">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, coordinates..."
              className="bg-transparent text-xs text-on-surface placeholder:text-outline w-full focus:outline-none font-body-sm tracking-tight"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
          </div>

          {/* Quick Feed Metadata & Range Pills Row */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 bg-surface-container-lowest/85 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-outline-variant/30 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
              <span className="font-data-sm text-[10px] text-on-surface-variant">
                {filteredEvents.length} ACTIVE · NASA EONET
              </span>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-surface-container-lowest/85 backdrop-blur-md p-0.5 rounded-full border border-outline-variant/30 shadow-sm">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-2 py-0.5 rounded-full font-label-caps text-[9px] uppercase transition-all ${
                    dateRange === r
                      ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Carousel (Horizontal Scroll - Stitch Spec) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
            {/* All */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 shadow-sm font-label-caps text-[10px] transition-all ${
                selectedCategory === 'all'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'bg-surface-container-high/80 backdrop-blur-md text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              <span>ALL ({categoryCounts.all || 0})</span>
            </button>

            {/* Wildfires */}
            <button
              onClick={() => setSelectedCategory('wildfires')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 font-label-caps text-[10px] transition-all ${
                selectedCategory === 'wildfires'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'bg-surface-container-high/80 backdrop-blur-md text-rose-300 hover:text-rose-200 border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-rose-400">
                local_fire_department
              </span>
              <span>WILDFIRES ({categoryCounts.wildfires || 0})</span>
            </button>

            {/* Storms */}
            <button
              onClick={() => setSelectedCategory('severeStorms')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 font-label-caps text-[10px] transition-all ${
                selectedCategory === 'severeStorms'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'bg-surface-container-high/80 backdrop-blur-md text-primary hover:text-white border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-primary">cyclone</span>
              <span>STORMS ({categoryCounts.severeStorms || 0})</span>
            </button>

            {/* Volcanoes */}
            <button
              onClick={() => setSelectedCategory('volcanoes')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 font-label-caps text-[10px] transition-all ${
                selectedCategory === 'volcanoes'
                  ? 'bg-fuchsia-500 text-white font-bold shadow-sm'
                  : 'bg-surface-container-high/80 backdrop-blur-md text-fuchsia-300 hover:text-fuchsia-200 border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-fuchsia-400">volcano</span>
              <span>VOLCANOES ({categoryCounts.volcanoes || 0})</span>
            </button>

            {/* Floods */}
            <button
              onClick={() => setSelectedCategory('floods')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 font-label-caps text-[10px] transition-all ${
                selectedCategory === 'floods'
                  ? 'bg-teal-500 text-white font-bold shadow-sm'
                  : 'bg-surface-container-high/80 backdrop-blur-md text-teal-300 hover:text-teal-200 border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] text-teal-400">flood</span>
              <span>FLOODS ({categoryCounts.floods || 0})</span>
            </button>
          </div>
        </div>

        {/* Tactical Map with custom right-rail controls & micro-legend */}
        <TacticalMap
          events={filteredEvents}
          selectedEvent={selectedEvent}
          onSelectEvent={setSelectedEvent}
          userLocation={userLocation}
          onLocateMe={handleLocateMe}
          isLocating={isLocating}
        />

        {/* Selected Event Detail Drawer / Interactive Bottom Sheet */}
        <EventDetailDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onCenterMap={(evt) => setSelectedEvent({ ...evt })}
        />

        {/* Desktop Bottom-Left Tactical HUD Map Legend (Hidden on Mobile) */}
        <div className="hidden md:flex absolute bottom-4 left-4 z-10 p-3 rounded-xl bg-surface-container-low/90 backdrop-blur-md border border-outline-variant/40 shadow-xl flex-col gap-2 max-w-xs select-none">
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
