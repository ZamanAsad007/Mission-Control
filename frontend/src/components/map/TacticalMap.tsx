import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MissionEvent } from '@/types';
import { getEventCoordinates } from '@/lib/utils';

interface TacticalMapProps {
  events: MissionEvent[];
  selectedEvent: MissionEvent | null;
  onSelectEvent: (event: MissionEvent) => void;
  userLocation: [number, number] | null;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  userLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    // Clear any residual Leaflet ID from DOM container
    delete (mapContainerRef.current as any)._leaflet_id;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Invalidate size to ensure proper tile coverage
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when events or selectedEvent change
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

      let color = '#22d3ee'; // default cyan
      let ringColor = 'rgba(34, 211, 238, 0.4)';
      let icon = 'flare';

      if (category.includes('wildfire')) {
        color = '#fb5a3c'; // red-orange
        ringColor = 'rgba(251, 90, 60, 0.4)';
        icon = 'local_fire_department';
      } else if (category.includes('storm')) {
        color = '#3b82f6'; // cobalt blue
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

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <span class="absolute w-8 h-8 rounded-full animate-ping opacity-75" style="background-color: ${ringColor}; animation-duration: 2s;"></span>
          <div class="relative w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform transform ${
            isSelected ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#070b14]' : 'group-hover:scale-110'
          }" style="background-color: ${color}; border: 1.5px solid rgba(255,255,255,0.8);">
            <span class="material-symbols-outlined text-[14px] text-[#070b14] font-bold">${icon}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        onSelectEvent(evt);
        map.flyTo([lat, lng], Math.max(map.getZoom(), 6), { duration: 1.2 });
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
      duration: 1.2,
    });
  }, [selectedEvent]);

  // User location marker and geofence radar circle
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
          <span class="absolute w-10 h-10 rounded-full animate-ping bg-primary-container/40"></span>
          <div class="w-6 h-6 rounded-full bg-primary-container border-2 border-white flex items-center justify-center shadow-xl">
            <span class="material-symbols-outlined text-[12px] text-[#070b14]">my_location</span>
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

      // Draw 1,000 km tactical perimeter
      userCircleRef.current = L.circle([lat, lng], {
        radius: 1000 * 1000,
        color: '#22d3ee',
        weight: 1.5,
        dashArray: '5, 8',
        fillColor: '#22d3ee',
        fillOpacity: 0.05,
      }).addTo(map);

      map.flyTo([lat, lng], 5, { duration: 1.5 });
    }
  }, [userLocation]);

  return (
    <div className="relative w-full h-[680px] rounded-2xl overflow-hidden border border-outline-variant/30 bg-[#070b14] shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {/* Reticle crosshair HUD overlay in corners */}
      <div className="absolute top-4 right-4 pointer-events-none z-10 font-data-sm text-[0.65rem] text-primary/70 bg-surface-container-lowest/80 px-2 py-1 rounded border border-outline-variant/30 backdrop-blur-sm">
        GRID: EPSG:4326 · WGS84
      </div>
    </div>
  );
};
