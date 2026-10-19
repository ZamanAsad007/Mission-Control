import React, { useState } from 'react';
import type { AlertRule } from '@/types';
import { createAlertRule, updateAlertRule, deleteAlertRule, sendTestAlert } from '@/lib/api';
import { kmToLd } from '@/lib/utils';

interface AlertRuleManagerProps {
  rules: AlertRule[];
  onRefresh: () => void;
  initialCategory?: string;
  initialLat?: number;
  initialLng?: number;
}

export const AlertRuleManager: React.FC<AlertRuleManagerProps> = ({
  rules,
  onRefresh,
  initialCategory,
  initialLat,
  initialLng,
}) => {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('New Alert Trigger');
  const [type, setType] = useState<'solar_flare' | 'asteroid' | 'natural_event'>(
    initialCategory ? 'natural_event' : 'solar_flare'
  );

  // Flare Config
  const [minClass, setMinClass] = useState('M5');

  // Asteroid Config
  const [hazardousOnly, setHazardousOnly] = useState(true);
  const [maxMissDistanceKm, setMaxMissDistanceKm] = useState(5000000);

  // Natural Event Config
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : ['wildfire', 'severeStorms']
  );
  const [centerLat, setCenterLat] = useState<number>(initialLat || 23.8);
  const [centerLng, setCenterLng] = useState<number>(initialLng || 90.4);
  const [radiusKm, setRadiusKm] = useState<number>(500);

  // Channels & Cooldown
  const [channels, setChannels] = useState<('telegram' | 'discord' | 'email')[]>([
    'telegram',
    'discord',
  ]);
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(60);

  // Action status
  const [submitting, setSubmitting] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleEdit = (rule: AlertRule) => {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setType(rule.type);
    setChannels(rule.channels || ['telegram']);
    setCooldownMinutes(rule.cooldown_minutes || 60);

    if (rule.type === 'solar_flare') {
      setMinClass(rule.config.minClass || 'M5');
    } else if (rule.type === 'asteroid') {
      setHazardousOnly(rule.config.hazardousOnly ?? true);
      setMaxMissDistanceKm(rule.config.maxMissDistanceKm || 5000000);
    } else if (rule.type === 'natural_event') {
      setSelectedCategories(rule.config.categories || ['wildfire']);
      if (rule.config.center) {
        setCenterLng(rule.config.center[0]);
        setCenterLat(rule.config.center[1]);
      }
      setRadiusKm(rule.config.radiusKm || 500);
    }
  };

  const handleResetForm = () => {
    setEditingRuleId(null);
    setName('New Alert Trigger');
    setType('solar_flare');
    setMinClass('M5');
    setHazardousOnly(true);
    setMaxMissDistanceKm(5000000);
    setSelectedCategories(['wildfire']);
    setChannels(['telegram', 'discord']);
    setCooldownMinutes(60);
    setFeedback(null);
  };

  const handleToggleActive = async (rule: AlertRule) => {
    try {
      await updateAlertRule(rule.id, { active: !rule.active });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to toggle rule state' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      await deleteAlertRule(id);
      if (editingRuleId === id) handleResetForm();
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete rule' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    let config: any = {};
    if (type === 'solar_flare') {
      config = { minClass };
    } else if (type === 'asteroid') {
      config = { hazardousOnly, maxMissDistanceKm: Number(maxMissDistanceKm) };
    } else if (type === 'natural_event') {
      config = {
        categories: selectedCategories,
        center: [Number(centerLng), Number(centerLat)],
        radiusKm: Number(radiusKm),
      };
    }

    try {
      if (editingRuleId) {
        await updateAlertRule(editingRuleId, {
          name,
          type,
          config,
          channels,
          cooldown_minutes: Number(cooldownMinutes),
        });
        setFeedback({ type: 'success', message: 'Alert rule updated successfully!' });
      } else {
        await createAlertRule({
          name,
          type,
          config,
          channels,
          cooldown_minutes: Number(cooldownMinutes),
          active: true,
        });
        setFeedback({ type: 'success', message: 'New alert rule created and activated!' });
        handleResetForm();
      }
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save alert rule' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendTest = async (channel: 'telegram' | 'discord' | 'email') => {
    setTestSending(true);
    setFeedback(null);
    try {
      const res = await sendTestAlert({
        channel,
        message: `[TEST] NASA Mission Control notification test dispatch via ${channel.toUpperCase()}.`,
      });
      setFeedback({
        type: 'success',
        message: res.data?.message || `Test notification dispatched successfully to ${channel}!`,
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || `Failed to dispatch test notification to ${channel}`,
      });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: ACTIVE DISPATCH RULES (5 COLS) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[1.25rem] text-primary">
              notifications_active
            </span>
            <h2 className="font-headline-sm text-sm font-semibold text-on-surface">
              Configured Alert Triggers
            </h2>
          </div>
          <button
            onClick={handleResetForm}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-label-caps text-primary"
          >
            <span className="material-symbols-outlined text-[1rem]">add</span>
            <span>New Rule</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {rules.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[2rem] text-primary/40">
                notifications_off
              </span>
              <p className="font-body-md text-xs">
                No active alert rules configured. Use the form to establish telemetry notification triggers.
              </p>
            </div>
          ) : (
            rules.map((rule) => {
              const isSelected = editingRuleId === rule.id;

              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl bg-surface-container-low border transition-all flex flex-col gap-3 ${
                    isSelected
                      ? 'border-primary shadow-lg shadow-primary/10'
                      : 'border-outline-variant/30 hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-headline-sm text-sm font-bold text-on-surface truncate">
                          {rule.name}
                        </h3>
                        <span className="font-label-caps text-[0.625rem] px-2 py-0.2 rounded uppercase font-semibold bg-surface-container border border-outline-variant/30 text-primary">
                          {rule.type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="font-data-sm text-[0.6875rem] text-on-surface-variant mt-0.5">
                        Cooldown: {rule.cooldown_minutes}m
                      </span>
                    </div>

                    {/* Toggle Active Button */}
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        rule.active ? 'bg-primary-container' : 'bg-surface-container-highest'
                      }`}
                      title={rule.active ? 'Rule Active' : 'Rule Paused'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#070b14] transition-transform ${
                          rule.active ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Conditions Spec Summary */}
                  <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/20 text-xs font-data-sm flex flex-col gap-1">
                    {rule.type === 'solar_flare' && (
                      <span className="text-amber-400">
                        Trigger: Solar Flare Class ≥ {rule.config.minClass || 'M5'}
                      </span>
                    )}
                    {rule.type === 'asteroid' && (
                      <span className="text-secondary">
                        Trigger: {rule.config.hazardousOnly ? 'Hazardous (PHA)' : 'All Asteroids'} ·
                        Dist ≤ {kmToLd(rule.config.maxMissDistanceKm || 5000000)} LD
                      </span>
                    )}
                    {rule.type === 'natural_event' && (
                      <span className="text-rose-400">
                        Trigger: {rule.config.categories?.join(', ')} · Radius {rule.config.radiusKm} km
                      </span>
                    )}
                  </div>

                  {/* Channels & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
                    <div className="flex items-center gap-1.5">
                      {rule.channels.map((ch) => (
                        <span
                          key={ch}
                          className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface text-[0.625rem] font-mono uppercase"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit Rule"
                      >
                        <span className="material-symbols-outlined text-[1.125rem]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1 rounded text-on-surface-variant hover:text-rose-400 transition-colors"
                        title="Delete Rule"
                      >
                        <span className="material-symbols-outlined text-[1.125rem]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: RULE EDITOR / CONFIGURATION (7 COLS) */}
      <div className="lg:col-span-7 flex flex-col gap-4 p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-xl">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[1.25rem] text-primary">
              app_registration
            </span>
            <h2 className="font-headline-sm text-sm font-semibold text-on-surface">
              {editingRuleId ? 'Edit Alert Trigger Configuration' : 'Establish New Alert Trigger'}
            </h2>
          </div>
          {editingRuleId && (
            <button
              onClick={handleResetForm}
              className="text-xs text-on-surface-variant hover:text-primary"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-lg border flex items-center gap-2 font-body-sm text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-error-container/30 border-error/40 text-error'
            }`}
          >
            <span className="material-symbols-outlined text-[1.125rem]">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Rule Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
              Rule Designation Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Major Solar Flare Flare Alert"
              className="w-full h-10 px-3.5 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface font-body-md text-sm focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Event Type Cards */}
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
              Telemetry Event Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'solar_flare', label: 'Solar Flare', icon: 'bolt', color: 'text-amber-400' },
                { id: 'asteroid', label: 'Near-Earth Asteroid', icon: 'radar', color: 'text-secondary' },
                { id: 'natural_event', label: 'Natural Hazard', icon: 'public', color: 'text-rose-400' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setType(opt.id as any)}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    type === opt.id
                      ? 'bg-surface-container border-primary shadow-sm'
                      : 'bg-surface-container-low border-outline-variant/30 hover:border-outline-variant'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[1.25rem] ${opt.color}`}>
                    {opt.icon}
                  </span>
                  <span className="font-headline-sm text-xs font-bold text-on-surface">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Criteria Spec per Type */}
          <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col gap-4">
            <span className="font-label-caps text-xs text-primary uppercase tracking-wider font-semibold">
              Trigger Criteria Parameters
            </span>

            {type === 'solar_flare' && (
              <div className="flex flex-col gap-2">
                <label className="font-data-sm text-xs text-on-surface-variant flex items-center justify-between">
                  <span>Minimum Solar Flare Class Threshold</span>
                  <span className="text-amber-400 font-bold">{minClass} Class</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['C1', 'M1', 'M5', 'X1'].map((cls) => (
                    <button
                      type="button"
                      key={cls}
                      onClick={() => setMinClass(cls)}
                      className={`py-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                        minClass === cls
                          ? 'bg-amber-400 text-[#070b14] border-amber-400'
                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:text-on-surface'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {type === 'asteroid' && (
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hazardousOnly}
                    onChange={(e) => setHazardousOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-secondary"
                  />
                  <span className="font-data-sm text-xs text-on-surface font-semibold">
                    Filter to Potentially Hazardous Asteroids (PHA) Only
                  </span>
                </label>

                <div className="flex flex-col gap-1.5">
                  <label className="font-data-sm text-xs text-on-surface-variant flex items-center justify-between">
                    <span>Maximum Close Approach Distance</span>
                    <span className="text-secondary font-bold">
                      {kmToLd(maxMissDistanceKm)} LD ({Number(maxMissDistanceKm).toLocaleString()} km)
                    </span>
                  </label>
                  <input
                    type="range"
                    min={384400}
                    max={10000000}
                    step={100000}
                    value={maxMissDistanceKm}
                    onChange={(e) => setMaxMissDistanceKm(Number(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {type === 'natural_event' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-data-sm text-xs text-on-surface-variant">
                    Hazard Categories
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'wildfire', label: 'Wildfires' },
                      { id: 'severeStorms', label: 'Severe Storms' },
                      { id: 'volcanoes', label: 'Volcanoes' },
                      { id: 'seaLakeIce', label: 'Sea & Lake Ice' },
                    ].map((cat) => {
                      const isChecked = selectedCategories.includes(cat.id);
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedCategories(selectedCategories.filter((c) => c !== cat.id));
                            } else {
                              setSelectedCategories([...selectedCategories, cat.id]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-label-caps transition-all ${
                            isChecked
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold'
                              : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-data-sm text-[0.625rem] text-on-surface-variant">
                      CENTER LATITUDE
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={centerLat}
                      onChange={(e) => setCenterLat(Number(e.target.value))}
                      className="h-8 px-2 rounded bg-surface-container-low border border-outline-variant/40 font-mono text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-data-sm text-[0.625rem] text-on-surface-variant">
                      CENTER LONGITUDE
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={centerLng}
                      onChange={(e) => setCenterLng(Number(e.target.value))}
                      className="h-8 px-2 rounded bg-surface-container-low border border-outline-variant/40 font-mono text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-data-sm text-[0.625rem] text-on-surface-variant">
                      RADIUS (KM)
                    </label>
                    <input
                      type="number"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      className="h-8 px-2 rounded bg-surface-container-low border border-outline-variant/40 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dispatch Channels & Cooldown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                Notification Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {(['telegram', 'discord', 'email'] as const).map((ch) => {
                  const isChecked = channels.includes(ch);
                  return (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => {
                        if (isChecked) {
                          if (channels.length > 1) setChannels(channels.filter((c) => c !== ch));
                        } else {
                          setChannels([...channels, ch]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-label-caps uppercase transition-all ${
                        isChecked
                          ? 'bg-primary-container text-on-primary-container border-primary font-bold'
                          : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                Cooldown Threshold
              </label>
              <select
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                className="h-10 px-3 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface font-body-sm text-xs focus:outline-none focus:border-primary"
              >
                <option value={15}>15 Minutes (High Priority)</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes (Standard)</option>
                <option value={360}>6 Hours (Low Frequency)</option>
                <option value={1440}>24 Hours (Daily Digest)</option>
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-outline-variant/30">
            {/* Test Notification Trigger */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['telegram', 'discord', 'email'] as const).map((ch) => (
                <button
                  type="button"
                  key={ch}
                  disabled={testSending}
                  onClick={() => handleSendTest(ch)}
                  className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-[0.6875rem] font-label-caps text-on-surface-variant hover:text-primary transition-all disabled:opacity-50"
                  title={`Send immediate test alert to ${ch}`}
                >
                  Test {ch}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-xs font-semibold hover:bg-primary transition-all shadow-md shadow-primary-container/20 disabled:opacity-50"
            >
              {submitting ? 'Transmitting...' : editingRuleId ? 'Update Alert Rule' : 'Save & Activate Trigger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
