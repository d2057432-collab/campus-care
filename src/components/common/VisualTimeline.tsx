import React from 'react';
import { TimelineEvent } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Calendar, User, ShieldAlert, Cpu } from 'lucide-react';

export const VisualTimeline: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
        No timeline events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {events.map((event, index) => {
        const isLatest = index === events.length - 1;
        const eventDate = new Date(event.timestamp);

        return (
          <div key={event.id || index} className="relative group">
            {/* Timeline node icon */}
            <div
              className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                isLatest
                  ? 'bg-indigo-600 border-indigo-200 text-white shadow-sm ring-4 ring-indigo-100 dark:ring-indigo-950'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isLatest ? 'bg-white' : 'bg-slate-400'}`} />
            </div>

            <div className="bg-white dark:bg-slate-900/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <StatusBadge status={event.status} />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {event.changedByRole === 'SYSTEM' ? (
                      <Cpu className="w-3 h-3 text-violet-500" />
                    ) : event.changedByRole === 'ADMIN' || event.changedByRole === 'SUPER_ADMIN' ? (
                      <ShieldAlert className="w-3 h-3 text-rose-500" />
                    ) : (
                      <User className="w-3 h-3 text-slate-400" />
                    )}
                    {event.changedByName || event.changedBy}
                    {event.changedByRole && event.changedByRole !== 'SYSTEM' && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {event.changedByRole.replace('_', ' ')}
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {eventDate.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  at{' '}
                  {eventDate.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {event.comment && (
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                  {event.comment}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
