import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAsteroids } from '@/lib/api';
import { AsteroidRadar3D } from '@/components/asteroids/AsteroidRadar3D';
import type { Asteroid } from '@/types';

export const AsteroidsPage: React.FC = () => {
  const [selectedAsteroid, setSelectedAsteroid] = useState<Asteroid | null>(null);

  const { data: asteroidsResponse, isLoading } = useQuery({
    queryKey: ['asteroids', 'all'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      return getAsteroids({ from: today, to: nextWeek });
    },
    refetchInterval: 60000,
  });

  const asteroids = asteroidsResponse?.data || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
              3D Asteroid Radar (NeoWs)
            </h1>
          </div>
          <p className="font-body-md text-xs text-on-surface-variant">
            Near-Earth Objects approaching within 0.05 AU (19.5 Lunar Distances) over the next 7 days
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-data-sm text-xs text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
            {isLoading ? 'Scanning orbits...' : `${asteroids.length} Tracked NEOs`}
          </span>
        </div>
      </div>

      {/* 3D Scene */}
      <AsteroidRadar3D
        asteroids={asteroids}
        selectedAsteroid={selectedAsteroid}
        onSelectAsteroid={setSelectedAsteroid}
      />
    </div>
  );
};
