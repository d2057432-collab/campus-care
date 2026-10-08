export type UserRole =
  | 'STUDENT'
  | 'STAFF'
  | 'DEPARTMENT_HEAD'
  | 'WARDEN'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  rollNumber?: string;
  yearOfStudy?: string;
  section?: string;
  employeeId?: string;
  designation?: string;
  departmentId?: string;
  departmentName?: string;
  hostel?: string;
  roomNumber?: string;
  phone?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ComplaintCategory =
  | 'Electrical'
  | 'Network/Wi-Fi'
  | 'Hostel Maintenance'
  | 'Civil'
  | 'Academic'
  | 'Hostel'
  | 'Mess/Food'
  | 'Academics'
  | 'Faculty'
  | 'Infrastructure'
  | 'Plumbing'
  | 'Cleanliness'
  | 'Security'
  | 'Transport'
  | 'Library'
  | 'Laboratory'
  | 'IT'
  | 'Wi-Fi/Internet'
  | 'Examination'
  | 'Fees/Finance'
  | 'Administration'
  | 'Other';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'AI_ANALYZED'
  | 'ASSIGNED'
  | 'IN_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'REOPENED';

export interface TimelineEvent {
  id: string;
  status: ComplaintStatus;
  changedBy: string;
  changedByName: string;
  changedByRole: UserRole | 'SYSTEM';
  timestamp: string;
  comment?: string;
  proofImageUrl?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface AIAnalysis {
  category: ComplaintCategory;
  subcategory: string;
  urgency: ComplaintPriority;
  severityScore: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT';
  keywords: string[];
  suggestedDepartment: string;
  summary: string;
  possibleDuplicate: boolean;
  duplicateMatchId?: string;
  reasoning: string;
  estimatedResolutionTime?: string;
  suggestedTitle?: string;
}

export interface ComplaintFeedback {
  rating: number; // 1 to 5
  comment?: string;
  submittedAt: string;
  escalatedByFeedback?: boolean;
}

export interface Complaint {
  id: string;
  complaintId: string; // CMP-2026-XXXX
  title: string;
  description: string;
  category: ComplaintCategory;
  subcategory?: string;
  location: string;
  building?: string;
  block?: string;
  roomNumber?: string;
  landmark?: string;
  estimatedResolutionTime?: string;
  proofImageUrl?: string;
  departmentId?: string;
  departmentName?: string;
  priority: ComplaintPriority;
  urgency?: ComplaintPriority;
  severityScore?: number;
  status: ComplaintStatus;
  isAnonymous: boolean;
  studentId: string;
  studentName: string;
  studentEmail: string;
  contactPreference?: 'EMAIL' | 'PHONE' | 'IN_APP';
  assignedStaffId?: string;
  assignedStaffName?: string;
  attachments?: Attachment[];
  timeline: TimelineEvent[];
  slaHours: number;
  dueDate: string;
  isOverdue: boolean;
  escalationLevel: number; // 0 = normal, 1 = staff, 2 = dept head, 3 = admin
  aiAnalysis?: AIAnalysis;
  isMasterComplaint?: boolean;
  masterComplaintId?: string;
  linkedComplaintCount?: number;
  linkedComplaintIds?: string[];
  resolutionNote?: string;
  resolutionProofUrls?: string[];
  resolvedAt?: string;
  feedback?: ComplaintFeedback;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  headId: string;
  headName: string;
  categoriesHandled: ComplaintCategory[];
  slaHours: Record<ComplaintPriority, number>;
  isActive: boolean;
  staffCount?: number;
}

export interface ComplaintMessage {
  id: string;
  complaintId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  isInternal: boolean; // Internal staff note vs public discussion
  attachments?: Attachment[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  message: string;
  type: 'SUBMITTED' | 'ASSIGNED' | 'STATUS_CHANGE' | 'ESCALATED' | 'RESOLVED' | 'DUPLICATE' | 'ANNOUNCEMENT';
  complaintId?: string;
  newStatus?: ComplaintStatus;
  isRead: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'MAINTENANCE' | 'ALERT' | 'ACADEMIC' | 'GENERAL';
  targetAudience: 'ALL' | 'STUDENTS' | 'HOSTELERS' | 'STAFF';
  authorName: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorName?: string;
  actorRole?: UserRole | 'SYSTEM';
  performedBy?: string;
  performedByRole?: UserRole | 'SYSTEM';
  action: string;
  targetId: string;
  targetType?: 'COMPLAINT' | 'USER' | 'DEPARTMENT' | 'SETTING' | 'SLA';
  timestamp: string;
  details?: Record<string, any> | string;
}

export interface SystemSettings {
  allowedEmailDomain: string;
  autoEscalationEnabled: boolean;
  slaConfig: {
    LOW: number; // 72h
    MEDIUM: number; // 48h
    HIGH: number; // 24h
    CRITICAL: number; // 4h
  };
  duplicateThreshold: number; // 0.70
}
