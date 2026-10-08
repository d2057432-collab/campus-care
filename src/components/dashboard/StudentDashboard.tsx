import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Complaint, ComplaintCategory, ComplaintStatus, Announcement } from '../../types';
import { ComplaintCard } from '../complaints/ComplaintCard';
import { EditProfileModal } from '../modals/EditProfileModal';
import {
  Plus,
  Search,
  Filter,
  Sparkles,
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  Megaphone,
  Layers,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface StudentDashboardProps {
  complaints: Complaint[];
  announcements: Announcement[];
  onOpenRaiseModal: () => void;
  onOpenAssistantModal: () => void;
  onSelectComplaint: (complaint: Complaint) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  complaints,
  announcements,
  onOpenRaiseModal,
  onOpenAssistantModal,
  onSelectComplaint,
}) => {
  const { userProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Filter complaints for current student persona
  const studentComplaints = useMemo(() => {
    return complaints.filter(
      (c) => c.studentId === userProfile?.uid || c.studentEmail === userProfile?.email
    );
  }, [complaints, userProfile]);

  // Aggregate student metrics
  const metrics = useMemo(() => {
    const total = studentComplaints.length;
    const pending = studentComplaints.filter((c) =>
      ['SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_REVIEW'].includes(c.status)
    ).length;
    const inProgress = studentComplaints.filter((c) => c.status === 'IN_PROGRESS').length;
    const resolved = studentComplaints.filter((c) =>
      ['RESOLVED', 'CLOSED'].includes(c.status)
    ).length;
    const escalated = studentComplaints.filter(
      (c) => c.status === 'ESCALATED' || c.isOverdue
    ).length;

    return { total, pending, inProgress, resolved, escalated };
  }, [studentComplaints]);

  // Filtered complaints list
  const filteredList = useMemo(() => {
    return studentComplaints.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.complaintId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' &&
          ['SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_REVIEW'].includes(c.status)) ||
        c.status === statusFilter;

      const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [studentComplaints, searchQuery, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white p-6 sm:p-8 shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-xs text-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI-Powered Complaint Resolution</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {userProfile?.displayName?.split(' ')[0] || 'Student'}!
          </h2>

          <p className="text-sm text-indigo-100 leading-relaxed">
            Report maintenance, hostel, Wi-Fi, or academic issues with instant AI triage and SLA tracking. Physical follow-ups are no longer needed.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenRaiseModal}
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Raise Complaint</span>
            </button>

            <button
              onClick={onOpenAssistantModal}
              className="px-4 py-2.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-900 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Ask AI Assistant</span>
            </button>

            <button
              onClick={() => setShowEditProfileModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/25 transition-all flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-indigo-200" />
              <span>Edit Profile & Info</span>
            </button>
          </div>
        </div>

        {/* Decorative circle glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />
      </div>

      {/* Announcements Marquee */}
      {announcements.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900 dark:text-amber-200">
                {announcements[0].title}
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                {announcements[0].category}
              </span>
            </div>
            <p className="text-amber-800/90 dark:text-amber-300/80 mt-0.5 line-clamp-1">
              {announcements[0].content}
            </p>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Total Raised</span>
            <FileQuestion className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {metrics.total}
          </div>
          <span className="text-[10px] text-slate-400">All registered tickets</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Pending</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {metrics.pending}
          </div>
          <span className="text-[10px] text-slate-400">Under triage</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">In Progress</span>
            <PlayCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {metrics.inProgress}
          </div>
          <span className="text-[10px] text-slate-400">Assigned & active</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {metrics.resolved}
          </div>
          <span className="text-[10px] text-slate-400">Satisfactorily closed</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Escalated</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {metrics.escalated}
          </div>
          <span className="text-[10px] text-slate-400">Dean oversight</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID (CMP-XXXX), title, keywords..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Status quick pills */}
          {['ALL', 'IN_PROGRESS', 'RESOLVED', 'PENDING'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            My Registered Complaints ({filteredList.length})
          </h3>
          {filteredList.length > 0 && (
            <span className="text-xs text-slate-400">Click any card to track live timeline</span>
          )}
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <FileQuestion className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No matching complaints found
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                You haven't filed any complaints matching your search filter, or all issues are resolved.
              </p>
            </div>
            <button
              onClick={onOpenRaiseModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Raise Your First Complaint</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onClick={onSelectComplaint}
              />
            ))}
          </div>
        )}
      </div>
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
      />
    </div>
  );
};
