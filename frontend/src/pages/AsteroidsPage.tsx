import React from 'react';

export const AsteroidsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">3D Asteroid Radar</h1>
      <p className="text-on-surface-variant font-body-md">Orbital telemetry for near-Earth asteroids.</p>
    </div>
  );
};
