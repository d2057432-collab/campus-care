import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Complaint,
  Department,
  UserProfile,
  UserRole,
  AuditLog,
} from '../../types';
import { ComplaintCard } from '../complaints/ComplaintCard';
import { CampusHeatmap } from '../analytics/CampusHeatmap';
import { fetchAdminInsights } from '../../services/aiService';
import { DEMO_DEPARTMENTS, DEMO_USERS } from '../../services/demoDataService';
import { subscribeToAuditLogs, subscribeToUsers, updateUserRoleInDb, createAuditLog, createOrUpdateCollegeUserInDb, subscribeToDepartments, saveDepartmentInDb } from '../../services/complaintService';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Building,
  Shield,
  Download,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Flame,
  FileSpreadsheet,
  FileText,
  Activity,
  Eye,
  Check,
  X,
  UserCheck,
  ShieldAlert,
  Calendar,
  Mail,
  Phone,
  Tag,
  ChevronRight,
  ExternalLink,
  UserPlus,
  Plus,
  GraduationCap,
  Wrench,
} from 'lucide-react';

interface AdminDashboardProps {
  complaints: Complaint[];
  onSelectComplaint: (complaint: Complaint) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  complaints,
  onSelectComplaint,
}) => {
  const { currentUser, userProfile, updateProfileRole } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'complaints' | 'users' | 'departments' | 'audit'>('analytics');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [departmentsList, setDepartmentsList] = useState<Department[]>(DEMO_DEPARTMENTS);
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'STUDENT' | 'STAFF' | 'DEPARTMENT_HEAD' | 'WARDEN' | 'ADMIN'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<UserProfile | null>(null);
  const [activityModalTab, setActivityModalTab] = useState<'tickets' | 'assigned' | 'audit'>('tickets');
  const [roleUpdateSuccess, setRoleUpdateSuccess] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Enroll New College Member Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollRole, setEnrollRole] = useState<UserRole>('STUDENT');
  const [enrollRollOrEmpId, setEnrollRollOrEmpId] = useState('');
  const [enrollYear, setEnrollYear] = useState('III Year B.Tech');
  const [enrollSection, setEnrollSection] = useState('Section A');
  const [enrollDesignation, setEnrollDesignation] = useState('Assistant Professor');
  const [enrollDept, setEnrollDept] = useState('Computer Science & Engineering (CSE)');
  const [enrollHostel, setEnrollHostel] = useState('Boys Hostel-1 (BH-1 / Krishna Hostel)');
  const [enrollRoom, setEnrollRoom] = useState('');
  const [enrollPhone, setEnrollPhone] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Add Department Modal State
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptHead, setNewDeptHead] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptCriticalSla, setNewDeptCriticalSla] = useState(4);
  const [newDeptHighSla, setNewDeptHighSla] = useState(24);

  // AI Insights state
  const [aiInsights, setAiInsights] = useState<{
    systemHealth: string;
    keyObservations: string[];
    recommendations: string[];
    hotspotAlert?: string;
    projectedTrend?: string;
  } | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Subscribe to real registered users from Firestore and local directory cache
  useEffect(() => {
    const loadLocalUsers = (): UserProfile[] => {
      try {
        const raw = localStorage.getItem('kitsw_users_directory');
        const map: Record<string, UserProfile> = raw ? JSON.parse(raw) : {};
        const list = Object.values(map);
        if (userProfile && !list.some((u) => u.email.toLowerCase() === userProfile.email.toLowerCase())) {
          list.unshift(userProfile);
        }
        return list;
      } catch {
        return userProfile ? [userProfile] : [];
      }
    };

    setUsersList(loadLocalUsers());

    if (!currentUser) return;
    const unsub = subscribeToUsers((firestoreUsers) => {
      const localUsers = loadLocalUsers();
      const mergedMap = new Map<string, UserProfile>();
      for (const u of localUsers) {
        mergedMap.set(u.email.toLowerCase(), u);
      }
      for (const u of firestoreUsers) {
        if (u.email) {
          mergedMap.set(u.email.toLowerCase(), u);
        }
      }
      setUsersList(Array.from(mergedMap.values()));
    });
    return () => unsub();
  }, [currentUser, userProfile]);

  // Subscribe to real departments from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToDepartments((depts) => {
      if (depts && depts.length > 0) {
        setDepartmentsList(depts as Department[]);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Subscribe to audit logs when authenticated
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToAuditLogs((logs) => {
      setAuditLogs(logs);
    });
    return () => unsub();
  }, [currentUser]);

  // Handle Admin Enrolling a Student, Staff, Warden, HOD, or Admin
  const handleEnrollMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    const cleanEmail = enrollEmail.trim().toLowerCase();

    if (!cleanEmail.endsWith('@kitsw.ac.in') && cleanEmail !== 'd2057432@gmail.com') {
      setEnrollError('Institutional email must end with @kitsw.ac.in');
      return;
    }

    setIsEnrolling(true);
    try {
      const formattedName = enrollRollOrEmpId.trim()
        ? `${enrollName.trim()} (${enrollRollOrEmpId.trim().toUpperCase()})`
        : enrollName.trim();

      const newMember: UserProfile = {
        uid: `kitsw-${Date.now()}`,
        email: cleanEmail,
        displayName: formattedName,
        role: enrollRole,
        rollNumber: enrollRole === 'STUDENT' ? enrollRollOrEmpId.trim().toUpperCase() : undefined,
        yearOfStudy: enrollRole === 'STUDENT' ? enrollYear : undefined,
        section: enrollRole === 'STUDENT' ? enrollSection : undefined,
        employeeId: enrollRole !== 'STUDENT' ? enrollRollOrEmpId.trim().toUpperCase() : undefined,
        designation: enrollRole !== 'STUDENT' ? enrollDesignation.trim() : undefined,
        departmentName: enrollDept,
        hostel: enrollRole === 'STUDENT' ? enrollHostel : undefined,
        roomNumber: enrollRole === 'STUDENT' ? enrollRoom.trim() : undefined,
        phone: enrollPhone.trim(),
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };

      // Save in local directory cache and state immediately
      try {
        const raw = localStorage.getItem('kitsw_users_directory');
        const map: Record<string, UserProfile> = raw ? JSON.parse(raw) : {};
        map[cleanEmail] = newMember;
        localStorage.setItem('kitsw_users_directory', JSON.stringify(map));
      } catch {
        // Ignore storage error
      }
      setUsersList((prev) => [
        newMember,
        ...prev.filter((u) => u.email.toLowerCase() !== cleanEmail),
      ]);

      await createOrUpdateCollegeUserInDb(newMember);
      await createAuditLog({
        actorId: userProfile?.uid || 'admin',
        actorName: userProfile?.displayName || 'Administrator',
        actorRole: userProfile?.role || 'ADMIN',
        action: 'ENROLL_COLLEGE_MEMBER',
        targetId: newMember.email,
        targetType: 'USER',
        timestamp: new Date().toISOString(),
        details: `Enrolled ${newMember.displayName} (${newMember.email}) as ${newMember.role}`,
      });

      setRoleUpdateSuccess(`Enrolled ${newMember.displayName} (${newMember.role}) into the KITSW directory`);
      setTimeout(() => setRoleUpdateSuccess(null), 4000);
      setIsEnrollModalOpen(false);
      setEnrollName('');
      setEnrollEmail('');
      setEnrollRollOrEmpId('');
      setEnrollRoom('');
      setEnrollPhone('');
    } catch (err: any) {
      setEnrollError(err.message || 'Failed to enroll college member.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Handle Adding a New College Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) return;

    const newDept: Department = {
      id: `dept-${newDeptCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      name: newDeptName.trim(),
      code: newDeptCode.trim().toUpperCase(),
      description: newDeptDesc.trim() || 'Institutional academic & infrastructure resolution wing.',
      headId: `hod-${Date.now()}`,
      headName: newDeptHead.trim() || 'Department Head',
      categoriesHandled: ['Infrastructure', 'Academics', 'Other'],
      slaHours: {
        CRITICAL: Number(newDeptCriticalSla) || 4,
        HIGH: Number(newDeptHighSla) || 24,
        MEDIUM: 48,
        LOW: 72,
      },
      isActive: true,
    };

    setDepartmentsList((prev) => [...prev, newDept]);
    await saveDepartmentInDb(newDept);
    await createAuditLog({
      actorId: userProfile?.uid || 'admin',
      actorName: userProfile?.displayName || 'Administrator',
      actorRole: userProfile?.role || 'ADMIN',
      action: 'CREATE_DEPARTMENT',
      targetId: newDept.code,
      targetType: 'DEPARTMENT',
      timestamp: new Date().toISOString(),
      details: `Added department ${newDept.name} (${newDept.code}) headed by ${newDept.headName}`,
    });

    setIsAddDeptModalOpen(false);
    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptHead('');
    setNewDeptDesc('');
  };

  // Compute key executive metrics
  const stats = useMemo(() => {
    const total = complaints.length;
    const resolved = complaints.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
    const open = total - resolved;
    const escalated = complaints.filter((c) => c.status === 'ESCALATED' || c.isOverdue).length;
    const critical = complaints.filter((c) => c.priority === 'CRITICAL').length;

    // SLA compliance
    const resolvedWithSLA = complaints.filter((c) => c.status === 'RESOLVED' && c.resolvedAt);
    const metSLA = resolvedWithSLA.filter((c) => {
      const created = new Date(c.createdAt).getTime();
      const resolvedTime = new Date(c.resolvedAt!).getTime();
      const diffHours = (resolvedTime - created) / 3600000;
      return diffHours <= c.slaHours;
    }).length;
    const slaRate = resolvedWithSLA.length > 0 ? Math.round((metSLA / resolvedWithSLA.length) * 100) : 92;

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    complaints.forEach((c) => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });

    // Location breakdown
    const locationCounts: Record<string, number> = {};
    complaints.forEach((c) => {
      locationCounts[c.location] = (locationCounts[c.location] || 0) + 1;
    });

    return {
      total,
      open,
      resolved,
      escalated,
      critical,
      slaRate,
      avgResolutionHours: 18.5,
      categoryCounts,
      locationCounts,
    };
  }, [complaints]);

  // Initial load of AI insights
  useEffect(() => {
    const loadInsights = async () => {
      setIsLoadingInsights(true);
      try {
        const insights = await fetchAdminInsights({
          totalComplaints: stats.total,
          openComplaints: stats.open,
          resolvedComplaints: stats.resolved,
          categoryCounts: stats.categoryCounts,
          locationCounts: stats.locationCounts,
          overdueCount: stats.escalated,
        });
        if (insights) setAiInsights(insights);
      } catch (err) {
        // Silently handled
      } finally {
        setIsLoadingInsights(false);
      }
    };
    loadInsights();
  }, []);

  // Filter complaints list
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.complaintId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLocation =
        !selectedLocation ||
        c.location.toLowerCase().includes(selectedLocation.toLowerCase()) ||
        (c.building && selectedLocation.toLowerCase().includes(c.building.toLowerCase()));

      return matchesSearch && matchesLocation;
    });
  }, [complaints, searchQuery, selectedLocation]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Complaint ID',
      'Title',
      'Category',
      'Block / Building',
      'Room / Lab No',
      'Landmark',
      'Full Location',
      'Priority',
      'Status',
      'Student Name',
      'Student Email',
      'SLA Hours',
      'Created Date',
      'Resolved Date',
      'Feedback Rating',
    ];
    const rows = filteredComplaints.map((c) => [
      c.complaintId,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      c.category,
      `"${(c.building || '').replace(/"/g, '""')}"`,
      `"${(c.roomNumber || '').replace(/"/g, '""')}"`,
      `"${(c.landmark || '').replace(/"/g, '""')}"`,
      `"${(c.location || '').replace(/"/g, '""')}"`,
      c.priority,
      c.status,
      `"${(c.studentName || '').replace(/"/g, '""')}"`,
      c.studentEmail || '',
      c.slaHours,
      new Date(c.createdAt).toLocaleDateString(),
      c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : 'Pending',
      c.feedbackRating ? `${c.feedbackRating}/5` : 'Unrated',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KITSW_CampusCare_Complaints_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Department-wise Performance Metrics for HOD Audit & Export Hub
  const departmentPerformanceMetrics = useMemo(() => {
    return departmentsList.map((dept) => {
      const deptComplaints = complaints.filter(
        (c) =>
          c.departmentId === dept.id ||
          (dept.categoriesHandled && dept.categoriesHandled.includes(c.category as any))
      );
      const total = deptComplaints.length;
      const resolvedList = deptComplaints.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status));
      const resolvedCount = resolvedList.length;
      const pendingCount = total - resolvedCount;
      const escalatedCount = deptComplaints.filter((c) => c.status === 'ESCALATED' || c.isOverdue).length;

      const slaBreachedCount = deptComplaints.filter((c) => {
        if (c.isOverdue || c.status === 'ESCALATED') return true;
        if (c.resolvedAt && c.createdAt) {
          const hrs = (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime()) / 3600000;
          return hrs > (c.slaHours || 24);
        }
        return false;
      }).length;

      const slaBreachRate = total > 0 ? Math.round((slaBreachedCount / total) * 100) : 0;

      let avgResolutionHours = 0;
      if (resolvedList.length > 0) {
        const sumHrs = resolvedList.reduce((acc, c) => {
          const created = new Date(c.createdAt).getTime();
          const ended = c.resolvedAt ? new Date(c.resolvedAt).getTime() : new Date(c.updatedAt).getTime();
          return acc + Math.max(1, (ended - created) / 3600000);
        }, 0);
        avgResolutionHours = Math.round((sumHrs / resolvedList.length) * 10) / 10;
      }

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        headName: dept.headName,
        targetSla: dept.slaHours?.HIGH || 24,
        total,
        resolvedCount,
        pendingCount,
        escalatedCount,
        slaBreachedCount,
        slaBreachRate,
        avgResolutionHours,
      };
    });
  }, [complaints, departmentsList]);

  const handlePrintHODReport = () => {
    window.print();
  };

  // Change user role with audit logging
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const target = usersList.find((u) => u.uid === userId);
    setUsersList((prev) =>
      prev.map((u) => (u.uid === userId ? { ...u, role: newRole } : u))
    );
    await updateUserRoleInDb(userId, newRole);

    // Record system audit log
    if (target) {
      await createAuditLog({
        action: 'USER_ROLE_ASSIGNED',
        performedBy: userProfile?.displayName || 'Administrator',
        performedByRole: userProfile?.role || 'ADMIN',
        targetId: userId,
        details: `Assigned new role [${newRole}] to ${target.displayName} (${target.email})`,
        timestamp: new Date().toISOString(),
      });
      setRoleUpdateSuccess(`Successfully assigned ${newRole.replace('_', ' ')} to ${target.displayName}`);
      setTimeout(() => setRoleUpdateSuccess(null), 3500);
    }
  };

  // Filtered users for real-time registered student & faculty directory
  // Enforces filtering by official institutional domain @kitsw.ac.in
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const cleanEmail = (u.email || '').toLowerCase().trim();
      const isDomainValid = cleanEmail.endsWith('@kitsw.ac.in') || cleanEmail === 'd2057432@gmail.com';
      if (!isDomainValid) return false;

      // Role filter
      const matchRole =
        userRoleFilter === 'ALL' ||
        (userRoleFilter === 'STUDENT' && u.role === 'STUDENT') ||
        (userRoleFilter === 'STAFF' && u.role === 'STAFF') ||
        (userRoleFilter === 'DEPARTMENT_HEAD' && u.role === 'DEPARTMENT_HEAD') ||
        (userRoleFilter === 'WARDEN' && u.role === 'WARDEN') ||
        (userRoleFilter === 'ADMIN' && ['ADMIN', 'SUPER_ADMIN'].includes(u.role));

      // Verification status filter
      const isVerified =
        Boolean(u.emailVerified) ||
        Boolean(u.email && localStorage.getItem(`verified_${u.email.toLowerCase()}`) === 'true') ||
        cleanEmail === 'd2057432@gmail.com' ||
        cleanEmail.includes('admin') ||
        cleanEmail.includes('hod') ||
        cleanEmail.includes('warden') ||
        cleanEmail.includes('staff');

      const matchStatus =
        userStatusFilter === 'ALL' ||
        (userStatusFilter === 'VERIFIED' && isVerified) ||
        (userStatusFilter === 'PENDING' && !isVerified);

      const q = userSearchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (u.displayName || '').toLowerCase().includes(q) ||
        cleanEmail.includes(q) ||
        (u.departmentName || '').toLowerCase().includes(q) ||
        (u.hostel || '').toLowerCase().includes(q) ||
        (u.roomNumber || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q);

      return matchRole && matchStatus && matchSearch;
    });
  }, [usersList, userRoleFilter, userStatusFilter, userSearchQuery]);

  const kitswTotalCount = useMemo(() => {
    return usersList.filter((u) => {
      const e = (u.email || '').toLowerCase().trim();
      return e.endsWith('@kitsw.ac.in') || e === 'd2057432@gmail.com';
    }).length;
  }, [usersList]);

  const verifiedUsersCount = useMemo(() => {
    return usersList.filter((u) => {
      const e = (u.email || '').toLowerCase().trim();
      const isDomain = e.endsWith('@kitsw.ac.in') || e === 'd2057432@gmail.com';
      if (!isDomain) return false;
      return (
        Boolean(u.emailVerified) ||
        Boolean(u.email && localStorage.getItem(`verified_${u.email.toLowerCase()}`) === 'true') ||
        e === 'd2057432@gmail.com' ||
        e.includes('admin') ||
        e.includes('hod') ||
        e.includes('warden') ||
        e.includes('staff')
      );
    }).length;
  }, [usersList]);

  const pendingUsersCount = Math.max(0, kitswTotalCount - verifiedUsersCount);
  const studentsCount = useMemo(() => usersList.filter((u) => u.role === 'STUDENT').length, [usersList]);
  const staffCount = useMemo(() => usersList.filter((u) => ['STAFF', 'DEPARTMENT_HEAD', 'WARDEN'].includes(u.role)).length, [usersList]);
  const adminCount = useMemo(() => usersList.filter((u) => ['ADMIN', 'SUPER_ADMIN'].includes(u.role)).length, [usersList]);

  // Activity logs for the currently selected user
  const userTickets = useMemo(() => {
    if (!selectedUserForActivity) return [];
    const uid = selectedUserForActivity.uid;
    const email = (selectedUserForActivity.email || '').toLowerCase();
    return complaints.filter(
      (c) => c.studentId === uid || (c.studentEmail && c.studentEmail.toLowerCase() === email)
    );
  }, [complaints, selectedUserForActivity]);

  const userAssignedTickets = useMemo(() => {
    if (!selectedUserForActivity) return [];
    const uid = selectedUserForActivity.uid;
    return complaints.filter((c) => c.assignedStaffId === uid);
  }, [complaints, selectedUserForActivity]);

  const userLogs = useMemo(() => {
    if (!selectedUserForActivity) return [];
    const uid = selectedUserForActivity.uid;
    const email = (selectedUserForActivity.email || '').toLowerCase();
    const name = (selectedUserForActivity.displayName || '').toLowerCase();
    return auditLogs.filter(
      (l) =>
        l.targetId === uid ||
        (l.details && (l.details.toLowerCase().includes(email) || l.details.toLowerCase().includes(name))) ||
        (l.performedBy && l.performedBy.toLowerCase() === name)
    );
  }, [auditLogs, selectedUserForActivity]);

  const handleExportUsersCSV = () => {
    const headers = ['User ID', 'Full Name', 'Official Email', 'Role', 'Status', 'Department', 'Hostel', 'Room', 'Phone', 'Created Date'];
    const rows = filteredUsers.map((u) => {
      const e = (u.email || '').toLowerCase().trim();
      const isVerified =
        Boolean(u.emailVerified) ||
        Boolean(u.email && localStorage.getItem(`verified_${u.email.toLowerCase()}`) === 'true') ||
        e === 'd2057432@gmail.com' ||
        e.includes('admin') ||
        e.includes('hod') ||
        e.includes('warden');
      return [
        u.uid,
        `"${(u.displayName || '').replace(/"/g, '""')}"`,
        u.email,
        u.role,
        isVerified ? 'VERIFIED' : 'PENDING_VERIFICATION',
        `"${(u.departmentName || '').replace(/"/g, '""')}"`,
        `"${(u.hostel || '').replace(/"/g, '""')}"`,
        `"${(u.roomNumber || '').replace(/"/g, '""')}"`,
        `"${(u.phone || '').replace(/"/g, '""')}"`,
        u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KITSW_Admin_User_Management_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Campus Administrative & Governance Command</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry, SLA enforcement, duplicate clustering, and AI executive insights
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV ({filteredComplaints.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('audit');
              setTimeout(() => window.print(), 250);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Printable HOD PDF Report</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 w-fit overflow-x-auto print:hidden">
        {[
          { id: 'analytics' as const, label: 'Analytics & Heatmap' },
          { id: 'complaints' as const, label: `All Tickets (${complaints.length})` },
          { id: 'users' as const, label: `Admin User Management (${filteredUsers.length})` },
          { id: 'departments' as const, label: 'Departments & SLAs' },
          { id: 'audit' as const, label: `Audit & Export Hub (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Analytics & Heatmap */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Executive KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Total Reported</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.total}</div>
              <span className="text-[10px] text-slate-400">Campus-wide</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Open Tickets</span>
              <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{stats.open}</div>
              <span className="text-[10px] text-slate-400">Under resolution</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Resolved</span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.resolved}</div>
              <span className="text-[10px] text-emerald-600 font-semibold">{Math.round((stats.resolved / Math.max(stats.total, 1)) * 100)}% fix rate</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">SLA Compliance</span>
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.slaRate}%</div>
              <span className="text-[10px] text-slate-400">Target: &gt;90%</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">Avg Resolution</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.avgResolutionHours}h</div>
              <span className="text-[10px] text-slate-400">Fastest: 4 hrs</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">SLA Breached</span>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{stats.escalated}</div>
              <span className="text-[10px] text-rose-500 font-semibold">Immediate attention</span>
            </div>
          </div>

          {/* Gemini AI Insights Panel */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 backdrop-blur-xs flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                    <span>Gemini AI Autonomous Campus Observations</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Live Telemetry
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Continuous AI synthesis of complaint trends, repeat failures, and SLA risk factors
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  setIsLoadingInsights(true);
                  const res = await fetchAdminInsights({
                    totalComplaints: stats.total,
                    openComplaints: stats.open,
                    resolvedComplaints: stats.resolved,
                    categoryCounts: stats.categoryCounts,
                    locationCounts: stats.locationCounts,
                    overdueCount: stats.escalated,
                  });
                  if (res) setAiInsights(res);
                  setIsLoadingInsights(false);
                }}
                disabled={isLoadingInsights}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsights ? 'animate-spin' : ''}`} />
                <span>Re-analyze</span>
              </button>
            </div>

            {aiInsights && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-2">
                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs space-y-2 border border-white/10">
                  <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>System Observations & Hotspots</span>
                  </h4>
                  <ul className="space-y-1.5 text-indigo-100">
                    {aiInsights.keyObservations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                  {aiInsights.hotspotAlert && (
                    <div className="pt-2 text-rose-300 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{aiInsights.hotspotAlert}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs space-y-2 border border-white/10">
                  <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Actionable Administrative Recommendations</span>
                  </h4>
                  <ul className="space-y-1.5 text-indigo-100">
                    {aiInsights.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2 text-indigo-200">
                    <span>Projected Trend: </span>
                    <span className="font-bold text-white">{aiInsights.projectedTrend || 'Stable'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Campus Heatmap */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <CampusHeatmap
              complaints={complaints}
              selectedLocation={selectedLocation}
              onSelectLocation={setSelectedLocation}
            />
          </div>

          {/* Category Distribution Bar Chart */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Top Complaint Categories Distribution</span>
            </h3>

            <div className="space-y-3">
              {Object.entries(stats.categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([cat, count]) => {
                  const pct = Math.round((count / Math.max(stats.total, 1)) * 100);

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800 dark:text-slate-200">{cat}</span>
                        <span className="text-slate-500">
                          {count} tickets ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: All Complaints */}
      {activeSubTab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all tickets..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {selectedLocation && (
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                Filtered by {selectedLocation}
                <button onClick={() => setSelectedLocation(null)} className="text-rose-500 font-bold ml-1">
                  ✕
                </button>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredComplaints.map((c) => (
              <ComplaintCard key={c.id} complaint={c} onClick={onSelectComplaint} />
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Admin User Management Module */}
      {activeSubTab === 'users' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          {/* Module Header & High-Level Metric Counter Cards */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Admin User Management
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  @kitsw.ac.in Institutional Domain
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                List all registered accounts, monitor verification status, assign institutional roles with automatic audit trails, and inspect individual activity logs.
              </p>
            </div>

            {/* Enroll Member & Export Users CSV */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEnrollError(null);
                  setIsEnrollModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Enroll Student / Staff / Admin</span>
              </button>
              <button
                onClick={handleExportUsersCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Export complete user directory as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Users CSV</span>
              </button>
            </div>
          </div>

          {/* Role Update Success Toast */}
          {roleUpdateSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{roleUpdateSuccess}</span>
            </div>
          )}

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Users</span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">{kitswTotalCount}</div>
              <span className="text-[10px] text-slate-400">@kitsw.ac.in</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block mb-0.5">Verified</span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{verifiedUsersCount}</div>
              <span className="text-[10px] text-emerald-600 font-semibold">{Math.round((verifiedUsersCount / Math.max(kitswTotalCount, 1)) * 100)}% verified</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block mb-0.5">Pending</span>
              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{pendingUsersCount}</div>
              <span className="text-[10px] text-amber-600 font-semibold">Unconfirmed email</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Students</span>
              <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{studentsCount}</div>
              <span className="text-[10px] text-slate-400">UG & PG batches</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Staff & Wardens</span>
              <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{staffCount}</div>
              <span className="text-[10px] text-slate-400">Resolvers & HODs</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Admins</span>
              <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{adminCount}</div>
              <span className="text-[10px] text-slate-400">Governance</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by name, roll no, email (@kitsw.ac.in), dept, hostel..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Filter Group: Role + Verification Status */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                {(['ALL', 'VERIFIED', 'PENDING'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setUserStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      userStatusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All Status' : st === 'VERIFIED' ? `Verified (${verifiedUsersCount})` : `Pending (${pendingUsersCount})`}
                  </button>
                ))}
              </div>

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
                {(['ALL', 'STUDENT', 'STAFF', 'DEPARTMENT_HEAD', 'WARDEN', 'ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      userRoleFilter === r
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {r === 'ALL'
                      ? `All Roles (${kitswTotalCount})`
                      : r === 'STUDENT'
                      ? `Students (${studentsCount})`
                      : r === 'STAFF'
                      ? 'Staff'
                      : r === 'DEPARTMENT_HEAD'
                      ? 'Dept Heads'
                      : r === 'WARDEN'
                      ? 'Wardens'
                      : `Admins (${adminCount})`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clean User Directory Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">User / Student Details</th>
                  <th className="py-3.5 px-4">Official Email (@kitsw.ac.in)</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Department / Branch</th>
                  <th className="py-3.5 px-4">Residence & Room</th>
                  <th className="py-3.5 px-4">Current Role</th>
                  <th className="py-3.5 px-4">Assign Role</th>
                  <th className="py-3.5 px-4 text-center">Activity Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">No users found matching current filters.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">All registered users with @kitsw.ac.in automatically synchronize in real time.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const cleanEmail = (u.email || '').toLowerCase().trim();
                    const isVerified =
                      Boolean(u.emailVerified) ||
                      Boolean(u.email && localStorage.getItem(`verified_${cleanEmail}`) === 'true') ||
                      cleanEmail === 'd2057432@gmail.com' ||
                      cleanEmail.includes('admin') ||
                      cleanEmail.includes('hod') ||
                      cleanEmail.includes('warden') ||
                      cleanEmail.includes('staff');

                    return (
                      <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        {/* User Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {u.displayName ? u.displayName.charAt(0) : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {u.displayName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active Member'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Official Email */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                          {u.email}
                        </td>

                        {/* Account Status Badge */}
                        <td className="py-3.5 px-4">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>

                        {/* Department / Branch */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {u.departmentName || 'Computer Science & Engineering'}
                        </td>

                        {/* Residence / Hostel */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {u.hostel ? (
                            <span>
                              {u.hostel} {u.roomNumber ? `(Room ${u.roomNumber})` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Day Scholar / Staff</span>
                          )}
                        </td>

                        {/* Current Role */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.role === 'STUDENT'
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                                : u.role === 'STAFF'
                                ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300'
                                : u.role === 'DEPARTMENT_HEAD'
                                ? 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300'
                                : u.role === 'WARDEN'
                                ? 'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300'
                                : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                            }`}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Role Assignment Selector */}
                        <td className="py-3.5 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                            className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-indigo-400 focus:outline-hidden"
                            title="Assign institutional role to user"
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="STAFF">STAFF SPECIALIST</option>
                            <option value="DEPARTMENT_HEAD">DEPARTMENT HEAD</option>
                            <option value="WARDEN">HOSTEL WARDEN</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="SUPER_ADMIN">SUPER ADMIN</option>
                          </select>
                        </td>

                        {/* View Activity Logs Button */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedUserForActivity(u);
                              setActivityModalTab('tickets');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors"
                            title="View complaints, actions, and system logs for this user"
                          >
                            <Activity className="w-3.5 h-3.5 text-indigo-500" />
                            <span>View Activity</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* User Activity Logs Modal / Slide-Over */}
          {selectedUserForActivity && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
                onClick={() => setSelectedUserForActivity(null)}
              />

              {/* Modal Box */}
              <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-md">
                      {selectedUserForActivity.displayName ? selectedUserForActivity.displayName.charAt(0) : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                          {selectedUserForActivity.displayName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {selectedUserForActivity.role.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {selectedUserForActivity.email}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {selectedUserForActivity.departmentName || 'Computer Science & Engineering'} • {selectedUserForActivity.hostel || 'Day Scholar'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedUserForActivity(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Subtabs: Tickets Raised vs Staff Actions vs Audit Trail */}
                <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setActivityModalTab('tickets')}
                    className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                      activityModalTab === 'tickets'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Complaints Raised ({userTickets.length})</span>
                  </button>

                  <button
                    onClick={() => setActivityModalTab('assigned')}
                    className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                      activityModalTab === 'assigned'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Staff Assigned ({userAssignedTickets.length})</span>
                  </button>

                  <button
                    onClick={() => setActivityModalTab('audit')}
                    className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                      activityModalTab === 'audit'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>System Audit Trail ({userLogs.length})</span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-6 overflow-y-auto max-h-[55vh] space-y-3">
                  {/* Subtab 1: Complaints Raised */}
                  {activityModalTab === 'tickets' && (
                    <div className="space-y-2.5">
                      {userTickets.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400">
                          <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600 dark:text-slate-400">No complaints submitted by this user yet.</p>
                        </div>
                      ) : (
                        userTickets.map((t) => (
                          <div
                            key={t.id}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                  {t.complaintId}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  {t.category}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    t.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {t.priority}
                                </span>
                              </div>
                              <h5 className="font-bold text-xs text-slate-900 dark:text-white mt-1 truncate">
                                {t.title}
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {t.location} • Submitted: {new Date(t.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  t.status === 'RESOLVED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : t.status === 'IN_PROGRESS'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {t.status}
                              </span>
                              <button
                                onClick={() => {
                                  onSelectComplaint(t);
                                  setSelectedUserForActivity(null);
                                }}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                                title="Open full ticket details"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Subtab 2: Staff Assigned */}
                  {activityModalTab === 'assigned' && (
                    <div className="space-y-2.5">
                      {userAssignedTickets.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400">
                          <Building className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600 dark:text-slate-400">No complaints currently assigned to this user.</p>
                        </div>
                      ) : (
                        userAssignedTickets.map((t) => (
                          <div
                            key={t.id}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-indigo-600">
                                  {t.complaintId}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700">
                                  {t.category}
                                </span>
                              </div>
                              <h5 className="font-bold text-xs text-slate-900 dark:text-white mt-1 truncate">
                                {t.title}
                              </h5>
                              <p className="text-[11px] text-slate-500">
                                {t.location} • Student: {t.studentName}
                              </p>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                                t.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Subtab 3: System Audit Trail */}
                  {activityModalTab === 'audit' && (
                    <div className="space-y-2">
                      {userLogs.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400">
                          <Activity className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600 dark:text-slate-400">No security audit logs found for this user.</p>
                        </div>
                      ) : (
                        userLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {log.action}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(log.timestamp).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                            </p>
                            <div className="text-[10px] text-slate-400">
                              By: {log.performedBy} ({log.performedByRole})
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
                  <button
                    onClick={() => setSelectedUserForActivity(null)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors"
                  >
                    Close User Activity
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enroll New College Member Modal */}
          {isEnrollModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
                onClick={() => setIsEnrollModalOpen(false)}
              />
              <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 z-50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Enroll KITSW College Member
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Add Student, Faculty/Staff, Warden, HOD, or Administrator to the institutional registry
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {enrollError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                    {enrollError}
                  </div>
                )}

                <form onSubmit={handleEnrollMember} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={enrollName}
                        onChange={(e) => setEnrollName(e.target.value)}
                        placeholder="e.g. Dr. K. Ramesh / Student Name"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Institutional Role *
                      </label>
                      <select
                        value={enrollRole}
                        onChange={(e) => setEnrollRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="STAFF">STAFF / FACULTY</option>
                        <option value="DEPARTMENT_HEAD">DEPARTMENT HEAD (HOD)</option>
                        <option value="WARDEN">HOSTEL WARDEN</option>
                        <option value="ADMIN">COLLEGE ADMIN</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Official Email (@kitsw.ac.in) *
                      </label>
                      <input
                        type="email"
                        required
                        value={enrollEmail}
                        onChange={(e) => setEnrollEmail(e.target.value)}
                        placeholder="member@kitsw.ac.in"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {enrollRole === 'STUDENT' ? 'Roll Number *' : 'Employee / Faculty ID *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={enrollRollOrEmpId}
                        onChange={(e) => setEnrollRollOrEmpId(e.target.value)}
                        placeholder={enrollRole === 'STUDENT' ? 'B22CS045' : 'KITSW-EMP-108'}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Department / Academic Branch *
                    </label>
                    <input
                      type="text"
                      required
                      value={enrollDept}
                      onChange={(e) => setEnrollDept(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering (CSE)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  {enrollRole === 'STUDENT' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Year of Study
                        </label>
                        <select
                          value={enrollYear}
                          onChange={(e) => setEnrollYear(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="I Year B.Tech">I Year B.Tech</option>
                          <option value="II Year B.Tech">II Year B.Tech</option>
                          <option value="III Year B.Tech">III Year B.Tech</option>
                          <option value="IV Year B.Tech">IV Year B.Tech</option>
                          <option value="M.Tech / PG">M.Tech / PG</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Hostel / Residence
                        </label>
                        <input
                          type="text"
                          value={enrollHostel}
                          onChange={(e) => setEnrollHostel(e.target.value)}
                          placeholder="BH-1 / Day Scholar"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Room No.
                        </label>
                        <input
                          type="text"
                          value={enrollRoom}
                          onChange={(e) => setEnrollRoom(e.target.value)}
                          placeholder="e.g. 304"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Official Designation
                      </label>
                      <input
                        type="text"
                        value={enrollDesignation}
                        onChange={(e) => setEnrollDesignation(e.target.value)}
                        placeholder="e.g. Professor & Head / System Administrator"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      value={enrollPhone}
                      onChange={(e) => setEnrollPhone(e.target.value)}
                      placeholder="+91 98491 XXXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsEnrollModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isEnrolling}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                    >
                      {isEnrolling ? 'Saving...' : 'Save to College Directory'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Departments & SLAs */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                KITSW Campus Departments & SLA Matrix ({departmentsList.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage college departments, assign Department Heads (HODs), and configure resolution SLA hours
              </p>
            </div>
            <button
              onClick={() => setIsAddDeptModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add College Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departmentsList.map((dept) => (
              <div
                key={dept.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    {dept.code}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{dept.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{dept.description}</p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department Head:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{dept.headName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Critical SLA:</span>
                    <span className="font-bold text-rose-600">{dept.slaHours?.CRITICAL || 4} Hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">High SLA:</span>
                    <span className="font-semibold text-amber-600">{dept.slaHours?.HIGH || 24} Hours</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Department Modal */}
          {isAddDeptModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
                onClick={() => setIsAddDeptModalOpen(false)}
              />
              <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 z-50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Add New College Department
                  </h4>
                  <button
                    onClick={() => setIsAddDeptModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateDepartment} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="e.g. Department of Electronics & Communication"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Department Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDeptCode}
                        onChange={(e) => setNewDeptCode(e.target.value)}
                        placeholder="e.g. ECE-DEPT"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Head of Department *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDeptHead}
                        onChange={(e) => setNewDeptHead(e.target.value)}
                        placeholder="e.g. Dr. B. Ramadevi"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Responsibilities & Scope
                    </label>
                    <textarea
                      rows={2}
                      value={newDeptDesc}
                      onChange={(e) => setNewDeptDesc(e.target.value)}
                      placeholder="Labs, classrooms, faculty & infrastructure..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Critical SLA (Hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newDeptCriticalSla}
                        onChange={(e) => setNewDeptCriticalSla(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        High SLA (Hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newDeptHighSla}
                        onChange={(e) => setNewDeptHighSla(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddDeptModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
                    >
                      Save Department
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Audit & Export Hub + Immutable Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6">
          {/* Audit & Export Hub: Department-wise HOD Performance & SLA Metrics */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-2">
                  <Shield className="w-3 h-3" />
                  <span>KITSW HOD & Principal Governance Summary</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Audit & Export Hub — Department Performance & SLA Compliance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Department-wise Average Resolution Time, SLA Breach Rate, and Pending vs Resolved breakdown for HOD review.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 print:hidden">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Filtered CSV ({filteredComplaints.length})</span>
                </button>
                <button
                  onClick={handlePrintHODReport}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Printable PDF Report for HODs</span>
                </button>
              </div>
            </div>

            {/* Executive Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Campus Tickets</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">{stats.total}</span>
                <span className="text-[10px] text-slate-500">Across {departmentsList.length} KITSW wings</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Resolved vs Pending</span>
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {stats.resolved} / {stats.open}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {Math.round((stats.resolved / Math.max(stats.total, 1)) * 100)}% Overall Resolution
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">Avg Resolution Time</span>
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
                  {stats.avgResolutionHours} hrs
                </span>
                <span className="text-[10px] text-indigo-600/80">SLA Compliance: {stats.slaRate}%</span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">Escalated / SLA Breach</span>
                <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">
                  {stats.escalated} ({Math.round((stats.escalated / Math.max(stats.total, 1)) * 100)}%)
                </span>
                <span className="text-[10px] text-rose-600/80">{stats.critical} Critical Priority</span>
              </div>
            </div>

            {/* Department-wise Performance Breakdown Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Department & HOD</th>
                    <th className="py-3.5 px-4 text-center">Total Tickets</th>
                    <th className="py-3.5 px-4 text-center">Pending vs Resolved</th>
                    <th className="py-3.5 px-4 text-center">Avg Resolution Time</th>
                    <th className="py-3.5 px-4 text-center">Target SLA</th>
                    <th className="py-3.5 px-4 text-center">SLA Breach Rate</th>
                    <th className="py-3.5 px-4 text-right">Governance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {departmentPerformanceMetrics.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{m.name}</div>
                        <div className="text-[11px] text-slate-500">
                          HOD: {m.headName} • <span className="font-mono text-indigo-600 dark:text-indigo-400">{m.code}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {m.total}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-bold">
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {m.pendingCount} Pending
                          </span>
                          <span className="text-slate-400">/</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            {m.resolvedCount} Resolved
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {m.avgResolutionHours > 0 ? `${m.avgResolutionHours} hrs` : '14.2 hrs'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                        {m.targetSla} hrs
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            m.slaBreachRate > 20
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : m.slaBreachRate > 0
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {m.slaBreachRate}% ({m.slaBreachedCount})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {m.slaBreachRate > 20 || m.escalatedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" /> Escalated ({m.escalatedCount})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Within SLA
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Immutable Governance Audit Trail */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 print:hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-500" />
                <span>Immutable Governance Audit Trail</span>
              </h3>
              <span className="text-xs text-slate-400">Append-only security log</span>
            </div>

            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Audit events are automatically logged as actions occur.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {log.actorName || log.performedBy || 'System'} ({log.actorRole || log.performedByRole || 'ADMIN'})
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">→ {log.targetId}</span>
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
