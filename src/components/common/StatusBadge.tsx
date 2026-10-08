import React from 'react';
import { ComplaintStatus, ComplaintPriority } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  PlayCircle,
  Sparkles,
  UserCheck,
  Search,
} from 'lucide-react';

export const StatusBadge: React.FC<{ status: ComplaintStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'SUBMITTED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${className}`}
        >
          <Clock className="w-3 h-3 text-slate-500" />
          Submitted
        </span>
      );
    case 'AI_ANALYZED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800 ${className}`}
        >
          <Sparkles className="w-3 h-3 text-violet-500" />
          AI Analyzed
        </span>
      );
    case 'ASSIGNED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 ${className}`}
        >
          <UserCheck className="w-3 h-3 text-blue-500" />
          Assigned
        </span>
      );
    case 'IN_REVIEW':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 ${className}`}
        >
          <Search className="w-3 h-3 text-cyan-500" />
          In Review
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${className}`}
        >
          <PlayCircle className="w-3 h-3 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
          In Progress
        </span>
      );
    case 'RESOLVED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Resolved
        </span>
      );
    case 'CLOSED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-slate-500" />
          Closed
        </span>
      );
    case 'ESCALATED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ${className}`}
        >
          <AlertTriangle className="w-3 h-3 text-rose-600 animate-pulse" />
          Escalated
        </span>
      );
    case 'REOPENED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800 ${className}`}
        >
          <RotateCcw className="w-3 h-3 text-orange-500" />
          Reopened
        </span>
      );
    case 'REJECTED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 ${className}`}
        >
          <XCircle className="w-3 h-3 text-red-500" />
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
          {status}
        </span>
      );
  }
};

export const PriorityBadge: React.FC<{ priority: ComplaintPriority; className?: string }> = ({
  priority,
  className = '',
}) => {
  switch (priority) {
    case 'CRITICAL':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white shadow-xs ${className}`}
        >
          <AlertTriangle className="w-3 h-3" />
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-500 text-white ${className}`}
        >
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-700 ${className}`}
        >
          MEDIUM
        </span>
      );
    case 'LOW':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ${className}`}
        >
          LOW
        </span>
      );
    default:
      return <span>{priority}</span>;
  }
};
