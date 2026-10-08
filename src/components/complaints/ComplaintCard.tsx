import React from 'react';
import { Complaint } from '../../types';
import { StatusBadge, PriorityBadge } from '../common/StatusBadge';
import {
  Clock,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  User,
  Star,
  CheckCircle,
} from 'lucide-react';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick: (complaint: Complaint) => void;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, onClick }) => {
  const createdDate = new Date(complaint.createdAt);

  return (
    <div
      onClick={() => onClick(complaint)}
      className="group relative bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
              {complaint.complaintId}
            </span>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>

          {complaint.isOverdue && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> SLA Overdue
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 mb-1.5">
          {complaint.title}
        </h4>

        {/* Snippet */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
          {complaint.description}
        </p>

        {/* Duplicate badge indicator */}
        {complaint.isMasterComplaint && complaint.linkedComplaintCount && (
          <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-1 rounded-lg border border-violet-200 dark:border-violet-800">
            <Layers className="w-3.5 h-3.5 text-violet-500" />
            <span>{complaint.linkedComplaintCount} students reported this issue</span>
          </div>
        )}

        {complaint.masterComplaintId && (
          <div className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            <span>Linked to Master Ticket</span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[120px]">{complaint.location}</span>
          </span>

          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {createdDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {complaint.feedback && (
            <span className="flex items-center gap-0.5 text-amber-500 font-bold">
              <Star className="w-3 h-3 fill-amber-500" />
              <span>{complaint.feedback.rating}</span>
            </span>
          )}

          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};
