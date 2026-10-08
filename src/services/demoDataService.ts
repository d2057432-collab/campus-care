import {
  Complaint,
  Department,
  UserProfile,
  Announcement,
} from '../types';
import { db, auth } from '../lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';

export const COLLEGE_DOMAIN = 'kitsw.ac.in';
export const COLLEGE_NAME = 'Kakatiya Institute of Technology & Science, Warangal (KITSW)';

// Complete Master List of KITSW Campus Locations & Facilities
export const KITSW_CAMPUS_PLACES = [
  'Block-I (Administrative Block & Examination Cell)',
  'Block-II (Civil & Mechanical Engineering)',
  'Block-III (Electronics & Electrical Engineering - ECE & EEE)',
  'Block-IV (Computer Science & Information Technology - CSE & IT)',
  'Block-V (Basic Sciences & Humanities - Freshman Block)',
  'Silver Jubilee Block (SJB - Lecture Halls & Seminar Halls)',
  'Central Library & Digital Knowledge Centre',
  'Auditorium & Open Air Theatre (OAT)',
  'Indoor Sports Complex, Gymnasium & Badminton Courts',
  'Outdoor Sports Ground & Cricket Pavilion',
  'Boys Hostel-1 (BH-1 / Krishna Hostel)',
  'Boys Hostel-2 (BH-2 / Godavari Hostel)',
  'Boys Hostel-3 (BH-3 / Kaveri Hostel)',
  'Girls Hostel-1 (GH-1 / Priyadarshini Hostel)',
  'Girls Hostel-2 (GH-2 / Sarojini Hostel)',
  'Student Central Mess & Dining Hall',
  'Campus Cafeteria & Canteen',
  'Health Centre & Dispensary',
  'SBI Bank & ATM Complex',
  'Main Gate & Security Checkpost',
  'Campus Transport & Bus Parking Bay',
  'Power Substation & Generator Yard',
  'Advanced Research & Incubation Centre (TBI)',
  'Student Activity Centre (SAC)',
];

export const DEMO_DEPARTMENTS: Department[] = [
  {
    id: 'dept-it',
    name: 'Computer Science & IT Support',
    code: 'CSE-IT',
    description: 'Campus network backbone, Wi-Fi in Academic Blocks & Hostels, lab systems, student portal.',
    headId: 'staff-head-it',
    headName: 'Dr. Sunita Rao',
    categoriesHandled: ['IT', 'Wi-Fi/Internet', 'Laboratory'],
    slaHours: { CRITICAL: 4, HIGH: 12, MEDIUM: 24, LOW: 48 },
    isActive: true,
    staffCount: 8,
  },
  {
    id: 'dept-facilities',
    name: 'Civil & Plumbing Maintenance',
    code: 'CIVIL-MAINT',
    description: 'Campus water overhead tanks, washroom plumbing, sanitation, drainage in blocks & hostels.',
    headId: 'staff-head-plumb',
    headName: 'Er. Ramesh Kulkarni',
    categoriesHandled: ['Plumbing', 'Cleanliness', 'Infrastructure'],
    slaHours: { CRITICAL: 4, HIGH: 24, MEDIUM: 48, LOW: 72 },
    isActive: true,
    staffCount: 10,
  },
  {
    id: 'dept-hostel',
    name: 'Hostel & Residential Life',
    code: 'HOSTEL-ADMIN',
    description: 'Boys Hostel 1, 2, 3 and Girls Hostel 1, 2 facilities, discipline, and residential welfare.',
    headId: 'staff-warden-chief',
    headName: 'Col. Rajesh Pillai',
    categoriesHandled: ['Hostel', 'Security'],
    slaHours: { CRITICAL: 6, HIGH: 24, MEDIUM: 48, LOW: 72 },
    isActive: true,
    staffCount: 14,
  },
  {
    id: 'dept-electrical',
    name: 'Electrical & Power Grid',
    code: 'EEE-POWER',
    description: 'Campus substation, classroom projectors, streetlights, hostel solar heaters, generator backups.',
    headId: 'staff-head-elec',
    headName: 'Mr. Arvind Sharma',
    categoriesHandled: ['Electrical'],
    slaHours: { CRITICAL: 2, HIGH: 12, MEDIUM: 36, LOW: 48 },
    isActive: true,
    staffCount: 6,
  },
  {
    id: 'dept-mess',
    name: 'Dining & Canteen Services',
    code: 'MESS-FOOD',
    description: 'Hostel central dining mess, college cafeteria, food hygiene inspection, drinking water stations.',
    headId: 'staff-head-mess',
    headName: 'Mrs. Geeta Nambiar',
    categoriesHandled: ['Mess/Food'],
    slaHours: { CRITICAL: 4, HIGH: 12, MEDIUM: 24, LOW: 48 },
    isActive: true,
    staffCount: 12,
  },
  {
    id: 'dept-academics',
    name: 'Academic & Examination Cell',
    code: 'ACADEMIC-CELL',
    description: 'Course registration, hall tickets, timetable grievances, classroom infrastructure.',
    headId: 'staff-head-acad',
    headName: 'Prof. S. Chandrasekhar',
    categoriesHandled: ['Academics', 'Examination', 'Faculty'],
    slaHours: { CRITICAL: 12, HIGH: 24, MEDIUM: 48, LOW: 72 },
    isActive: true,
    staffCount: 9,
  },
];

// Pre-configured accounts for testing / initial setup
export const DEMO_USERS: UserProfile[] = [
  // Super Admin
  {
    uid: 'user-super-admin',
    email: 'd2057432@gmail.com',
    displayName: 'Dean of Student Affairs (Super Admin)',
    role: 'SUPER_ADMIN',
    createdAt: new Date().toISOString(),
  },
  // Admin
  {
    uid: 'user-admin-1',
    email: 'admin@kitsw.ac.in',
    displayName: 'Prof. K. Venkatesh (Admin)',
    role: 'ADMIN',
    departmentName: 'Principal Office & Central Administration',
    phone: '+91 870 2564888',
    createdAt: new Date().toISOString(),
  },
  // Dept Head (IT)
  {
    uid: 'staff-head-it',
    email: 'hod.it@kitsw.ac.in',
    displayName: 'Dr. Sunita Rao (HOD IT)',
    role: 'DEPARTMENT_HEAD',
    departmentId: 'dept-it',
    departmentName: 'Computer Science & IT Support',
    phone: '+91 98491 12345',
    createdAt: new Date().toISOString(),
  },
  // Warden
  {
    uid: 'staff-warden-chief',
    email: 'warden.hostel@kitsw.ac.in',
    displayName: 'Col. Rajesh Pillai (Chief Warden)',
    role: 'WARDEN',
    departmentId: 'dept-hostel',
    departmentName: 'Hostel & Residential Life',
    hostel: 'Boys Hostel-1 (BH-1 / Krishna Hostel)',
    phone: '+91 98491 54321',
    createdAt: new Date().toISOString(),
  },
  // Staff Specialist
  {
    uid: 'staff-1',
    email: 'staff.it@kitsw.ac.in',
    displayName: 'Vikram Singh (Network Specialist)',
    role: 'STAFF',
    departmentId: 'dept-it',
    departmentName: 'Computer Science & IT Support',
    phone: '+91 98765 43210',
    createdAt: new Date().toISOString(),
  },
  // Student Account
  {
    uid: 'student-demo',
    email: 'student@kitsw.ac.in',
    displayName: 'Aarav Sharma (B22CS045)',
    role: 'STUDENT',
    hostel: 'Boys Hostel-1 (BH-1 / Krishna Hostel)',
    roomNumber: '304',
    phone: '+91 91234 56789',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'KITSW Campus Wi-Fi Backbone Upgrade in Block-IV & Hostels',
    content: 'The campus backbone network will undergo core switch optimization this Saturday. Access points in Boys Hostel-1 & 2 will be temporarily re-routed.',
    category: 'MAINTENANCE',
    targetAudience: 'ALL',
    authorName: 'Computer Science & IT Support (KITSW)',
    priority: 'HIGH',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'ann-2',
    title: 'Water Tank Sanitization — Boys & Girls Hostels',
    content: 'Overhead residential water tanks in BH-1, BH-2, and GH-1 will be treated on Sunday morning 08:00 AM - 11:00 AM. Please store adequate water beforehand.',
    category: 'MAINTENANCE',
    targetAudience: 'HOSTELERS',
    authorName: 'Civil & Plumbing Maintenance',
    priority: 'NORMAL',
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
  {
    id: 'ann-3',
    title: 'CampusCare Real-Time Student Complaint Portal Live',
    content: 'Welcome to CampusCare for Kakatiya Institute of Technology & Science, Warangal. Students can report campus infrastructure issues, track live SLA resolution, and rate completed service.',
    category: 'GENERAL',
    targetAudience: 'ALL',
    authorName: 'Principal Office & Central Administration',
    priority: 'HIGH',
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
];

// Clean Real-Time State: Returns empty array so only live real complaints from Firestore are displayed
export function generateInitialComplaints(): Complaint[] {
  return [];
}

// Seed foundational departments and initial college announcements into Firestore if empty
export async function seedDemoDataIfEmpty(): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    const batch = writeBatch(db);

    for (const d of DEMO_DEPARTMENTS) {
      batch.set(doc(db, 'departments', d.id), d, { merge: true });
    }

    for (const a of INITIAL_ANNOUNCEMENTS) {
      batch.set(doc(db, 'announcements', a.id), a, { merge: true });
    }

    await batch.commit();
    return true;
  } catch (err) {
    console.warn('Department metadata sync:', err);
    return false;
  }
}
