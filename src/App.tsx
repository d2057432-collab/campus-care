import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { AuthPage } from './components/auth/AuthPage';
import { EmailVerificationNotice } from './components/auth/EmailVerificationNotice';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { StaffDashboard } from './components/dashboard/StaffDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { AnnouncementsView } from './components/announcements/AnnouncementsView';
import { CampusHeatmap } from './components/analytics/CampusHeatmap';
import { RaiseComplaintModal } from './components/complaints/RaiseComplaintModal';
import { ComplaintDetailModal } from './components/complaints/ComplaintDetailModal';
import { CampusCareAssistantModal } from './components/ai/CampusCareAssistantModal';
import { Complaint, Announcement } from './types';
import {
  subscribeToComplaints,
  evaluateOverdueComplaints,
  subscribeToAnnouncements,
  createAnnouncementInDb,
} from './services/complaintService';
import {
  generateInitialComplaints,
  INITIAL_ANNOUNCEMENTS,
  seedDemoDataIfEmpty,
} from './services/demoDataService';
import { Sparkles, Loader2 } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, userProfile, loading, isEmailVerified } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'heatmap' | 'admin-settings' | 'announcements'>('dashboard');
  const [complaints, setComplaints] = useState<Complaint[]>(generateInitialComplaints());
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);

  // Modals state
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [raiseModalInitialValues, setRaiseModalInitialValues] = useState<{
    title?: string;
    description?: string;
    location?: string;
  } | undefined>(undefined);

  // Subscribe to real-time complaints in Firestore when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    seedDemoDataIfEmpty();

    const unsub = subscribeToComplaints((list) => {
      setComplaints(list);
      if (list.length > 0) {
        evaluateOverdueComplaints(list);
      }
    });

    const unsubAnn = subscribeToAnnouncements((annList) => {
      if (annList && annList.length > 0) {
        setAnnouncements(annList as Announcement[]);
      }
    });

    return () => {
      unsub();
      unsubAnn();
    };
  }, [currentUser]);

  // Loading indicator on initial boot
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold tracking-wide">
            Connecting to KITSW CampusCare...
          </p>
        </div>
      </div>
    );
  }

  // If not logged in, show dedicated KITSW Authentication & Registration Portal
  if (!userProfile) {
    return <AuthPage />;
  }

  // If logged in but email is not verified, require verification
  if (!isEmailVerified) {
    return <EmailVerificationNotice />;
  }

  // Open complaints for student
  const studentOpenComplaints = complaints.filter(
    (c) => !['RESOLVED', 'CLOSED'].includes(c.status)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRaiseModal={() => {
          setRaiseModalInitialValues(undefined);
          setIsRaiseModalOpen(true);
        }}
        onOpenAssistantModal={() => setIsAssistantModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'heatmap' ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <CampusHeatmap
                complaints={complaints}
                selectedLocation={null}
                onSelectLocation={() => {}}
              />
            </div>
          </div>
        ) : activeTab === 'announcements' ? (
          <AnnouncementsView
            announcements={announcements}
            onAddAnnouncement={async (newAnn) => {
              setAnnouncements((prev) => [newAnn, ...prev]);
              await createAnnouncementInDb(newAnn);
            }}
          />
        ) : (
          /* Role-Based Dashboard View */
          <>
            {userProfile.role === 'STUDENT' && (
              <StudentDashboard
                complaints={complaints}
                announcements={announcements}
                onOpenRaiseModal={() => {
                  setRaiseModalInitialValues(undefined);
                  setIsRaiseModalOpen(true);
                }}
                onOpenAssistantModal={() => setIsAssistantModalOpen(true)}
                onSelectComplaint={(c) => setSelectedComplaint(c)}
              />
            )}

            {(userProfile.role === 'STAFF' ||
              userProfile.role === 'DEPARTMENT_HEAD' ||
              userProfile.role === 'WARDEN') && (
              <StaffDashboard
                complaints={complaints}
                onSelectComplaint={(c) => setSelectedComplaint(c)}
              />
            )}

            {(userProfile.role === 'ADMIN' || userProfile.role === 'SUPER_ADMIN') && (
              <AdminDashboard
                complaints={complaints}
                onSelectComplaint={(c) => setSelectedComplaint(c)}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Action Button for CampusCare Assistant */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setIsAssistantModalOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-xl hover:shadow-2xl hover:scale-105 transition-all ring-4 ring-violet-500/20"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Ask CampusCare AI</span>
        </button>
      </div>

      {/* Raise Complaint Wizard Modal */}
      <RaiseComplaintModal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
        openComplaints={studentOpenComplaints}
        initialValues={raiseModalInitialValues}
        onComplaintCreated={(created) => {
          setComplaints((prev) => [created, ...prev]);
        }}
      />

      {/* Complaint Detail & Live Timeline Modal */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onComplaintUpdated={(updated) => {
          setComplaints((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
          setSelectedComplaint(updated);
        }}
      />

      {/* CampusCare AI Conversational Assistant Modal */}
      <CampusCareAssistantModal
        isOpen={isAssistantModalOpen}
        onClose={() => setIsAssistantModalOpen(false)}
        userComplaints={complaints.filter(
          (c) => c.studentId === userProfile.uid || c.studentEmail === userProfile.email
        )}
        onOpenComplaint={(cId) => {
          const match = complaints.find((c) => c.complaintId === cId || c.id === cId);
          if (match) {
            setIsAssistantModalOpen(false);
            setSelectedComplaint(match);
          }
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
