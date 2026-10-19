import React from 'react';

export const SpaceWeatherPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">Space Weather</h1>
      <p className="text-on-surface-variant font-body-md">Solar flares, coronal mass ejections, and geomagnetic telemetry.</p>
    </div>
  );
};
