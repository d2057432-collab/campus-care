# Security Specification for CampusCare

## Data Invariants
1. A user document `/users/{userId}` can only be created with their own `request.auth.uid`. Role assignment is governed: users cannot arbitrarily elevate themselves to ADMIN or SUPER_ADMIN unless matching the configured bootstrap admin email (`d2057432@gmail.com`).
2. A complaint `/complaints/{complaintId}` requires valid category, priority, status, and non-empty studentId.
3. Students can only read and create their own complaints (where `studentId == request.auth.uid`), or view complaints marked as public announcement/non-sensitive.
4. Staff can read and update complaints assigned to their department or assigned to their UID.
5. Internal messages (`isInternal == true`) in `/complaints/{complaintId}/messages/{messageId}` can NEVER be read by students. Only staff/admins can read or write internal notes.
6. Audit logs `/auditLogs/{auditLogId}` are append-only by authorized users or system, and only readable by ADMIN / SUPER_ADMIN.
7. System settings `/systemSettings/{settingId}` can only be modified by ADMIN / SUPER_ADMIN.
8. Notifications `/notifications/{notificationId}` can only be read/updated by the recipient `userId == request.auth.uid`.

## Dirty Dozen Payloads Handled
1. Self-assigned admin role on user creation
2. Spoofed studentId in complaint submission
3. Student reading staff internal notes
4. Unauthorized status transition without required permissions
5. Arbitrary deletion of complaints
6. Student tampering with AI analysis results
7. Student reading other students' private complaints
8. Exceeding field length boundary limits
9. Injection of malicious path variables in document IDs
10. Unauthenticated read of user profiles
11. Modifying immutable createdAt timestamps
12. Tampering with audit logs
