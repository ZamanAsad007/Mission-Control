import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, {
          telegram_chat_id: telegramChatId || undefined,
          discord_webhook: discordWebhook || undefined,
        });
      }
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-surface">
      {/* Left Hero Section: Visual Showcase */}
      <section className="relative lg:w-1/2 min-h-[400px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden border-b lg:border-b-0 lg:border-r border-outline-variant/30">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDfqbpEw9YApXhIh9-MhUoyD-LRzj6pAYOgU2ZSTsEe-GsCYPXwg_uQGXzapCugyEQrag6joRTby56ZYPfnef_PNu1-uJnkv7Fq501OBHm0hpNLt6bXvx4biPuTDL4zoWsWzSXBaE0vH3GnhIts4Cks5aDe-4N3Z3Va3iniOWEsd6zVI9jETbpnL_TesPa8w03JlanEIn4s_S2OSyWB9jxH7pvBAwV6ACP8fSMFKtCIZBbksbHUYgtH')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent lg:hidden pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-surface/40 to-surface hidden lg:block pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-transparent to-surface/90 pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <span className="material-symbols-outlined text-[1.5rem]">rocket_launch</span>
          </div>
          <div className="flex flex-col">
            <span className="font-title-hud text-title-hud text-primary tracking-widest font-bold">
              MISSION CONTROL
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant/80 tracking-widest uppercase">
              FLIGHT OPERATIONS TELEMETRY
            </span>
          </div>
        </div>

        {/* Center quote */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-label-caps text-[0.7rem] uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            SECURE ACCESS GATEWAY
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface leading-tight font-bold mb-3">
            Planetary Defense & Space Observation Network
          </h2>
          <p className="font-body-md text-on-surface-variant leading-relaxed">
            Real-time multi-spectral ingestion tracking near-Earth asteroids, solar coronal mass
            ejections, and planetary natural disasters.
          </p>
        </div>

        {/* Bottom footer status */}
        <div className="relative z-10 flex items-center justify-between text-on-surface-variant font-data-sm text-xs pt-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>NODES: 4 ONLINE (DONKI, EONET, NeoWs, APOD)</span>
          </div>
          <span>UTC {new Date().toISOString().substring(11, 19)}</span>
        </div>
      </section>

      {/* Right Form Section */}
      <section className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
              {mode === 'login' ? 'Operator Sign In' : 'Register Operator'}
            </h1>
            <p className="font-body-sm text-on-surface-variant">
              {mode === 'login'
                ? 'Authenticate to manage alert rules and automated notifications.'
                : 'Create an account to configure custom space weather & planetary triggers.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-lg bg-surface-container border border-outline-variant/30">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-center rounded font-headline-sm text-sm transition-all ${
                mode === 'login'
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-center rounded font-headline-sm text-sm transition-all ${
                mode === 'register'
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-error-container/40 border border-error/40 text-error flex items-center gap-2 font-body-sm text-xs">
              <span className="material-symbols-outlined text-[1.125rem]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Operator Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@mission-control.space"
                className="w-full h-11 px-3.5 rounded-lg bg-surface-container border border-outline-variant/50 text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Security Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-11 px-3.5 rounded-lg bg-surface-container border border-outline-variant/50 text-on-surface font-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider flex items-center justify-between">
                    <span>Telegram Chat ID (Optional)</span>
                    <span className="text-[0.6rem] text-primary">Alert Channel</span>
                  </label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="e.g. 123456789"
                    className="w-full h-11 px-3.5 rounded-lg bg-surface-container border border-outline-variant/50 text-on-surface font-data-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider flex items-center justify-between">
                    <span>Discord Webhook URL (Optional)</span>
                    <span className="text-[0.6rem] text-primary">Alert Channel</span>
                  </label>
                  <input
                    type="url"
                    value={discordWebhook}
                    onChange={(e) => setDiscordWebhook(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full h-11 px-3.5 rounded-lg bg-surface-container border border-outline-variant/50 text-on-surface font-data-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-11 rounded-lg bg-primary-container text-on-primary-container font-headline-sm font-semibold hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[1.25rem]">verified_user</span>
                  <span>{mode === 'login' ? 'Authorize Session' : 'Register Operator'}</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <Link
              to="/"
              className="text-on-surface-variant hover:text-primary font-body-sm text-xs transition-colors inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[1rem]">arrow_back</span>
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};
