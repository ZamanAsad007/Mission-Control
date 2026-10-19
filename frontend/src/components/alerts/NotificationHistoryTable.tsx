import React from 'react';
import type { AlertDelivery } from '@/types';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface NotificationHistoryTableProps {
  deliveries: AlertDelivery[];
  isLoading: boolean;
}

export const NotificationHistoryTable: React.FC<NotificationHistoryTableProps> = ({
  deliveries,
  isLoading,
}) => {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-lg">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[1.25rem] text-primary">
            history
          </span>
          <h2 className="font-headline-sm text-sm font-semibold text-on-surface">
            Notification Dispatch History & Audit Trail
          </h2>
        </div>
        <span className="font-data-sm text-xs text-on-surface-variant">
          {deliveries.length} Records Logged
        </span>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border border-outline-variant/20">
        <table className="w-full text-left border-collapse text-xs font-data-sm">
          <thead>
            <tr className="bg-surface-container-high/60 border-b border-outline-variant/30 text-on-surface-variant font-label-caps uppercase tracking-wider">
              <th className="py-2.5 px-3">Delivery ID</th>
              <th className="py-2.5 px-3">Event Ref / Rule ID</th>
              <th className="py-2.5 px-3">Channel</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Dispatched At</th>
              <th className="py-2.5 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-on-surface-variant">
                  Loading dispatch records...
                </td>
              </tr>
            ) : deliveries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                  No notification deliveries registered yet. Triggers will log deliveries here.
                </td>
              </tr>
            ) : (
              deliveries.map((del) => {
                let statusBadge = (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-label-caps text-[0.625rem] font-bold border border-emerald-500/30">
                    DELIVERED
                  </span>
                );

                if (del.status === 'failed') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-label-caps text-[0.625rem] font-bold border border-rose-500/30">
                      FAILED
                    </span>
                  );
                } else if (del.status === 'cooldown') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-label-caps text-[0.625rem] font-bold border border-amber-500/30">
                      COOLDOWN
                    </span>
                  );
                } else if (del.status === 'skipped') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-caps text-[0.625rem] border border-outline-variant/30">
                      DEDUPED
                    </span>
                  );
                }

                return (
                  <tr key={del.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[0.7rem] text-primary truncate max-w-[120px]">
                      {del.id.substring(0, 8)}...
                    </td>
                    <td className="py-2.5 px-3 text-on-surface font-semibold truncate max-w-[180px]">
                      {del.event_ref || del.rule_id}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[0.6875rem]">
                      <span className="px-2 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface">
                        {del.channel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{statusBadge}</td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      {formatDate(del.sent_at)} · {formatRelativeTime(del.sent_at)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-on-surface-variant/70 text-[0.6875rem]">
                      {del.error ? (
                        <span className="text-rose-400 truncate max-w-[160px] inline-block" title={del.error}>
                          {del.error}
                        </span>
                      ) : (
                        <span className="text-emerald-400">Success</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
