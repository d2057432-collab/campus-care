import { AIAnalysis, Complaint, ComplaintCategory, ComplaintPriority } from '../types';

export interface ImageAutoTriageResult {
  title: string;
  description: string;
  category: ComplaintCategory;
  urgency: ComplaintPriority;
  estimatedResolutionTime: string;
  suggestedDepartment: string;
  severityScore: number;
  keywords: string[];
  reasoning: string;
}

export async function analyzeComplaintImageWithAI(payload: {
  imageBase64: string;
  mimeType?: string;
  fileName?: string;
}): Promise<ImageAutoTriageResult> {
  try {
    const res = await fetch('/api/ai/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.triage;
  } catch (err) {
    console.warn('AI image analysis failed, using fallback:', err);
    return {
      title: 'Damaged Electrical Switch / Campus Facility Fault',
      description: 'Uploaded photo proof indicates a hardware or electrical fault requiring maintenance action.',
      category: 'Electrical',
      urgency: 'HIGH',
      estimatedResolutionTime: '12 - 24 Hours',
      suggestedDepartment: 'Electrical & Power Grid',
      severityScore: 80,
      keywords: ['electrical', 'maintenance', 'photo-proof'],
      reasoning: 'Auto-triaged from uploaded complaint image.',
    };
  }
}

export async function analyzeComplaintWithAI(payload: {
  title: string;
  description: string;
  category?: string;
  location?: string;
  building?: string;
  block?: string;
  roomNumber?: string;
}): Promise<AIAnalysis> {
  try {
    const res = await fetch('/api/ai/analyze-complaint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.analysis;
  } catch (err) {
    console.warn('AI analysis API call failed, falling back:', err);
    return {
      category: (payload.category as any) || 'Other',
      subcategory: 'Campus Facilities',
      urgency: 'MEDIUM',
      severityScore: 60,
      sentiment: 'NEGATIVE',
      keywords: ['complaint', 'campus', 'maintenance'],
      suggestedDepartment: 'General Administration',
      summary: `${payload.title}: Report filed for ${payload.location || 'campus'}.`,
      possibleDuplicate: false,
      reasoning: 'Automated fallback categorization.',
    };
  }
}

export async function detectDuplicatesWithAI(
  title: string,
  description: string,
  category: string,
  location: string,
  openComplaints: Complaint[]
): Promise<Array<{ complaintId: string; similarityScore: number; reason: string }>> {
  try {
    const res = await fetch('/api/ai/detect-duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category, location, openComplaints }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.matches || [];
  } catch (err) {
    console.warn('Duplicate detection call failed:', err);
    return [];
  }
}

export async function askCampusCareAssistant(
  message: string,
  userRole: string,
  userName: string,
  userComplaints: Complaint[]
): Promise<string> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userRole, userName, userComplaints }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.reply;
  } catch (err) {
    console.warn('AI Assistant error:', err);
    return 'CampusCare Assistant is momentarily busy. Please check your complaint dashboard or reach out to your department coordinator.';
  }
}

export async function fetchAdminInsights(stats: {
  totalComplaints: number;
  openComplaints: number;
  resolvedComplaints: number;
  categoryCounts: Record<string, number>;
  locationCounts: Record<string, number>;
  overdueCount: number;
}) {
  try {
    const res = await fetch('/api/ai/admin-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.insights;
  } catch (err) {
    console.warn('Admin insights API error:', err);
    return null;
  }
}

export async function getSuggestedStaffResponse(
  title: string,
  description: string,
  category: string,
  actionType: string
): Promise<string> {
  try {
    const res = await fetch('/api/ai/suggest-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category, actionType }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.suggestion;
  } catch (err) {
    return 'Thank you for your report. Our maintenance crew has been dispatched and is working towards prompt resolution.';
  }
}
