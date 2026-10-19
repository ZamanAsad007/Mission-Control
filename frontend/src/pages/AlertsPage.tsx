import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { getAlertRules, getAlertHistory } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AlertRuleManager } from '@/components/alerts/AlertRuleManager';
import { NotificationHistoryTable } from '@/components/alerts/NotificationHistoryTable';

export const AlertsPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');

  const initialCategory = searchParams.get('category') || undefined;
  const initialLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const initialLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;

  // Rules query
  const {
    data: rulesResponse,
    isLoading: isRulesLoading,
    refetch: refetchRules,
  } = useQuery({
    queryKey: ['alerts', 'rules'],
    queryFn: getAlertRules,
    enabled: isAuthenticated,
  });

  // History query
  const {
    data: historyResponse,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ['alerts', 'history'],
    queryFn: () => getAlertHistory({ limit: 50 }),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const rules = rulesResponse?.data || [];
  const deliveries = historyResponse?.data || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface">
              Alert Rules & Automated Dispatch
            </h1>
          </div>
          <p className="font-body-md text-xs text-on-surface-variant">
            Multi-channel telemetry incident notifications (Telegram, Discord Webhooks, SMTP Email)
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1 rounded-lg bg-surface-container border border-outline-variant/30 text-xs font-label-caps self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'rules'
                ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[1rem]">tune</span>
            <span>Rules ({rules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'history'
                ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[1rem]">history</span>
            <span>History ({deliveries.length})</span>
          </button>
        </div>
      </div>

      {/* Operator Auth Gate Notice (if not logged in) */}
      {!isAuthenticated ? (
        <div className="p-8 rounded-2xl bg-surface-container-low border border-primary/30 shadow-2xl flex flex-col items-center text-center gap-4 max-w-xl mx-auto my-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <span className="material-symbols-outlined text-[2rem]">lock</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="font-headline-md text-lg font-bold text-on-surface">
              Operator Authentication Required
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
              Alert rules and notification channels are protected under NASA Flight Control security
              protocols. Sign in or register your operator session to establish triggers.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/login"
              className="px-5 py-2 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-xs font-semibold hover:bg-primary transition-all shadow-md shadow-primary-container/20 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[1rem]">key</span>
              <span>Operator Sign In / Register</span>
            </Link>
          </div>
        </div>
      ) : activeTab === 'rules' ? (
        <AlertRuleManager
          rules={rules}
          onRefresh={refetchRules}
          initialCategory={initialCategory}
          initialLat={initialLat}
          initialLng={initialLng}
        />
      ) : (
        <NotificationHistoryTable
          deliveries={deliveries}
          isLoading={isHistoryLoading}
        />
      )}
    </div>
  );
};
