import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, logout } = useAuth();

  const [telegramChatId, setTelegramChatId] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Sync state when user changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setTelegramChatId(user.telegram_chat_id || '');
      setDiscordWebhook(user.discord_webhook || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setStatusMessage(null);
    }
  }, [user, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    // Validation for password change
    if (showPasswordSection && (newPassword || currentPassword)) {
      if (!currentPassword) {
        setStatusMessage({
          type: 'error',
          text: 'Current password is required to update your password.',
        });
        return;
      }
      if (newPassword.length < 6) {
        setStatusMessage({
          type: 'error',
          text: 'New password must be at least 6 characters long.',
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatusMessage({
          type: 'error',
          text: 'New password and confirmation password do not match.',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        telegram_chat_id: telegramChatId.trim() || null,
        discord_webhook: discordWebhook.trim() || null,
        ...(showPasswordSection && newPassword
          ? { current_password: currentPassword, new_password: newPassword }
          : {}),
      });

      setStatusMessage({
        type: 'success',
        text: 'Operator profile and alert channels updated successfully.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-surface-container rounded-2xl border border-primary/30 p-5 sm:p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-container/20 border border-primary-container/40 flex items-center justify-center text-primary-container shadow-[0_0_12px_rgba(34,211,238,0.25)]">
              <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface truncate">
                Operator Profile Settings
              </h2>
              <span className="font-label-caps text-[10px] text-primary tracking-widest uppercase">
                NASA MISSION CONTROL // CLEARANCE
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* User Identity Banner */}
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-base uppercase shrink-0 shadow-sm">
              {user.email.substring(0, 2)}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-body-md text-sm font-semibold text-on-surface truncate">
                  {user.email}
                </span>
                <span className="font-label-caps text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0 font-bold">
                  ACTIVE
                </span>
              </div>
              <span className="font-label-caps text-[11px] text-on-surface-variant mt-0.5">
                Role: Flight Operations Specialist
              </span>
              {user.created_at && (
                <span className="font-data-sm text-[10px] text-outline mt-0.5">
                  Station Registered: {formatDate(user.created_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status / Alert Feedback Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-body-sm animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {statusMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Notification Endpoints Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 border-b border-outline-variant/20 pb-1.5">
              <span className="material-symbols-outlined text-primary text-[16px]">
                notifications_active
              </span>
              <span className="font-label-caps text-xs text-primary uppercase font-bold tracking-wider">
                Telemetry Alert Dispatch Channels
              </span>
            </div>

            {/* Telegram Chat ID */}
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-xs text-on-surface-variant flex items-center justify-between">
                <span>Telegram Chat ID</span>
                <span className="text-[10px] text-outline font-normal">Push Notifications</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px] pointer-events-none">
                  send
                </span>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. 123456789"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low border border-outline-variant/40 font-mono text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <p className="font-data-sm text-[10px] text-on-surface-variant/70 leading-tight">
                Used to deliver instantaneous solar flare, asteroid close pass, and cyclone alerts
                directly to your Telegram.
              </p>
            </div>

            {/* Discord Webhook URL */}
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-xs text-on-surface-variant flex items-center justify-between">
                <span>Discord Webhook URL</span>
                <span className="text-[10px] text-outline font-normal">Channel Embeds</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px] pointer-events-none">
                  webhook
                </span>
                <input
                  type="url"
                  value={discordWebhook}
                  onChange={(e) => setDiscordWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low border border-outline-variant/40 font-mono text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <p className="font-data-sm text-[10px] text-on-surface-variant/70 leading-tight">
                Publishes rich telemetry cards and radar hazard warnings to your Discord server.
              </p>
            </div>
          </div>

          {/* Password Change Toggle & Fields */}
          <div className="flex flex-col gap-2.5 pt-1 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={() => setShowPasswordSection((prev) => !prev)}
              className="flex items-center justify-between text-xs font-label-caps text-on-surface hover:text-primary transition-colors py-1 select-none"
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">key</span>
                <span>Change Security Password</span>
              </div>
              <span className="material-symbols-outlined text-[18px]">
                {showPasswordSection ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {showPasswordSection && (
              <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 animate-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-1">
                  <label className="font-label-caps text-[10px] text-on-surface-variant">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-9 px-3 rounded-lg bg-surface-container border border-outline-variant/40 font-body-sm text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-[10px] text-on-surface-variant">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full h-9 px-3 rounded-lg bg-surface-container border border-outline-variant/40 font-body-sm text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-caps text-[10px] text-on-surface-variant">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full h-9 px-3 rounded-lg bg-surface-container border border-outline-variant/40 font-body-sm text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg bg-surface-container-high hover:bg-rose-500/10 text-on-surface-variant hover:text-rose-400 font-label-caps text-xs flex items-center gap-1.5 transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant font-label-caps text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-headline-sm text-xs font-semibold shadow-md shadow-primary-container/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
