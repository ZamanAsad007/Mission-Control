import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">NASA Mission Control</h1>
      <p className="text-on-surface-variant font-body-md">Real-time planetary and space event dashboard.</p>
    </div>
  );
};
