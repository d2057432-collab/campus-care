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
import { db, auth, handleFirestoreError, safeLogFirestoreError, OperationType } from '../lib/firebase';
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

// Deeply sanitize objects/arrays to remove undefined fields before writing to Firestore
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result as T;
}

const LOCAL_COMPLAINTS_KEY = 'kitsw_complaints_store';
const complaintListeners = new Set<() => void>();

export function getLocalComplaints(): Complaint[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMPLAINTS_KEY);
    return raw ? (JSON.parse(raw) as Complaint[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalComplaint(complaint: Complaint): void {
  try {
    const existing = getLocalComplaints();
    const updated = [complaint, ...existing.filter((c) => c.id !== complaint.id)];
    localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(updated));
    complaintListeners.forEach((fn) => fn());
  } catch {
    // Ignore storage quota errors
  }
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

  const initialTimeline: TimelineEvent = sanitizeForFirestore({
    id: `tl-${Date.now()}`,
    status: 'SUBMITTED',
    changedBy: data.studentId,
    changedByName: data.isAnonymous ? 'Student (Anonymous)' : data.studentName,
    changedByRole: 'STUDENT',
    timestamp: now,
    comment: 'Complaint raised by student.',
    proofImageUrl: data.proofImageUrl,
  });

  const newComplaint: Complaint = sanitizeForFirestore({
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
  });

  saveLocalComplaint(newComplaint);

  if (auth.currentUser) {
    try {
      await setDoc(docRef, sanitizeForFirestore(newComplaint));
    } catch (error) {
      safeLogFirestoreError(error, OperationType.CREATE, `complaints/${docRef.id}`);
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
      userEmail: data.studentEmail,
      title: `Complaint Submitted (${complaintId})`,
      message: `Your complaint "${data.title}" was submitted successfully. Expected resolution within ${data.estimatedResolutionTime || `${slaHours} hours`}.`,
      type: 'SUBMITTED',
      complaintId,
      newStatus: 'SUBMITTED',
    }).catch(() => {});
  } else {
    await createNotification({
      userId: data.studentId,
      userEmail: data.studentEmail,
      title: `Complaint Submitted (${complaintId})`,
      message: `Your complaint "${data.title}" was submitted successfully. Expected resolution within ${data.estimatedResolutionTime || `${slaHours} hours`}.`,
      type: 'SUBMITTED',
      complaintId,
      newStatus: 'SUBMITTED',
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
    proofImageUrl?: string;
  }
): Promise<void> {
  const docRef = doc(db, 'complaints', complaint.id);
  const now = new Date().toISOString();

  const newTimelineEvent: TimelineEvent = sanitizeForFirestore({
    id: `tl-${Date.now()}`,
    status: newStatus,
    changedBy: user.uid,
    changedByName: user.displayName,
    changedByRole: user.role,
    timestamp: now,
    comment: options?.comment || `Status updated to ${newStatus.replace('_', ' ')}.`,
    proofImageUrl: options?.proofImageUrl || options?.resolutionProofUrls?.[0],
  });

  const updateData: Partial<Complaint> = {
    status: newStatus,
    updatedAt: now,
    timeline: [...(complaint.timeline || []), newTimelineEvent],
  };

  if (newStatus === 'RESOLVED') {
    updateData.resolvedAt = now;
    if (options?.resolutionNote) updateData.resolutionNote = options.resolutionNote;
    if (options?.resolutionProofUrls && options.resolutionProofUrls.length > 0) {
      updateData.resolutionProofUrls = options.resolutionProofUrls;
    } else if (options?.proofImageUrl) {
      updateData.resolutionProofUrls = [options.proofImageUrl];
    }
  }

  if (options?.assignedStaffId) {
    updateData.assignedStaffId = options.assignedStaffId;
    updateData.assignedStaffName = options.assignedStaffName || 'Staff Member';
  }

  if (newStatus === 'ESCALATED') {
    updateData.escalationLevel = (complaint.escalationLevel || 0) + 1;
  }

  const sanitizedUpdate = sanitizeForFirestore(updateData);

  // Sync local complaint cache
  saveLocalComplaint({ ...complaint, ...sanitizedUpdate });

  if (auth.currentUser) {
    try {
      await updateDoc(docRef, sanitizedUpdate);
    } catch (error) {
      safeLogFirestoreError(error, OperationType.UPDATE, `complaints/${complaint.id}`);
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
  }

  // Always notify the student when their complaint status changes
  await createNotification({
    userId: complaint.studentId,
    userEmail: complaint.studentEmail,
    title: `Complaint Status Updated: ${newStatus.replace('_', ' ')}`,
    message: `Your complaint ${complaint.complaintId} ("${complaint.title}") status changed from ${complaint.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')}.${options?.comment ? ` Note: ${options.comment}` : ''}`,
    type: newStatus === 'RESOLVED' ? 'RESOLVED' : newStatus === 'ESCALATED' ? 'ESCALATED' : 'STATUS_CHANGE',
    complaintId: complaint.complaintId,
    newStatus,
  }).catch(() => {});
}

// 3. Submit Feedback (Auto-Escalates if rated 1 or 2 stars)
export async function submitComplaintFeedback(
  complaint: Complaint,
  rating: number,
  comment?: string,
  studentUser?: { uid: string; displayName: string }
): Promise<{ escalated: boolean; updatedComplaint: Complaint }> {
  const docRef = doc(db, 'complaints', complaint.id);
  const now = new Date().toISOString();
  const isLowRating = rating <= 2;

  const feedbackObj = sanitizeForFirestore({
    rating,
    comment: comment || '',
    submittedAt: now,
    escalatedByFeedback: isLowRating,
  });

  const timelineEvents = [...(complaint.timeline || [])];
  if (isLowRating) {
    timelineEvents.push(
      sanitizeForFirestore({
        id: `tl-${Date.now()}`,
        status: 'ESCALATED' as ComplaintStatus,
        changedBy: studentUser?.uid || complaint.studentId,
        changedByName: studentUser?.displayName || complaint.studentName,
        changedByRole: 'STUDENT' as UserRole,
        timestamp: now,
        comment: `Automatically reopened & flagged as ESCALATED due to low student resolution rating (${rating}/5 stars).${comment ? ` Student feedback: "${comment}"` : ''}`,
      })
    );
  }

  const updateFields: Partial<Complaint> = sanitizeForFirestore({
    feedback: feedbackObj,
    updatedAt: now,
    ...(isLowRating
      ? {
          status: 'ESCALATED' as ComplaintStatus,
          escalationLevel: Math.max((complaint.escalationLevel || 0) + 1, 2),
          isOverdue: true,
          timeline: timelineEvents,
        }
      : {}),
  });

  const updatedComplaint: Complaint = {
    ...complaint,
    ...updateFields,
  };

  saveLocalComplaint(updatedComplaint);

  if (auth.currentUser) {
    try {
      await updateDoc(docRef, updateFields);
    } catch (error) {
      safeLogFirestoreError(error, OperationType.UPDATE, `complaints/${complaint.id}`);
    }

    if (isLowRating) {
      await createAuditLog({
        actorId: studentUser?.uid || complaint.studentId,
        actorName: studentUser?.displayName || complaint.studentName,
        actorRole: 'STUDENT',
        action: 'AUTO_ESCALATED_LOW_RATING',
        targetId: complaint.complaintId,
        targetType: 'COMPLAINT',
        timestamp: now,
        details: `Ticket ${complaint.complaintId} rated ${rating}/5 stars by student. Automatically reopened and escalated for Admin/HOD review.`,
      }).catch(() => {});
    }
  }

  if (isLowRating) {
    await createNotification({
      userId: complaint.studentId,
      userEmail: complaint.studentEmail,
      title: `Ticket Reopened & Escalated (${complaint.complaintId})`,
      message: `Because you rated the resolution ${rating}/5 stars, your complaint "${complaint.title}" has been automatically reopened and flagged as ESCALATED for Admin and HOD review.`,
      type: 'ESCALATED',
      complaintId: complaint.complaintId,
      newStatus: 'ESCALATED',
    }).catch(() => {});
  }

  return { escalated: isLowRating, updatedComplaint };
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

const LOCAL_MESSAGES_KEY_PREFIX = 'kitsw_messages_';
const messageListeners = new Map<string, Set<() => void>>();

function getLocalMessages(complaintId: string): ComplaintMessage[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_MESSAGES_KEY_PREFIX}${complaintId}`);
    return raw ? (JSON.parse(raw) as ComplaintMessage[]) : [];
  } catch {
    return [];
  }
}

function saveLocalMessage(complaintId: string, msg: ComplaintMessage): void {
  try {
    const existing = getLocalMessages(complaintId);
    const updated = [...existing.filter((m) => m.id !== msg.id), msg].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    localStorage.setItem(`${LOCAL_MESSAGES_KEY_PREFIX}${complaintId}`, JSON.stringify(updated));
    const set = messageListeners.get(complaintId);
    if (set) set.forEach((fn) => fn());
  } catch {
    // Ignore storage error
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
    attachments?: Array<{ id: string; name: string; url: string; type?: string }>;
  }
): Promise<ComplaintMessage> {
  const messagesCol = collection(db, 'complaints', complaintId, 'messages');
  const msgDoc = doc(messagesCol);
  const now = new Date().toISOString();

  const newMsg: ComplaintMessage = sanitizeForFirestore({
    id: msgDoc.id,
    complaintId,
    ...message,
    createdAt: now,
  });

  saveLocalMessage(complaintId, newMsg);

  if (auth.currentUser) {
    try {
      await setDoc(msgDoc, sanitizeForFirestore(newMsg));
    } catch (error) {
      safeLogFirestoreError(error, OperationType.CREATE, `complaints/${complaintId}/messages/${msgDoc.id}`);
    }
  }

  return newMsg;
}

export function subscribeToMessages(
  complaintId: string,
  callback: (messages: ComplaintMessage[]) => void,
  userRole: UserRole
) {
  let firestoreMsgs: ComplaintMessage[] = [];

  const emitMerged = () => {
    const localMsgs = getLocalMessages(complaintId);
    const map = new Map<string, ComplaintMessage>();
    [...localMsgs, ...firestoreMsgs].forEach((m) => map.set(m.id, m));
    const all = Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    if (userRole === 'STUDENT') {
      callback(all.filter((m) => !m.isInternal));
    } else {
      callback(all);
    }
  };

  emitMerged();
  if (!messageListeners.has(complaintId)) {
    messageListeners.set(complaintId, new Set());
  }
  messageListeners.get(complaintId)!.add(emitMerged);

  let unsubFirestore = () => {};
  if (auth.currentUser) {
    const messagesCol = collection(db, 'complaints', complaintId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        firestoreMsgs = snapshot.docs.map((d) => d.data() as ComplaintMessage);
        emitMerged();
      },
      (err) => {
        safeLogFirestoreError(err, OperationType.LIST, `complaints/${complaintId}/messages`);
      }
    );
  }

  return () => {
    messageListeners.get(complaintId)?.delete(emitMerged);
    unsubFirestore();
  };
}

// 6. Realtime Complaints Listener
export function subscribeToComplaints(
  callback: (complaints: Complaint[]) => void,
  filter?: { studentId?: string; departmentId?: string; role?: UserRole }
) {
  let firestoreItems: Complaint[] = [];

  const emitMerged = () => {
    const localItems = getLocalComplaints();
    const map = new Map<string, Complaint>();
    [...localItems, ...firestoreItems].forEach((c) => map.set(c.id, c));
    let merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (filter?.role === 'STUDENT' && filter?.studentId) {
      merged = merged.filter((c) => c.studentId === filter.studentId);
    }
    callback(merged);
  };

  emitMerged();
  complaintListeners.add(emitMerged);

  let unsubFirestore = () => {};
  if (auth.currentUser) {
    const colRef = collection(db, 'complaints');
    let q = query(colRef, orderBy('createdAt', 'desc'));

    if (filter?.role === 'STUDENT' && filter?.studentId) {
      q = query(colRef, where('studentId', '==', filter.studentId), orderBy('createdAt', 'desc'));
    }

    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        firestoreItems = snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Complaint));
        firestoreItems.forEach((c) => {
          try {
            const existing = getLocalComplaints();
            const updated = [c, ...existing.filter((x) => x.id !== c.id)];
            localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(updated));
          } catch {
            // Ignore
          }
        });
        emitMerged();
      },
      (error) => {
        safeLogFirestoreError(error, OperationType.LIST, 'complaints');
      }
    );
  }

  return () => {
    complaintListeners.delete(emitMerged);
    unsubFirestore();
  };
}

const LOCAL_NOTIFS_KEY = 'kitsw_notifications_store';
const notifListeners = new Set<() => void>();

function getLocalNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    return raw ? (JSON.parse(raw) as Notification[]) : [];
  } catch {
    return [];
  }
}

function saveLocalNotification(notif: Notification): void {
  try {
    const existing = getLocalNotifications();
    const updated = [notif, ...existing.filter((n) => n.id !== notif.id)].slice(0, 200);
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
    notifListeners.forEach((fn) => fn());
  } catch {
    // Ignore storage error
  }
}

// 7. Notifications
export async function createNotification(
  data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
): Promise<void> {
  const notifRef = doc(collection(db, 'notifications'));
  const now = new Date().toISOString();

  const notif: Notification = sanitizeForFirestore({
    ...data,
    id: notifRef.id,
    isRead: false,
    createdAt: now,
  });

  // Save locally & notify in-app listeners immediately
  saveLocalNotification(notif);

  // Sync to backend API
  fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notif),
  }).catch(() => {});

  if (auth.currentUser) {
    try {
      await setDoc(notifRef, notif);
    } catch (error) {
      safeLogFirestoreError(error, OperationType.CREATE, `notifications/${notifRef.id}`);
    }
  }
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  userEmail?: string
) {
  const cleanEmail = userEmail?.trim().toLowerCase();
  let firestoreNotifs: Notification[] = [];

  const emitMerged = () => {
    const localList = getLocalNotifications().filter(
      (n) =>
        n.userId === userId ||
        (cleanEmail && n.userEmail?.toLowerCase() === cleanEmail)
    );
    const map = new Map<string, Notification>();
    [...firestoreNotifs, ...localList].forEach((n) => {
      map.set(n.id, n);
    });
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(merged);
  };

  emitMerged();
  notifListeners.add(emitMerged);

  // Also fetch backend notifications
  fetch(`/api/notifications/${encodeURIComponent(userId)}?email=${encodeURIComponent(cleanEmail || '')}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data?.notifications && Array.isArray(data.notifications)) {
        data.notifications.forEach((n: Notification) => saveLocalNotification(n));
      }
    })
    .catch(() => {});

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_NOTIFS_KEY) {
      emitMerged();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  let unsubFirestore = () => {};
  if (auth.currentUser) {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('userId', '==', userId));

    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        firestoreNotifs = snapshot.docs.map((d) => d.data() as Notification);
        emitMerged();
      },
      (error) => {
        safeLogFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );
  }

  return () => {
    notifListeners.delete(emitMerged);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
    unsubFirestore();
  };
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const existing = getLocalNotifications();
    const updated = existing.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
    notifListeners.forEach((fn) => fn());
  } catch {
    // Ignore
  }

  if (!auth.currentUser) return;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
  } catch (error) {
    safeLogFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

// 8. Audit Logs
export async function createAuditLog(data: Omit<AuditLog, 'id'>): Promise<void> {
  if (!auth.currentUser) return;
  const logRef = doc(collection(db, 'auditLogs'));
  const log: AuditLog = sanitizeForFirestore({
    ...data,
    id: logRef.id,
  });

  try {
    await setDoc(logRef, log);
  } catch (error) {
    safeLogFirestoreError(error, OperationType.CREATE, `auditLogs/${logRef.id}`);
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
      safeLogFirestoreError(error, OperationType.LIST, 'auditLogs');
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
      safeLogFirestoreError(error, OperationType.LIST, 'users');
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
      safeLogFirestoreError(error, OperationType.LIST, 'departments');
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
      safeLogFirestoreError(error, OperationType.LIST, 'announcements');
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

