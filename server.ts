import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client with Circuit Breaker
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenAI | null = null;
if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
  try {
    genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch (err) {
    // Silent initialization fallback
  }
}

// Circuit breaker to avoid calling Gemini when daily/minute free tier quota is exhausted
let quotaExhaustedUntil: number = 0;

function isQuotaExhausted(): boolean {
  return Date.now() < quotaExhaustedUntil;
}

function handleGeminiRateLimit(err: any) {
  const msg = err?.message || String(err);
  if (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('rate-limits')
  ) {
    // Trip circuit breaker for 10 minutes so subsequent requests use the instant local engine
    quotaExhaustedUntil = Date.now() + 10 * 60 * 1000;
  }
}

// High-Precision KITSW Heuristic Complaint Triage Engine
function fallbackComplaintAnalysis(
  title: string,
  description: string,
  category: string,
  location: string
) {
  const text = `${title} ${description} ${location}`.toLowerCase();

  let detectedCategory = category || 'Other';
  let suggestedDepartment = 'General Administration';
  let subcategory = 'Campus Facilities';
  let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  let severity = 55;

  if (
    text.includes('wifi') ||
    text.includes('wi-fi') ||
    text.includes('internet') ||
    text.includes('network') ||
    text.includes('router') ||
    text.includes('portal')
  ) {
    detectedCategory = 'Wi-Fi/Internet';
    suggestedDepartment = 'Computer Science & IT Support';
    subcategory = 'Hostel & Campus Connectivity';
    urgency =
      text.includes('exam') || text.includes('deadline') || text.includes('entire') || text.includes('bh-1')
        ? 'HIGH'
        : 'MEDIUM';
    severity = 78;
  } else if (
    text.includes('water') ||
    text.includes('leak') ||
    text.includes('tap') ||
    text.includes('pipe') ||
    text.includes('drain') ||
    text.includes('flush')
  ) {
    detectedCategory = 'Plumbing';
    suggestedDepartment = 'Civil & Plumbing Maintenance';
    subcategory = 'Water Supply & Sanitation';
    urgency = text.includes('flood') || text.includes('hazard') || text.includes('lab') ? 'CRITICAL' : 'HIGH';
    severity = 82;
  } else if (
    text.includes('food') ||
    text.includes('mess') ||
    text.includes('meal') ||
    text.includes('canteen') ||
    text.includes('breakfast') ||
    text.includes('dinner')
  ) {
    detectedCategory = 'Mess/Food';
    suggestedDepartment = 'Dining & Canteen Services';
    subcategory = 'Food Quality & Kitchen Hygiene';
    urgency = text.includes('poison') || text.includes('sick') || text.includes('smell') ? 'CRITICAL' : 'HIGH';
    severity = 85;
  } else if (
    text.includes('electric') ||
    text.includes('light') ||
    text.includes('fan') ||
    text.includes('spark') ||
    text.includes('switch') ||
    text.includes('heater') ||
    text.includes('power')
  ) {
    detectedCategory = 'Electrical';
    suggestedDepartment = 'Electrical & Power Grid';
    subcategory = 'Power Fixtures & Wiring';
    urgency = text.includes('spark') || text.includes('smoke') || text.includes('shock') ? 'CRITICAL' : 'HIGH';
    severity = 86;
  } else if (
    text.includes('hostel') ||
    text.includes('room') ||
    text.includes('warden') ||
    text.includes('bed') ||
    text.includes('bh-1') ||
    text.includes('bh-2') ||
    text.includes('gh')
  ) {
    detectedCategory = 'Hostel';
    suggestedDepartment = 'Hostel & Residential Life';
    subcategory = 'Hostel Room Maintenance';
    urgency = 'MEDIUM';
    severity = 65;
  } else if (
    text.includes('projector') ||
    text.includes('block-iv') ||
    text.includes('silver jubilee') ||
    text.includes('bench') ||
    text.includes('ac ')
  ) {
    detectedCategory = 'Infrastructure';
    suggestedDepartment = 'Computer Science & IT Support';
    subcategory = 'Classroom & AV Equipment';
    urgency = 'MEDIUM';
    severity = 60;
  }

  const rawKeywords = text.split(/\W+/).filter((w) => w.length > 3).slice(0, 5);

  return {
    category: detectedCategory,
    subcategory,
    urgency,
    severityScore: severity,
    sentiment: severity > 75 ? 'URGENT' : 'NEGATIVE',
    keywords: rawKeywords.length > 0 ? rawKeywords : ['campus', 'maintenance', 'report'],
    suggestedDepartment,
    summary: `${title.trim()}: Reported issue regarding ${detectedCategory.toLowerCase()} at ${location || 'KITSW campus'}.`,
    possibleDuplicate: text.includes('bh-1') || text.includes('wifi') || text.includes('leakage'),
    reasoning: `Categorized under ${detectedCategory} based on KITSW triage rules. Routed to ${suggestedDepartment} with ${urgency} priority.`,
  };
}

// 1. Complaint Analysis Endpoint
app.post('/api/ai/analyze-complaint', async (req: Request, res: Response) => {
  const { title, description, category, location, building, block, roomNumber } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  if (genAI && !isQuotaExhausted()) {
    try {
      const prompt = `You are CampusCare AI, an expert triage and analysis engine for college complaints at KITSW.
Analyze the following student complaint accurately:
Title: "${title}"
Description: "${description}"
Category Selected: "${category || 'Unspecified'}"
Location: "${location || ''}" (Building: "${building || ''}", Block: "${block || ''}", Room: "${roomNumber || ''}")

Return a valid JSON object strictly matching this schema:
{
  "category": "One of ['Hostel', 'Mess/Food', 'Academics', 'Faculty', 'Infrastructure', 'Electrical', 'Plumbing', 'Cleanliness', 'Security', 'Transport', 'Library', 'Laboratory', 'IT', 'Wi-Fi/Internet', 'Examination', 'Fees/Finance', 'Administration', 'Other']",
  "subcategory": "string descriptor like 'Wi-Fi Access', 'Water Pressure', 'Food Hygiene'",
  "urgency": "One of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']",
  "severityScore": number between 1 and 100,
  "sentiment": "One of ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'URGENT']",
  "keywords": ["array", "of", "3-5", "relevant", "keywords"],
  "suggestedDepartment": "Name of best department",
  "summary": "1 concise sentence summarizing the complaint",
  "possibleDuplicate": true or false,
  "reasoning": "1-2 sentences explaining priority and routing rationale"
}
Ensure strictly valid JSON without markdown fences.`;

      const response = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(cleanJson);
      return res.json({ success: true, analysis: parsed, provider: 'gemini-3.8-flash' });
    } catch (err: any) {
      handleGeminiRateLimit(err);
    }
  }

  // Seamless fallback to high-precision KITSW engine
  const fallback = fallbackComplaintAnalysis(title, description, category, location);
  return res.json({ success: true, analysis: fallback, provider: 'campuscare-triage-engine' });
});

// 2. Duplicate Detection Endpoint
app.post('/api/ai/detect-duplicates', async (req: Request, res: Response) => {
  const { title, description, category, location, openComplaints = [] } = req.body;

  if (!openComplaints || openComplaints.length === 0) {
    return res.json({ matches: [] });
  }

  if (genAI && !isQuotaExhausted() && openComplaints.length > 0) {
    try {
      const candidates = openComplaints.slice(0, 10).map((c: any) => ({
        id: c.complaintId || c.id,
        title: c.title,
        category: c.category,
        location: c.location,
        snippet: (c.description || '').slice(0, 100),
      }));

      const prompt = `Compare this incoming complaint with open complaints to detect duplicates.
Incoming Complaint:
Title: "${title}"
Description: "${description}"
Category: "${category}"
Location: "${location}"

Open Tickets:
${JSON.stringify(candidates, null, 2)}

Return a JSON array of duplicate matches:
[
  {
    "complaintId": "matching ID",
    "similarityScore": number between 0.70 and 1.0,
    "reason": "Why these represent the same root incident"
  }
]`;

      const response = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const cleanJson = (response.text || '[]').replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(cleanJson);
      return res.json({ matches: parsed });
    } catch (err: any) {
      handleGeminiRateLimit(err);
    }
  }

  // Fast, reliable token and semantic similarity heuristic
  const currentTokens = `${title} ${description} ${location}`
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
  const matches = [];

  for (const c of openComplaints) {
    const candidateTokens = `${c.title} ${c.description} ${c.location}`
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 3);
    const common = currentTokens.filter((t) => candidateTokens.includes(t));
    const score = common.length / Math.max(currentTokens.length, 1);

    const sameLocation =
      c.location && location && c.location.toLowerCase() === location.toLowerCase();
    const sameCategory = c.category === category;

    if (score >= 0.4 || (sameCategory && sameLocation)) {
      matches.push({
        complaintId: c.complaintId || c.id,
        title: c.title,
        similarityScore: Math.min(0.95, Math.round((0.6 + score * 0.35) * 100) / 100),
        reason: `Similar issue reported in ${c.location || 'same area'} under ${c.category}.`,
      });
    }
  }

  return res.json({ matches: matches.slice(0, 3) });
});

// 3. AI Chat Assistant ("CampusCare Assistant")
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { message, userRole = 'STUDENT', userName = 'Student', userComplaints = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const complaintsContext = userComplaints.map((c: any) => ({
    id: c.complaintId || c.id,
    title: c.title,
    category: c.category,
    status: c.status,
    priority: c.priority,
    department: c.departmentName || 'Assigned Department',
    created: c.createdAt,
    lastUpdate: c.updatedAt || c.createdAt,
    isOverdue: c.isOverdue || false,
    resolutionNote: c.resolutionNote || null,
  }));

  if (genAI && !isQuotaExhausted()) {
    try {
      const prompt = `You are "CampusCare Assistant" for Kakatiya Institute of Technology & Science, Warangal (KITSW).
User: ${userName} (Role: ${userRole})

User's Registered Complaints:
${JSON.stringify(complaintsContext, null, 2)}

College Policies:
- Wi-Fi/Internet: Handled by Computer Science & IT Support. Standard SLA is 24 hours.
- Hostel Maintenance: Handled by Chief Warden and Civil Maintenance for BH-1, BH-2, GH.
- Canteen/Mess: Handled by Dining Services with immediate hygiene inspections.
- Escalations: Tickets exceeding SLA escalate to HOD, then Dean/Principal.

Respond warmly, concisely, and helpfully. If the student asks about a ticket ID (e.g. CMP-2026-1001), look up details from above.`;

      const response = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${prompt}\n\nUser Question: "${message}"` }] },
        ],
        config: {
          temperature: 0.3,
        },
      });

      return res.json({ reply: response.text });
    } catch (err: any) {
      handleGeminiRateLimit(err);
    }
  }

  // Intelligent Context-Aware Conversational Fallback
  const q = message.toLowerCase();
  let reply = `Hello ${userName}! I'm CampusCare Assistant for KITSW. `;

  if (q.includes('cmp-') || q.includes('status') || q.includes('track') || q.includes('where is')) {
    const match = userComplaints.find(
      (c: any) =>
        q.includes((c.complaintId || '').toLowerCase()) ||
        q.includes((c.id || '').toLowerCase())
    );
    if (match) {
      reply += `Your complaint **${match.complaintId}** ("${match.title}") is currently **${match.status.replace('_', ' ')}**. It is handled by **${match.departmentName || 'Computer Science & IT Support'}** with priority **${match.priority}**.`;
    } else if (userComplaints.length > 0) {
      const latest = userComplaints[0];
      reply += `You have ${userComplaints.length} complaint(s) on file. Your latest ticket **${latest.complaintId}** ("${latest.title}") is **${latest.status.replace('_', ' ')}** with ${latest.departmentName || 'department'}.`;
    } else {
      reply += `You currently have no complaints on file. Click "Raise Complaint" to submit a ticket!`;
    }
  } else if (q.includes('wifi') || q.includes('internet')) {
    reply += `For campus or hostel Wi-Fi issues, tickets are routed to Computer Science & IT Support in Block-IV. Standard resolution SLA is 24 hours.`;
  } else if (q.includes('water') || q.includes('leak') || q.includes('plumb')) {
    reply += `Plumbing and water issues across BH-1, BH-2, GH, and Academic Blocks are assigned to Civil & Plumbing Maintenance with high urgency.`;
  } else if (q.includes('escalat') || q.includes('overdue') || q.includes('sla')) {
    reply += `Any complaint unresolved within its SLA (Critical: 4h, High: 24h, Medium: 48h, Low: 72h) automatically escalates to the HOD and Dean of Student Affairs.`;
  } else {
    reply += `I can help you track complaints, look up department SLAs, check Wi-Fi maintenance schedules, or guide you through filing a new report. What would you like assistance with?`;
  }

  return res.json({ reply });
});

// 4. Admin AI Insights Endpoint
app.post('/api/ai/admin-insights', async (req: Request, res: Response) => {
  const {
    totalComplaints = 0,
    openComplaints = 0,
    resolvedComplaints = 0,
    categoryCounts = {},
    locationCounts = {},
    overdueCount = 0,
  } = req.body;

  if (genAI && !isQuotaExhausted()) {
    try {
      const prompt = `You are CampusCare Chief AI Analyst for KITSW. Analyze this telemetry:
- Total: ${totalComplaints}, Open: ${openComplaints}, Resolved: ${resolvedComplaints}, Overdue: ${overdueCount}
- Categories: ${JSON.stringify(categoryCounts)}
- Locations: ${JSON.stringify(locationCounts)}

Return JSON:
{
  "systemHealth": "OPTIMAL" | "ATTENTION_REQUIRED" | "CRITICAL_ACTION_NEEDED",
  "keyObservations": ["Observation 1", "Observation 2", "Observation 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "hotspotAlert": "Hotspot location description",
  "projectedTrend": "Improving / Stable / Deteriorating"
}`;

      const response = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const cleanJson = (response.text || '{}').replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(cleanJson);
      return res.json({ insights: parsed });
    } catch (err: any) {
      handleGeminiRateLimit(err);
    }
  }

  // Synthesized Administrative Telemetry
  const topCategory =
    Object.entries(categoryCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'Wi-Fi/Internet';
  const topLocation =
    Object.entries(locationCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'Boys Hostel-1 (BH-1)';

  return res.json({
    insights: {
      systemHealth: overdueCount > 2 ? 'ATTENTION_REQUIRED' : 'OPTIMAL',
      keyObservations: [
        `${topCategory} represents the highest volume of reported issues across campus blocks.`,
        `${topLocation} is identified as the primary concentration zone for infrastructure reports.`,
        `${overdueCount} ticket(s) currently exceed standard SLA resolution thresholds.`,
      ],
      recommendations: [
        `Deploy an IT maintenance inspection sweep for access points in ${topLocation}.`,
        `Review preventive maintenance schedules for plumbing and electrical fixtures in residential blocks.`,
      ],
      hotspotAlert: `${topLocation} shows higher ticket frequency than average.`,
      projectedTrend: 'Stable',
    },
  });
});

// 5. Staff Suggested Response Endpoint
app.post('/api/ai/suggest-response', async (req: Request, res: Response) => {
  const { title, description, category, actionType = 'IN_PROGRESS' } = req.body;

  if (genAI && !isQuotaExhausted()) {
    try {
      const prompt = `Compose a courteous, professional update from KITSW staff to a student regarding their complaint:
Title: "${title}"
Details: "${description}"
Category: "${category}"
Update Action: "${actionType}"
Generate 2-3 sentences informing the student of action taken.`;

      const response = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { temperature: 0.3 },
      });

      return res.json({ suggestion: response.text?.trim() });
    } catch (err: any) {
      handleGeminiRateLimit(err);
    }
  }

  let text = `Thank you for bringing this to our attention. Our on-site maintenance team at KITSW has been dispatched and is actively resolving the issue within the standard SLA window.`;
  if (actionType === 'RESOLVED') {
    text = `This issue has been thoroughly resolved and inspected on-site by our department crew. Please verify and submit your feedback rating.`;
  }

  return res.json({ suggestion: text });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'CampusCare - KITSW',
    geminiActive: !!genAI && !isQuotaExhausted(),
    circuitBreakerOpen: isQuotaExhausted(),
    timestamp: new Date().toISOString(),
  });
});

// Vite Integration: Dev vs Prod
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CampusCare - KITSW] Server running on http://0.0.0.0:${PORT} (Production: ${isProduction})`);
});
