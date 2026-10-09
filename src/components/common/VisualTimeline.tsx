import React from 'react';
import { TimelineEvent, ComplaintStatus } from '../../types';
import { StatusBadge } from './StatusBadge';
import {
  Calendar,
  User,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';

const PROGRESS_STEPS: Array<{
  id: string;
  label: string;
  sublabel: string;
}> = [
  { id: 'REPORTED', label: 'Reported', sublabel: 'Complaint filed' },
  { id: 'UNDER_REVIEW', label: 'Under Review', sublabel: 'AI / Dept triage' },
  { id: 'IN_PROGRESS', label: 'In Progress', sublabel: 'Active resolution' },
  { id: 'RESOLVED', label: 'Resolved', sublabel: 'Verified & rated' },
];

function getActiveStepIndex(status: ComplaintStatus): number {
  switch (status) {
    case 'SUBMITTED':
      return 0;
    case 'AI_ANALYZED':
    case 'IN_REVIEW':
    case 'ASSIGNED':
    case 'REOPENED':
      return 1;
    case 'IN_PROGRESS':
    case 'ESCALATED':
      return 2;
    case 'RESOLVED':
    case 'CLOSED':
      return 3;
    default:
      return 0;
  }
}

export const VisualTimeline: React.FC<{
  events: TimelineEvent[];
  currentStatus?: ComplaintStatus;
}> = ({ events, currentStatus = 'SUBMITTED' }) => {
  const activeIndex = getActiveStepIndex(currentStatus);
  const isEscalatedOrReopened = currentStatus === 'ESCALATED' || currentStatus === 'REOPENED';

  return (
    <div className="space-y-6">
      {/* 5-Stage Horizontal Progress Stepper */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Resolution Lifecycle Stepper
          </span>
          {isEscalatedOrReopened && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{currentStatus === 'ESCALATED' ? 'Escalated to Admin / HOD' : 'Reopened for Verification'}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {PROGRESS_STEPS.map((step, idx) => {
            const isCompleted = idx < activeIndex || (idx === 3 && activeIndex === 3);
            const isCurrent = idx === activeIndex && !(idx === 3 && activeIndex === 3);

            return (
              <div
                key={step.id}
                className={`p-2.5 rounded-xl border transition-all flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1 ${
                  isCompleted
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : isCurrent
                    ? isEscalatedOrReopened
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                      : 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between w-auto sm:w-full">
                  <span
                    className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? isEscalatedOrReopened
                          ? 'bg-rose-600 text-white'
                          : 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </span>
                  {isCurrent && !isCompleted && (
                    <Clock className="w-3.5 h-3.5 text-indigo-500 hidden sm:block animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">{step.label}</div>
                  <div className="text-[10px] opacity-75">{step.sublabel}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Audit Event History */}
      {!events || events.length === 0 ? (
        <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
          No timeline events recorded yet.
        </div>
      ) : (
        <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {events.map((event, index) => {
            const isLatest = index === events.length - 1;
            const eventDate = new Date(event.timestamp);

            return (
              <div key={event.id || index} className="relative group">
                <div
                  className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isLatest
                      ? 'bg-indigo-600 border-indigo-200 text-white shadow-sm ring-4 ring-indigo-100 dark:ring-indigo-950'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isLatest ? 'bg-white' : 'bg-slate-400'}`} />
                </div>

                <div className="bg-white dark:bg-slate-900/80 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                          <span className="text-[10px] font-semibold text-slate-400">
                            · {event.changedByRole.replace('_', ' ')}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 tabular-nums">
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

                  {event.proofImageUrl && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                        <ImageIcon className="w-3 h-3 text-indigo-500" />
                        <span>Attached Visual Verification Proof</span>
                      </span>
                      <img
                        src={event.proofImageUrl}
                        alt="Timeline verification proof"
                        referrerPolicy="no-referrer"
                        className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
