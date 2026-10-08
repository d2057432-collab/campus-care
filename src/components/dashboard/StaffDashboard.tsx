import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../../types';
import { ComplaintCard } from '../complaints/ComplaintCard';
import {
  Search,
  Filter,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  Clock,
  Layers,
  Wrench,
  UserCheck,
} from 'lucide-react';

interface StaffDashboardProps {
  complaints: Complaint[];
  onSelectComplaint: (complaint: Complaint) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  complaints,
  onSelectComplaint,
}) => {
  const { userProfile } = useAuth();

  const [activeQueue, setActiveQueue] = useState<'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'OVERDUE' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Filter complaints relevant to staff department
  const deptComplaints = useMemo(() => {
    if (userProfile?.role === 'SUPER_ADMIN' || userProfile?.role === 'ADMIN') {
      return complaints;
    }
    if (userProfile?.departmentId) {
      return complaints.filter((c) => c.departmentId === userProfile.departmentId);
    }
    // If IT specialist (Vikram Singh) or Warden
    if (userProfile?.displayName?.includes('Vikram') || userProfile?.displayName?.includes('Sunita')) {
      return complaints.filter((c) => c.category === 'Wi-Fi/Internet' || c.category === 'IT' || c.departmentId === 'dept-it');
    }
    if (userProfile?.role === 'WARDEN') {
      return complaints.filter((c) => c.category === 'Hostel' || c.location.includes('Hostel'));
    }
    return complaints;
  }, [complaints, userProfile]);

  // Aggregate staff queue counts
  const queueStats = useMemo(() => {
    const total = deptComplaints.length;
    const assigned = deptComplaints.filter((c) => c.status === 'ASSIGNED' || c.assignedStaffId === userProfile?.uid).length;
    const inProgress = deptComplaints.filter((c) => c.status === 'IN_PROGRESS').length;
    const overdue = deptComplaints.filter((c) => c.isOverdue || c.status === 'ESCALATED').length;
    const resolved = deptComplaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

    return { total, assigned, inProgress, overdue, resolved };
  }, [deptComplaints, userProfile]);

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return deptComplaints.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.complaintId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;

      let matchesQueue = true;
      if (activeQueue === 'ASSIGNED') {
        matchesQueue = c.status === 'ASSIGNED' || c.assignedStaffId === userProfile?.uid;
      } else if (activeQueue === 'IN_PROGRESS') {
        matchesQueue = c.status === 'IN_PROGRESS';
      } else if (activeQueue === 'OVERDUE') {
        matchesQueue = c.isOverdue || c.status === 'ESCALATED';
      } else if (activeQueue === 'RESOLVED') {
        matchesQueue = c.status === 'RESOLVED' || c.status === 'CLOSED';
      }

      return matchesSearch && matchesPriority && matchesQueue;
    });
  }, [deptComplaints, searchQuery, priorityFilter, activeQueue, userProfile]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Department Triage & Resolution Queue
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logged in as <span className="font-semibold text-slate-800 dark:text-slate-200">{userProfile?.displayName}</span> • {userProfile?.departmentName || 'Campus Maintenance'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Active Tickets: {queueStats.total - queueStats.resolved}
          </span>
          {queueStats.overdue > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{queueStats.overdue} Overdue</span>
            </span>
          )}
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'ALL' as const, label: 'All Department', count: queueStats.total, icon: Clock },
          { id: 'ASSIGNED' as const, label: 'Assigned / Queue', count: queueStats.assigned, icon: UserCheck },
          { id: 'IN_PROGRESS' as const, label: 'In Progress', count: queueStats.inProgress, icon: PlayCircle },
          { id: 'OVERDUE' as const, label: 'Overdue / Escalated', count: queueStats.overdue, icon: AlertTriangle, alert: queueStats.overdue > 0 },
          { id: 'RESOLVED' as const, label: 'Resolved Tickets', count: queueStats.resolved, icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeQueue === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveQueue(tab.id)}
              className={`p-4 rounded-2xl text-left border transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300 dark:ring-indigo-900'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
                <Icon className={`w-4 h-4 ${tab.alert && !isActive ? 'text-rose-500' : ''}`} />
              </div>
              <div className="text-2xl font-extrabold">{tab.count}</div>
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by ID, student, or location..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Priority:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                priorityFilter === p
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Tickets in View ({filteredQueue.length})
          </span>
          <span className="text-slate-400">Click a card to claim, update status, or add notes</span>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No tickets currently pending in this queue
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              All department complaints for this filter have been handled.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQueue.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onClick={onSelectComplaint}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
