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

  const handleRecenter = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([20, 0], 3, { duration: 0.8 });
  }, []);

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
      zoomControl: false,
      attributionControl: false,
    });

    // Basemap tile group
    const tilesGroup = L.layerGroup().addTo(map);
    tilesLayerGroupRef.current = tilesGroup;

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Markers layer
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Ensure proper initial size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      tilesLayerGroupRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update Basemap Tiles with Optimized Caching & Buffering
  useEffect(() => {
    const tileGroup = tilesLayerGroupRef.current;
    if (!tileGroup) return;

    tileGroup.clearLayers();

    const tileBounds: L.LatLngBoundsExpression = [
      [SOUTH_BOUND, -180],
      [NORTH_BOUND, 180],
    ];

    const commonTileOpts: L.TileLayerOptions = {
      bounds: tileBounds,
      noWrap: false,
      updateWhenZooming: false, // Freeze tile requests during zoom transition for 60fps animations
      updateWhenIdle: false,
      updateInterval: 120, // Throttle tile fetch during rapid dragging
      keepBuffer: 6, // Keep 6 tiles pre-cached outside viewport for butter-smooth panning
    };

    if (basemapMode === 'satellite') {
      const base = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          ...commonTileOpts,
          maxZoom: 18,
          maxNativeZoom: 18,
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        }
      );

      const boundaries = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          ...commonTileOpts,
          maxZoom: 18,
          maxNativeZoom: 18,
          opacity: 0.85,
        }
      );

      tileGroup.addLayer(base);
      tileGroup.addLayer(boundaries);
    } else if (basemapMode === 'dark') {
      const base = L.tileLayer(
        'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          ...commonTileOpts,
          maxZoom: 18,
          maxNativeZoom: 16,
          attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
        }
      );

      const labels = L.tileLayer(
        'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          ...commonTileOpts,
          maxZoom: 18,
          maxNativeZoom: 16,
          opacity: 0.9,
        }
      );

      tileGroup.addLayer(base);
      tileGroup.addLayer(labels);
    } else {
      const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        ...commonTileOpts,
        maxZoom: 18,
        maxNativeZoom: 19,
        className: 'leaflet-tile-dark',
        attribution: '&copy; OpenStreetMap contributors',
      });

      tileGroup.addLayer(streets);
    }
  }, [basemapMode]);

  // Update Markers with Lightweight, High-Performance DOM Nodes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    events.forEach((evt) => {
      const coords = getEventCoordinates(evt);
      if (!coords) return;

      const [lng, lat] = coords;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      const isSelected = selectedEvent?.id === evt.id;
      const category = (evt.category || '').toLowerCase();

      let color = '#22d3ee'; // cyan
      let ringColor = 'rgba(34, 211, 238, 0.4)';
      let icon = 'flare';

      if (category.includes('wildfire')) {
        color = '#fb5a3c'; // red-orange
        ringColor = 'rgba(251, 90, 60, 0.4)';
        icon = 'local_fire_department';
      } else if (category.includes('storm')) {
        color = '#3b82f6'; // blue
        ringColor = 'rgba(59, 130, 246, 0.4)';
        icon = 'air';
      } else if (category.includes('volcano')) {
        color = '#f43f5e'; // rose
        ringColor = 'rgba(244, 63, 94, 0.4)';
        icon = 'volcano';
      } else if (category.includes('ice')) {
        color = '#38bdf8'; // light cyan
        ringColor = 'rgba(56, 189, 248, 0.4)';
        icon = 'ac_unit';
      } else if (category.includes('flood')) {
        color = '#2dd4bf'; // teal
        ringColor = 'rgba(45, 212, 191, 0.4)';
        icon = 'flood';
      }

      // Performance Optimization: Only animate ping on the selected marker!
      // Running 300 simultaneous animate-ping keyframes severely lags the browser compositor.
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer pointer-events-auto">
          ${
            isSelected
              ? `<span class="absolute w-8 h-8 rounded-full animate-ping opacity-75" style="background-color: ${ringColor}; animation-duration: 1.5s;"></span>`
              : ''
          }
          <div class="relative w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform duration-150 ${
            isSelected
              ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#070b14]'
              : 'hover:scale-115'
          }" style="background-color: ${color}; border: 1.5px solid rgba(255,255,255,0.85);">
            <span class="material-symbols-outlined text-[13px] text-[#070b14] font-bold select-none leading-none">${icon}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: iconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([lat, lng], {
        icon: customIcon,
        riseOnHover: true,
      });

      marker.on('click', () => {
        onSelectEvent(evt);
        map.flyTo([lat, lng], Math.max(map.getZoom(), 6), { duration: 0.8 });
      });

      marker.addTo(markersLayer);
    });
  }, [events, selectedEvent, onSelectEvent]);

  // Center on selected event if changed externally
  useEffect(() => {
    if (!selectedEvent || !mapInstanceRef.current) return;
    const coords = getEventCoordinates(selectedEvent);
    if (!coords) return;
    const [lng, lat] = coords;
    mapInstanceRef.current.flyTo([lat, lng], Math.max(mapInstanceRef.current.getZoom(), 6), {
      duration: 0.8,
    });
  }, [selectedEvent]);

  // User location marker and geofence radar circle (using Canvas)
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
        <div class="relative flex items-center justify-center">
          <span class="absolute w-8 h-8 rounded-full animate-ping bg-primary-container/40"></span>
          <div class="w-5 h-5 rounded-full bg-primary-container border-2 border-white flex items-center justify-center shadow-lg">
            <span class="material-symbols-outlined text-[11px] text-[#070b14]">my_location</span>
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: userHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(map);

      // 1,000 km tactical perimeter drawn on Canvas renderer for zero lag
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
          : 'relative w-full h-[520px] md:h-[580px] lg:h-[calc(100vh-17.5rem)] min-h-[460px] max-h-[720px] rounded-2xl overflow-hidden border border-outline-variant/30 bg-[#070b14] shadow-2xl'
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Basemap Switcher HUD (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex items-center bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-1 border border-outline-variant/40 shadow-2xl">
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

      {/* Telemetry HUD & Viewport Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 font-data-sm text-[0.65rem] text-primary/80 bg-surface-container-lowest/80 px-2.5 py-1.5 rounded-lg border border-outline-variant/30 backdrop-blur-sm shadow-md">
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
    </div>
  );
};
