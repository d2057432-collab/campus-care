import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, Notification } from '../../types';
import { subscribeToNotifications, markNotificationAsRead } from '../../services/complaintService';
import {
  ShieldCheck,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  User,
  LogOut,
  Sparkles,
  CheckCircle,
  Building,
  Wrench,
  GraduationCap,
  Shield,
  Menu,
  X,
  PlusCircle,
  LayoutDashboard,
  MapPin,
  Megaphone,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenRaiseModal: () => void;
  onOpenAssistantModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenRaiseModal,
  onOpenAssistantModal,
}) => {
  const {
    currentUser,
    userProfile,
    theme,
    setTheme,
    logout,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Close mobile menu on resize to desktop or on Escape key
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setRoleDropdownOpen(false);
        setNotifDropdownOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Listen for user notifications when authenticated
  useEffect(() => {
    if (!currentUser || !userProfile?.uid) return;
    const unsub = subscribeToNotifications(userProfile.uid, (list) => {
      setNotifications(list);
    });
    return () => unsub();
  }, [currentUser, userProfile?.uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const roleColors: Record<UserRole, string> = {
    STUDENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
    STAFF: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
    DEPARTMENT_HEAD: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300',
    WARDEN: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300',
    ADMIN: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
    SUPER_ADMIN: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'STUDENT':
        return <GraduationCap className="w-3.5 h-3.5" />;
      case 'STAFF':
        return <Wrench className="w-3.5 h-3.5" />;
      case 'DEPARTMENT_HEAD':
        return <Building className="w-3.5 h-3.5" />;
      case 'WARDEN':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return <Shield className="w-3.5 h-3.5" />;
    }
  };

  const roleList = [
    { role: 'STUDENT' as const, name: 'Aarav Sharma (B22CS045)', desc: 'Raise, track, duplicate alerts, feedback' },
    { role: 'STAFF' as const, name: 'Vikram Singh (IT Specialist)', desc: 'Claim tickets, internal notes, resolution' },
    { role: 'DEPARTMENT_HEAD' as const, name: 'Dr. Sunita Rao (HOD IT)', desc: 'Assign staff, approve resolutions, dept analytics' },
    { role: 'WARDEN' as const, name: 'Col. Rajesh Pillai (Chief Warden)', desc: 'BH-1, BH-2, GH tickets & room triage' },
    { role: 'ADMIN' as const, name: 'Prof. K. Venkatesh (Dean/Admin)', desc: 'SLA oversight, campus heatmap, governance' },
    { role: 'SUPER_ADMIN' as const, name: 'Super Admin (System Access)', desc: 'Root controls, audit logs, rules' },
  ];

  const handleNavClick = (tab: any) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar-container sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2.5 group focus:outline-hidden text-left"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                    CampusCare
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Sparkles className="w-2.5 h-2.5" /> KITSW
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5 truncate max-w-[170px] sm:max-w-none">
                  Kakatiya Institute of Tech & Science
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dashboard
            </button>

            {userProfile?.role === 'STUDENT' && (
              <button
                onClick={onOpenRaiseModal}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Raise Ticket</span>
              </button>
            )}

            {(userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setActiveTab('heatmap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'heatmap'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Campus Heatmap
              </button>
            )}

            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Announcements
            </button>
          </nav>

          {/* Desktop Right Actions (Hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            {/* Raise Complaint Button for Student */}
            {userProfile?.role === 'STUDENT' && (
              <button
                onClick={onOpenRaiseModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Raise Complaint</span>
              </button>
            )}

            {/* AI Assistant Quick Trigger */}
            <button
              onClick={onOpenAssistantModal}
              title="CampusCare AI Assistant"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
              <span>Ask AI</span>
            </button>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      Notifications
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {unreadCount} unread
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            !n.isRead ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-xs text-slate-900 dark:text-slate-200">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(n.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark Mode Switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                aria-label="User menu"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                  {userProfile?.displayName ? userProfile.displayName.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:block">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 max-w-[120px]">
                    {userProfile?.displayName || 'User'}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {userProfile && getRoleIcon(userProfile.role)}
                    <span>{userProfile?.role?.replace('_', ' ')}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {userProfile?.displayName}
                    </p>
                    <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 truncate">
                      {userProfile?.email}
                    </p>
                    {userProfile?.departmentName && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {userProfile.departmentName}
                      </p>
                    )}
                    {userProfile?.hostel && (
                      <p className="text-[10px] text-slate-400">
                        {userProfile.hostel} {userProfile.roomNumber ? `• Room ${userProfile.roomNumber}` : ''}
                      </p>
                    )}
                    <div className="pt-1 flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          userProfile ? roleColors[userProfile.role] : ''
                        }`}
                      >
                        {userProfile && getRoleIcon(userProfile.role)}
                        {userProfile?.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 px-3">
                    <button
                      onClick={() => {
                        logout();
                        setRoleDropdownOpen(false);
                      }}
                      className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out from CampusCare</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Right Controls: Ask AI, Notifications & Responsive Hamburger Button */}
          <div className="flex items-center gap-1.5 md:hidden">
            {/* Quick Ask AI button */}
            <button
              onClick={onOpenAssistantModal}
              className="p-2 rounded-xl text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-colors"
              title="Ask AI"
              aria-label="Ask CampusCare AI"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
            </button>

            {/* Quick Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">
                      Notifications
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {unreadCount} unread
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setNotifDropdownOpen(false);
                          }}
                          className="p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <div className="font-medium text-slate-900 dark:text-white">
                            {n.title}
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Hamburger Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Slide-Out Hamburger Mobile Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto flex flex-col p-5 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-250">
            {/* Drawer Header with Brand & Close Button */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                    CampusCare
                  </span>
                  <span className="ml-1 text-[10px] font-bold text-slate-400">KITSW</span>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-hidden"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Summary Card */}
            <div className="my-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                  {userProfile?.displayName ? userProfile.displayName.charAt(0) : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {userProfile?.displayName || 'User'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {userProfile?.email}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        userProfile ? roleColors[userProfile.role] : ''
                      }`}
                    >
                      {userProfile && getRoleIcon(userProfile.role)}
                      {userProfile?.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-xs shrink-0"
                title="Toggle theme"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Action Buttons on Mobile */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {userProfile?.role === 'STUDENT' && (
                <button
                  onClick={() => {
                    onOpenRaiseModal();
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Raise Ticket</span>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenAssistantModal();
                  setMobileMenuOpen(false);
                }}
                className={`py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors ${
                  userProfile?.role !== 'STUDENT' ? 'col-span-2' : ''
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Ask CampusCare AI</span>
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Navigation
              </p>

              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              {(userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPER_ADMIN') && (
                <button
                  onClick={() => handleNavClick('heatmap')}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                    activeTab === 'heatmap'
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Campus Heatmap (KITSW)</span>
                </button>
              )}

              <button
                onClick={() => handleNavClick('announcements')}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                  activeTab === 'announcements'
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Megaphone className="w-4 h-4" />
                <span>Announcements</span>
              </button>
            </div>

            {/* Sign Out Button on Mobile */}
            <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out from CampusCare</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
