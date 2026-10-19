import React from 'react';

export const AlertsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">Alert Monitor & Rules</h1>
      <p className="text-on-surface-variant font-body-md">Configure notification triggers for space & earth events.</p>
    </div>
  );
};
