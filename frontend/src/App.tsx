import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { MapPage } from '@/pages/MapPage';
import { AsteroidsPage } from '@/pages/AsteroidsPage';
import { SpaceWeatherPage } from '@/pages/SpaceWeatherPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { LoginPage } from '@/pages/LoginPage';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="asteroids" element={<AsteroidsPage />} />
        <Route path="space-weather" element={<SpaceWeatherPage />} />
        <Route path="alerts" element={<AlertsPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
