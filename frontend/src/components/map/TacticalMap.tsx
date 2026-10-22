import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MissionEvent } from '@/types';
import { getEventCoordinates } from '@/lib/utils';

export type BasemapMode = 'satellite' | 'dark' | 'streets';

interface TacticalMapProps {
  events: MissionEvent[];
  selectedEvent: MissionEvent | null;
  onSelectEvent: (event: MissionEvent) => void;
  userLocation: [number, number] | null;
  onLocateMe?: () => void;
  isLocating?: boolean;
}

// Bounding box limits for Web Mercator Earth
// Hard limits at ~85.0511° to stop infinite vertical void
// Longitudinal bounds span -540° to 540° to allow continuous wrapping
const SOUTH_BOUND = -85.05112878;
const NORTH_BOUND = 85.05112878;
const WORLD_BOUNDS = L.latLngBounds(
  L.latLng(SOUTH_BOUND, -540),
  L.latLng(NORTH_BOUND, 540)
);

export const TacticalMap: React.FC<TacticalMapProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  userLocation,
  onLocateMe,
  isLocating,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tilesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  // Basemap selection state with persistence
  const [basemapMode, setBasemapMode] = useState<BasemapMode>(() => {
    return (localStorage.getItem('mc_basemap_mode') as BasemapMode) || 'satellite';
  });

  // Fullscreen map mode state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleSelectBasemap = (mode: BasemapMode) => {
    setBasemapMode(mode);
    localStorage.setItem('mc_basemap_mode', mode);
  };

  const handleCycleBasemap = () => {
    const modes: BasemapMode[] = ['satellite', 'dark', 'streets'];
    const nextIdx = (modes.indexOf(basemapMode) + 1) % modes.length;
    handleSelectBasemap(modes[nextIdx]);
  };

  const handleRecenter = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([20, 0], 3, { duration: 0.8 });
  }, []);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // Handle Fullscreen Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Invalidate map size on fullscreen toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Initialize Map with High-Performance options
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    // Clear residual Leaflet ID from DOM container
    delete (mapContainerRef.current as any)._leaflet_id;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomSnap: 1, // Integer zoom avoids expensive fractional tile resampling
      zoomDelta: 1,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      preferCanvas: true, // Hardware-accelerated canvas for vector layers & circles
      wheelDebounceTime: 40,
      wheelPxPerZoomLevel: 100, // Smooth mouse wheel sensitivity
      maxBounds: WORLD_BOUNDS,
      maxBoundsViscosity: 1.0, // Hard stop at North and South poles (prevents infinite void)
      worldCopyJump: true, // Smooth horizontal world wrapping
      bounceAtZoomLimits: false,
      zoomControl: false, // We use custom styled tactical HUD controls matching Stitch
      attributionControl: false,
    });

    // Basemap tile group
    const tilesGroup = L.layerGroup().addTo(map);
    tilesLayerGroupRef.current = tilesGroup;

    // Markers layer
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Tile Layer when basemapMode changes
  useEffect(() => {
    const group = tilesLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (basemapMode === 'satellite') {
      const esriSat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 18,
          keepBuffer: 4,
          updateWhenIdle: true,
        }
      );
      esriSat.addTo(group);
    } else if (basemapMode === 'dark') {
      const darkLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 16,
          keepBuffer: 4,
          updateWhenIdle: true,
        }
      );
      darkLayer.addTo(group);
    } else if (basemapMode === 'streets') {
      const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
          keepBuffer: 4,
          updateWhenIdle: true,
        }
      );
      osm.addTo(group);
    }
  }, [basemapMode]);

  // Marker colors and icons by category
  const getCategoryMarkerConfig = (category: string) => {
    const c = (category || '').toLowerCase();
    if (c.includes('wildfire')) {
      return {
        color: '#fb5a3c',
        halo: 'rgba(251, 90, 60, 0.4)',
        icon: 'local_fire_department',
      };
    }
    if (c.includes('storm')) {
      return {
        color: '#22d3ee',
        halo: 'rgba(34, 211, 238, 0.4)',
        icon: 'cyclone',
      };
    }
    if (c.includes('volcano')) {
      return {
        color: '#f43f5e',
        halo: 'rgba(244, 63, 94, 0.4)',
        icon: 'volcano',
      };
    }
    if (c.includes('ice')) {
      return {
        color: '#38bdf8',
        halo: 'rgba(56, 189, 248, 0.4)',
        icon: 'ac_unit',
      };
    }
    if (c.includes('flood')) {
      return {
        color: '#2dd4bf',
        halo: 'rgba(45, 212, 191, 0.4)',
        icon: 'flood',
      };
    }
    return {
      color: '#a78bfa',
      halo: 'rgba(167, 139, 250, 0.4)',
      icon: 'radar',
    };
  };

  // Render Markers
  useEffect(() => {
    const group = markersLayerRef.current;
    if (!group) return;

    group.clearLayers();

    events.forEach((evt) => {
      const coords = getEventCoordinates(evt);
      if (!coords) return;
      const [lng, lat] = coords;

      const isSelected = selectedEvent?.id === evt.id;
      const config = getCategoryMarkerConfig(evt.category);

      const markerHtml = `
        <div class="relative group cursor-pointer flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          ${
            isSelected
              ? `<div class="absolute w-12 h-12 rounded-full border-2 border-primary-container animate-ping opacity-75"></div>
                 <div class="absolute w-10 h-10 rounded-full bg-primary-container/20"></div>`
              : `<div class="absolute w-7 h-7 rounded-full opacity-60 group-hover:scale-125 transition-transform" style="background: ${config.halo};"></div>`
          }
          <div class="relative w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-white/20" style="background: ${
            isSelected ? '#22d3ee' : config.color
          }; color: #0a0e17;">
            <span class="material-symbols-outlined text-[14px] font-bold select-none">${config.icon}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-tactical-marker',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });
      marker.on('click', () => {
        onSelectEvent(evt);
      });

      marker.addTo(group);
    });
  }, [events, selectedEvent, onSelectEvent]);

  // Center on Selected Event
  useEffect(() => {
    if (!selectedEvent || !mapInstanceRef.current) return;
    const coords = getEventCoordinates(selectedEvent);
    if (!coords) return;
    const [lng, lat] = coords;

    mapInstanceRef.current.flyTo([lat, lng], 6, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [selectedEvent]);

  // Handle User Geolocation Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userCircleRef.current) {
      userCircleRef.current.remove();
      userCircleRef.current = null;
    }

    if (userLocation) {
      const [lat, lng] = userLocation;

      const userHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-10 h-10 rounded-full bg-primary-container/30 animate-ping"></div>
          <div class="relative w-6 h-6 rounded-full bg-primary-container flex items-center justify-center shadow-lg border-2 border-surface">
            <span class="material-symbols-outlined text-[14px] text-on-primary-container font-bold">my_location</span>
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: userHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(map);

      userCircleRef.current = L.circle([lat, lng], {
        radius: 1000 * 1000,
        color: '#22d3ee',
        weight: 1.5,
        dashArray: '5, 8',
        fillColor: '#22d3ee',
        fillOpacity: 0.05,
      }).addTo(map);

      map.flyTo([lat, lng], 5, { duration: 1.0 });
    }
  }, [userLocation]);

  return (
    <div
      className={`transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-none bg-[#070b14]'
          : 'relative w-full h-[460px] sm:h-[520px] md:h-[580px] lg:h-[calc(100vh-17.5rem)] min-h-[380px] max-h-[720px] rounded-2xl overflow-hidden border border-outline-variant/30 bg-[#070b14] shadow-2xl'
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Basemap Switcher HUD (Top Left - Desktop View) */}
      <div className="hidden md:flex absolute top-4 left-4 z-10 items-center bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-1 border border-outline-variant/40 shadow-2xl">
        <button
          type="button"
          onClick={() => handleSelectBasemap('satellite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-label-caps transition-all ${
            basemapMode === 'satellite'
              ? 'bg-primary-container text-on-primary-container font-bold shadow-md shadow-primary-container/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
          title="High-resolution Earth satellite imagery (No API Key Required)"
        >
          <span className="material-symbols-outlined text-[1rem]">public</span>
          <span>Earth Satellite</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectBasemap('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-label-caps transition-all ${
            basemapMode === 'dark'
              ? 'bg-primary-container text-on-primary-container font-bold shadow-md shadow-primary-container/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
          title="Tactical dark canvas map (No API Key Required)"
        >
          <span className="material-symbols-outlined text-[1rem]">dark_mode</span>
          <span>Tactical Dark</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectBasemap('streets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-label-caps transition-all ${
            basemapMode === 'streets'
              ? 'bg-primary-container text-on-primary-container font-bold shadow-md shadow-primary-container/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
          title="OpenStreetMap tactical vector grid (No API Key Required)"
        >
          <span className="material-symbols-outlined text-[1rem]">map</span>
          <span>Street Grid</span>
        </button>
      </div>

      {/* Desktop Telemetry HUD (Top Right) */}
      <div className="hidden md:flex absolute top-4 right-4 z-10 items-center gap-2">
        <div className="flex items-center gap-2 font-data-sm text-[0.65rem] text-primary/80 bg-surface-container-lowest/80 px-2.5 py-1.5 rounded-lg border border-outline-variant/30 backdrop-blur-sm shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>LAYER: {basemapMode.toUpperCase()}</span>
          <span className="text-outline-variant/60">|</span>
          <span>WGS84</span>
        </div>

        {/* Reset Global View Button */}
        <button
          type="button"
          onClick={handleRecenter}
          className="p-1.5 rounded-lg bg-surface-container-lowest/90 hover:bg-surface-container-high border border-outline-variant/40 text-on-surface-variant hover:text-primary transition-all shadow-md backdrop-blur-md"
          title="Reset Global Earth View"
        >
          <span className="material-symbols-outlined text-[1.125rem]">travel_explore</span>
        </button>

        {/* Fullscreen Map Toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="p-1.5 rounded-lg bg-surface-container-lowest/90 hover:bg-surface-container-high border border-outline-variant/40 text-on-surface-variant hover:text-primary transition-all shadow-md backdrop-blur-md"
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Map'}
        >
          <span className="material-symbols-outlined text-[1.125rem]">
            {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>
      </div>

      {/* Floating Tactical Vertical Controls (Right-Rail - Stitch Spec) */}
      <div className="absolute right-3 bottom-14 md:bottom-6 z-20 flex flex-col gap-1.5">
        {/* Zoom Controls */}
        <div className="flex flex-col bg-surface-container-high/90 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-outline-variant/30">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom In"
            className="w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary active:bg-surface-bright transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
          <div className="h-[1px] w-full bg-surface-container-highest/60" />
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom Out"
            className="w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary active:bg-surface-bright transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">remove</span>
          </button>
        </div>

        {/* Toggle Atmosphere Layers / Basemap */}
        <button
          type="button"
          onClick={handleCycleBasemap}
          aria-label="Toggle Atmosphere Layers"
          title={`Layer: ${basemapMode}`}
          className="w-9 h-9 rounded-xl bg-surface-container-high/90 backdrop-blur-xl flex items-center justify-center text-primary shadow-xl hover:bg-surface-bright border border-outline-variant/30 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">layers</span>
        </button>

        {/* My Coordinates / Geolocation */}
        {onLocateMe && (
          <button
            type="button"
            onClick={onLocateMe}
            aria-label="My Coordinates"
            title="Locate station GPS"
            className="w-9 h-9 rounded-xl bg-surface-container-high/90 backdrop-blur-xl flex items-center justify-center text-on-surface-variant hover:text-primary shadow-xl border border-outline-variant/30 transition-colors"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isLocating ? 'animate-spin text-primary' : userLocation ? 'text-primary' : ''
              }`}
            >
              my_location
            </span>
          </button>
        )}

        {/* Recenter Global */}
        <button
          type="button"
          onClick={handleRecenter}
          aria-label="Recenter Global"
          title="Reset Global Earth View"
          className="w-9 h-9 rounded-xl bg-surface-container-high/90 backdrop-blur-xl flex items-center justify-center text-on-surface-variant hover:text-primary shadow-xl border border-outline-variant/30 transition-colors md:hidden"
        >
          <span className="material-symbols-outlined text-[18px]">travel_explore</span>
        </button>
      </div>

      {/* Floating Category Micro-Legend (Bottom-Left - Stitch Spec) */}
      <div className="absolute left-3 bottom-14 md:bottom-6 z-20 bg-surface-container-lowest/85 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-2.5 shadow-md border border-outline-variant/30">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#fb5a3c]" />
          <span className="font-label-caps text-[9px] text-on-surface-variant uppercase">Fire</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
          <span className="font-label-caps text-[9px] text-on-surface-variant uppercase">Storm</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" />
          <span className="font-label-caps text-[9px] text-on-surface-variant uppercase">Volcano</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf]" />
          <span className="font-label-caps text-[9px] text-on-surface-variant uppercase">Flood</span>
        </div>
      </div>
    </div>
  );
};
