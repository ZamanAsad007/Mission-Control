import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { ProfileEditModal } from '@/components/profile/ProfileEditModal';
import { useEventStream } from '@/hooks/useEventStream';

export const AppLayout: React.FC = () => {
  const { status } = useEventStream();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex hud-grid-pattern">
      <Sidebar onOpenProfile={() => setIsProfileOpen(true)} />
      <div className="flex-1 ml-0 md:ml-60 flex flex-col min-w-0">
        <Header
          streamStatus={status}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
        <main className="relative pt-16 min-h-screen w-full px-4 md:px-8 py-4 md:py-6 pb-24 md:pb-6 max-w-7xl mx-auto flex flex-col gap-6">
          <Outlet context={{ searchTerm }} />
        </main>
      </div>
      <MobileBottomNav />

      {/* Global Operator Profile Edit Modal (Desktop & Mobile) */}
      <ProfileEditModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};
