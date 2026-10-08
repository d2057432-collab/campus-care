import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Complaint,
  ComplaintStatus,
  ComplaintPriority,
  TimelineEvent,
  ComplaintMessage,
  Notification,
  AuditLog,
  UserRole,
  UserProfile,
} from '../types';

export const SLA_HOURS_MAP: Record<ComplaintPriority, number> = {
  CRITICAL: 4,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
};

export function calculateDueDate(priority: ComplaintPriority): string {
  const hours = SLA_HOURS_MAP[priority] || 48;
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export function generateComplaintId(): string {
  const prefix = 'CMP-2026';
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${random}`;
}

// 1. Create Complaint
export async function createComplaint(
  data: Omit<Complaint, 'id' | 'complaintId' | 'status' | 'timeline' | 'slaHours' | 'dueDate' | 'isOverdue' | 'escalationLevel' | 'createdAt' | 'updatedAt'>
): Promise<Complaint> {
  const complaintId = generateComplaintId();
  const docRef = doc(collection(db, 'complaints'));
  const now = new Date().toISOString();
  const priority = data.priority || 'MEDIUM';
  const slaHours = SLA_HOURS_MAP[priority] || 48;
  const dueDate = calculateDueDate(priority);

  const initialTimeline: TimelineEvent = {
    id: `tl-${Date.now()}`,
    status: 'SUBMITTED',
    changedBy: data.studentId,
    changedByName: data.isAnonymous ? 'Student (Anonymous)' : data.studentName,
    changedByRole: 'STUDENT',
    timestamp: now,
    comment: 'Complaint raised by student.',
  };

  const newComplaint: Complaint = {
    ...data,
    id: docRef.id,
    complaintId,
    status: 'SUBMITTED',
    priority,
    slaHours,
    dueDate,
    isOverdue: false,
    escalationLevel: 0,
    timeline: [initialTimeline],
    createdAt: now,
    updatedAt: now,
  };

  if (auth.currentUser) {
    try {
      await setDoc(docRef, newComplaint);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `complaints/${docRef.id}`);
    }

    // Create audit log
    await createAuditLog({
      actorId: data.studentId,
      actorName: data.isAnonymous ? 'Student (Anonymous)' : data.studentName,
      actorRole: 'STUDENT',
      action: 'CREATE_COMPLAINT',
      targetId: complaintId,
      targetType: 'COMPLAINT',
      timestamp: now,
      details: { title: data.title, category: data.category, priority },
    }).catch(() => {});

    // Create notification for student
    await createNotification({
      userId: data.studentId,
      title: `Complaint Submitted (${complaintId})`,
      message: `Your complaint "${data.title}" was submitted successfully. Expected resolution within ${slaHours} hours.`,
      type: 'SUBMITTED',
      complaintId,
    }).catch(() => {});
  }

  return newComplaint;
}

// 2. Update Status
export async function updateComplaintStatus(
  complaint: Complaint,
  newStatus: ComplaintStatus,
  user: { uid: string; displayName: string; role: UserRole },
  options?: {
    comment?: string;
    resolutionNote?: string;
    resolutionProofUrls?: string[];
    assignedStaffId?: string;
    assignedStaffName?: string;
  }
): Promise<void> {
  const docRef = doc(db, 'complaints', complaint.id);
  const now = new Date().toISOString();

  const newTimelineEvent: TimelineEvent = {
    id: `tl-${Date.now()}`,
    status: newStatus,
    changedBy: user.uid,
    changedByName: user.displayName,
    changedByRole: user.role,
    timestamp: now,
    comment: options?.comment || `Status updated to ${newStatus.replace('_', ' ')}.`,
  };

  const updateData: Partial<Complaint> = {
    status: newStatus,
    updatedAt: now,
    timeline: [...(complaint.timeline || []), newTimelineEvent],
  };

  if (newStatus === 'RESOLVED') {
    updateData.resolvedAt = now;
    if (options?.resolutionNote) updateData.resolutionNote = options.resolutionNote;
    if (options?.resolutionProofUrls) updateData.resolutionProofUrls = options.resolutionProofUrls;
  }

  if (options?.assignedStaffId) {
    updateData.assignedStaffId = options.assignedStaffId;
    updateData.assignedStaffName = options.assignedStaffName || 'Staff Member';
  }

  if (newStatus === 'ESCALATED') {
    updateData.escalationLevel = (complaint.escalationLevel || 0) + 1;
  }

  if (auth.currentUser) {
    try {
      await updateDoc(docRef, updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `complaints/${complaint.id}`);
    }

    // Audit log
    await createAuditLog({
      actorId: user.uid,
      actorName: user.displayName,
      actorRole: user.role,
      action: `STATUS_CHANGE_${newStatus}`,
      targetId: complaint.complaintId,
      targetType: 'COMPLAINT',
      timestamp: now,
      details: { from: complaint.status, to: newStatus, note: options?.comment },
    }).catch(() => {});

    // Notify student
    await createNotification({
      userId: complaint.studentId,
      title: `Complaint Updated: ${newStatus.replace('_', ' ')}`,
      message: `Your complaint ${complaint.complaintId} has been marked as ${newStatus.replace('_', ' ')}.`,
      type: newStatus === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGE',
      complaintId: complaint.complaintId,
    }).catch(() => {});
  }
}

// 3. Submit Feedback
export async function submitComplaintFeedback(
  complaintId: string,
  rating: number,
  comment?: string
): Promise<void> {
  const docRef = doc(db, 'complaints', complaintId);
  const now = new Date().toISOString();

  if (auth.currentUser) {
    try {
      await updateDoc(docRef, {
        feedback: {
          rating,
          comment: comment || '',
          submittedAt: now,
        },
        updatedAt: now,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `complaints/${complaintId}`);
    }
  }
}

// 4. Link Duplicate Complaint
export async function linkToMasterComplaint(
  childComplaintId: string,
  masterComplaintId: string,
  user: { uid: string; displayName: string; role: UserRole }
): Promise<void> {
  const childRef = doc(db, 'complaints', childComplaintId);
  const masterRef = doc(db, 'complaints', masterComplaintId);
  const now = new Date().toISOString();

  if (auth.currentUser) {
    try {
      // Update child
      await updateDoc(childRef, {
        masterComplaintId,
        updatedAt: now,
      });

      // Update master
      const masterSnap = await getDoc(masterRef);
      if (masterSnap.exists()) {
        const masterData = masterSnap.data() as Complaint;
        const linked = masterData.linkedComplaintIds || [];
        if (!linked.includes(childComplaintId)) {
          await updateDoc(masterRef, {
            isMasterComplaint: true,
            linkedComplaintCount: (masterData.linkedComplaintCount || 1) + 1,
            linkedComplaintIds: [...linked, childComplaintId],
            updatedAt: now,
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `complaints/link`);
    }
  }
}

// 5. Messages Subcollection
export async function addComplaintMessage(
  complaintId: string,
  message: {
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    message: string;
    isInternal: boolean;
  }
): Promise<ComplaintMessage> {
  const messagesCol = collection(db, 'complaints', complaintId, 'messages');
  const msgDoc = doc(messagesCol);
  const now = new Date().toISOString();

  const newMsg: ComplaintMessage = {
    id: msgDoc.id,
    complaintId,
    ...message,
    createdAt: now,
  };

  if (auth.currentUser) {
    try {
      await setDoc(msgDoc, newMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `complaints/${complaintId}/messages/${msgDoc.id}`);
    }
  }

  return newMsg;
}

export function subscribeToMessages(
  complaintId: string,
  callback: (messages: ComplaintMessage[]) => void,
  userRole: UserRole
) {
  if (!auth.currentUser) {
    return () => {};
  }

  const messagesCol = collection(db, 'complaints', complaintId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => d.data() as ComplaintMessage);
      // Students cannot see internal staff notes
      if (userRole === 'STUDENT') {
        callback(msgs.filter((m) => !m.isInternal));
      } else {
        callback(msgs);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `complaints/${complaintId}/messages`);
    }
  );
}

// 6. Realtime Complaints Listener
export function subscribeToComplaints(
  callback: (complaints: Complaint[]) => void,
  filter?: { studentId?: string; departmentId?: string; role?: UserRole }
) {
  if (!auth.currentUser) {
    return () => {};
  }

  const colRef = collection(db, 'complaints');
  let q = query(colRef, orderBy('createdAt', 'desc'));

  if (filter?.role === 'STUDENT' && filter?.studentId) {
    q = query(colRef, where('studentId', '==', filter.studentId), orderBy('createdAt', 'desc'));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Complaint));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'complaints');
    }
  );
}

// 7. Notifications
export async function createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<void> {
  if (!auth.currentUser) {
    return;
  }

  const notifRef = doc(collection(db, 'notifications'));
  const now = new Date().toISOString();

  const notif: Notification = {
    ...data,
    id: notifRef.id,
    isRead: false,
    createdAt: now,
  };

  try {
    await setDoc(notifRef, notif);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${notifRef.id}`);
  }
}

export function subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return () => {};
  }

  const colRef = collection(db, 'notifications');
  const q = query(colRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const notifs = snapshot.docs.map((d) => d.data() as Notification);
      callback(notifs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  );
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

// 8. Audit Logs
export async function createAuditLog(data: Omit<AuditLog, 'id'>): Promise<void> {
  if (!auth.currentUser) return;
  const logRef = doc(collection(db, 'auditLogs'));
  const log: AuditLog = {
    ...data,
    id: logRef.id,
  };

  try {
    await setDoc(logRef, log);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${logRef.id}`);
  }
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void) {
  if (!auth.currentUser) {
    return () => {};
  }

  const colRef = collection(db, 'auditLogs');
  const q = query(colRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((d) => d.data() as AuditLog);
      callback(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    }
  );
}

// 9. SLA Monitor Check (can be triggered client-side or periodically)
export async function evaluateOverdueComplaints(complaints: Complaint[]): Promise<number> {
  const now = new Date().getTime();
  let updatedCount = 0;

  for (const c of complaints) {
    if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) continue;
    
    const dueTime = new Date(c.dueDate).getTime();
    if (now > dueTime && !c.isOverdue) {
      const docRef = doc(db, 'complaints', c.id);
      try {
        await updateDoc(docRef, {
          isOverdue: true,
          status: 'ESCALATED',
          escalationLevel: Math.max(c.escalationLevel || 0, 1),
          updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      } catch (err) {
        console.warn('Failed to update overdue ticket:', err);
      }
    }
  }

  return updatedCount;
}

// 10. Real-Time Registered Users Listener for Admin & Staff
export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  if (!auth.currentUser) {
    return () => {};
  }

  const colRef = collection(db, 'users');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const users = snapshot.docs.map((d) => ({ ...d.data(), uid: d.id } as UserProfile));
      callback(users);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

export async function updateUserRoleInDb(
  uid: string,
  newRole: UserRole,
  departmentId?: string,
  departmentName?: string
): Promise<void> {
  if (!auth.currentUser) return;
  const userRef = doc(db, 'users', uid);
  try {
    const updateData: any = { role: newRole, updatedAt: new Date().toISOString() };
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (departmentName !== undefined) updateData.departmentName = departmentName;
    await updateDoc(userRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

// 11. Admin Enrollment / Provisioning of College User Records (Students, Staff, Wardens, HODs, Admins)
export async function createOrUpdateCollegeUserInDb(profile: UserProfile): Promise<void> {
  if (!auth.currentUser) return;
  const userRef = doc(db, 'users', profile.uid);
  try {
    const cleanData = Object.fromEntries(
      Object.entries(profile).filter(([_, v]) => v !== undefined && v !== '')
    );
    await setDoc(userRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
  }
}

// 12. Real-Time Departments Listener & Creation
export function subscribeToDepartments(callback: (departments: any[]) => void) {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'departments');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'departments');
    }
  );
}

export async function saveDepartmentInDb(dept: any): Promise<void> {
  if (!auth.currentUser) return;
  const deptRef = doc(db, 'departments', dept.id);
  try {
    await setDoc(deptRef, dept, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `departments/${dept.id}`);
  }
}

// 13. Real-Time Announcements Listener & Creation
export function subscribeToAnnouncements(callback: (announcements: any[]) => void) {
  if (!auth.currentUser) {
    return () => {};
  }
  const colRef = collection(db, 'announcements');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    }
  );
}

export async function createAnnouncementInDb(announcement: any): Promise<void> {
  if (!auth.currentUser) return;
  const annRef = doc(db, 'announcements', announcement.id);
  try {
    await setDoc(annRef, announcement);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `announcements/${announcement.id}`);
  }
}

