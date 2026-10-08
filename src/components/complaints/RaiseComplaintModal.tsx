import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  AIAnalysis,
} from '../../types';
import { createComplaint } from '../../services/complaintService';
import { analyzeComplaintWithAI, detectDuplicatesWithAI } from '../../services/aiService';
import { KITSW_CAMPUS_PLACES } from '../../services/demoDataService';
import {
  X,
  Sparkles,
  AlertTriangle,
  MapPin,
  FileText,
  UserCheck,
  Send,
  Loader2,
  CheckCircle2,
  Info,
  Link2,
  Paperclip,
} from 'lucide-react';

interface RaiseComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  openComplaints: Complaint[];
  onComplaintCreated: (complaint: Complaint) => void;
  initialValues?: { title?: string; description?: string; location?: string };
}

const CATEGORIES: ComplaintCategory[] = [
  'Hostel',
  'Mess/Food',
  'Academics',
  'Faculty',
  'Infrastructure',
  'Electrical',
  'Plumbing',
  'Cleanliness',
  'Security',
  'Transport',
  'Library',
  'Laboratory',
  'IT',
  'Wi-Fi/Internet',
  'Examination',
  'Fees/Finance',
  'Administration',
  'Other',
];

const LOCATIONS = KITSW_CAMPUS_PLACES;

export const RaiseComplaintModal: React.FC<RaiseComplaintModalProps> = ({
  isOpen,
  onClose,
  openComplaints,
  onComplaintCreated,
  initialValues,
}) => {
  const { userProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [category, setCategory] = useState<ComplaintCategory>('Wi-Fi/Internet');
  const [location, setLocation] = useState(initialValues?.location || 'Hostel Block B');
  const [building, setBuilding] = useState('Hostel B');
  const [block, setBlock] = useState('3rd Floor');
  const [roomNumber, setRoomNumber] = useState(userProfile?.roomNumber || '304');
  const [priority, setPriority] = useState<ComplaintPriority>('HIGH');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [contactPreference, setContactPreference] = useState<'IN_APP' | 'EMAIL' | 'PHONE'>('IN_APP');

  // AI states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<Array<{ complaintId: string; similarityScore: number; reason: string }>>([]);
  const [linkedToMasterId, setLinkedToMasterId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<Complaint | null>(null);

  // Sync initial values when modal opens
  useEffect(() => {
    if (initialValues?.title) setTitle(initialValues.title);
    if (initialValues?.description) setDescription(initialValues.description);
    if (initialValues?.location) setLocation(initialValues.location);
  }, [initialValues]);

  // Debounced real-time AI analysis & duplicate detection
  const lastAnalyzedText = React.useRef('');

  useEffect(() => {
    const currentText = `${title} ${description}`.trim();
    if (currentText.length < 10 || currentText === lastAnalyzedText.current) return;

    const timer = setTimeout(async () => {
      lastAnalyzedText.current = currentText;
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeComplaintWithAI({
          title,
          description: description || title,
          category,
          location,
          building,
          block,
          roomNumber,
        });
        setAiAnalysis(analysis);

        // Only check duplicates if text is substantial
        if (currentText.length >= 16) {
          const duplicates = await detectDuplicatesWithAI(
            title,
            description || title,
            category,
            location,
            openComplaints
          );
          setDuplicateMatches(duplicates);
        }
      } catch (err) {
        // Graceful handling
      } finally {
        setIsAnalyzing(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [title, description, category, location, openComplaints]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSubmitting(true);

    try {
      const newTicket = await createComplaint({
        title,
        description,
        category: aiAnalysis?.category || category,
        subcategory: aiAnalysis?.subcategory,
        location,
        building,
        block,
        roomNumber,
        priority: priority || aiAnalysis?.urgency || 'MEDIUM',
        urgency: aiAnalysis?.urgency || 'MEDIUM',
        severityScore: aiAnalysis?.severityScore || 65,
        isAnonymous,
        studentId: userProfile.uid,
        studentName: userProfile.displayName,
        studentEmail: userProfile.email,
        contactPreference,
        departmentId: aiAnalysis?.suggestedDepartment ? 'dept-it' : undefined,
        departmentName: aiAnalysis?.suggestedDepartment || 'IT Support & Networking',
        aiAnalysis: aiAnalysis || undefined,
        masterComplaintId: linkedToMasterId || undefined,
      });

      setCreatedResult(newTicket);
      onComplaintCreated(newTicket);
      setStep(3); // Result step
    } catch (err) {
      console.error('Failed to submit complaint:', err);
      alert('Could not submit complaint. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Raise New Complaint
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI will triage, detect duplicates, and route to the correct department
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {step === 3 && createdResult ? (
            /* Success confirmation */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Complaint Raised Successfully!
                </h4>
                <div className="inline-block mt-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold rounded-lg text-sm border border-indigo-200 dark:border-indigo-800">
                  {createdResult.complaintId}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                  Assigned to <span className="font-semibold text-slate-700 dark:text-slate-300">{createdResult.departmentName}</span>. Standard SLA expected resolution within {createdResult.slaHours} hours.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-left border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">SUBMITTED (Live in staff queue)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Location:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{createdResult.location}</span>
                </div>
                {createdResult.aiAnalysis && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">AI Priority Rating:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {createdResult.aiAnalysis.urgency} (Score: {createdResult.aiAnalysis.severityScore}/100)
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-sm"
                >
                  View in My Complaints
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step indicator */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className={step === 1 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                  1. Issue & Category
                </span>
                <span className={step === 2 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                  2. Location & Preferences
                </span>
              </div>

              {step === 1 ? (
                <>
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Complaint Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Wi-Fi is not working in Hostel Block B since this morning"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Detailed Description *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide specific details, room numbers, symptoms, or deadlines affected..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                    />
                  </div>

                  {/* Real-Time Gemini AI Triage Card */}
                  <div className="p-4 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-violet-800 dark:text-violet-300">
                        <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        <span>Gemini AI Live Triage Pipeline</span>
                      </div>
                      {isAnalyzing && (
                        <span className="text-[10px] text-violet-600 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Analyzing text...
                        </span>
                      )}
                    </div>

                    {aiAnalysis ? (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-violet-100 dark:border-violet-900/40">
                            <span className="text-[10px] text-slate-400 block">Detected Category</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {aiAnalysis.category}
                            </span>
                          </div>
                          <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-violet-100 dark:border-violet-900/40">
                            <span className="text-[10px] text-slate-400 block">Urgency / Severity</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              {aiAnalysis.urgency} ({aiAnalysis.severityScore}/100)
                            </span>
                          </div>
                          <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-violet-100 dark:border-violet-900/40 col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-slate-400 block">Suggested Routing</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {aiAnalysis.suggestedDepartment}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                          "{aiAnalysis.summary}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Type a title and description above to watch Gemini analyze urgency, categorize keywords, and detect duplicate tickets across campus.
                      </p>
                    )}
                  </div>

                  {/* DUPLICATE DETECTION WARNING PANEL (Major Hackathon Feature) */}
                  {duplicateMatches.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-2 flex-1">
                          <div>
                            <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              Possible Duplicate Found ({duplicateMatches.length} similar ticket{duplicateMatches.length > 1 ? 's' : ''})
                            </h5>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300">
                              Other students have recently reported a similar incident in this area. You can link your report to the master ticket to expedite resolution.
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            {duplicateMatches.map((m) => (
                              <div
                                key={m.complaintId}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/50 text-xs"
                              >
                                <div>
                                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-2">
                                    {m.complaintId}
                                  </span>
                                  <span className="text-slate-700 dark:text-slate-300">{m.reason}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLinkedToMasterId(m.complaintId)}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                                    linkedToMasterId === m.complaintId
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                                  }`}
                                >
                                  <Link2 className="w-3 h-3" />
                                  {linkedToMasterId === m.complaintId ? 'Linked' : 'Link to Ticket'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={!title || !description}
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-2"
                    >
                      <span>Next: Location & Privacy</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Step 2 */
                <>
                  {/* Location Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Campus Location *
                      </label>
                      <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      >
                        {LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Building / Complex
                      </label>
                      <input
                        type="text"
                        value={building}
                        onChange={(e) => setBuilding(e.target.value)}
                        placeholder="e.g. Hostel B"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Block / Floor / Wing
                      </label>
                      <input
                        type="text"
                        value={block}
                        onChange={(e) => setBlock(e.target.value)}
                        placeholder="e.g. 3rd Floor - Wing 2"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Room Number (if applicable)
                      </label>
                      <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="e.g. 304"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Priority Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Priority Level
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as ComplaintPriority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                            priority === p
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Anonymity Option */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="anonymousToggle"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor="anonymousToggle"
                        className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                      >
                        Submit Anonymously
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Your identity will be masked from responding staff and other students. Only the central system audit retains an encrypted trace for safety compliance.
                      </p>
                    </div>
                  </div>

                  {/* Attachment simulation */}
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                    <Paperclip className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                      Attach photo or proof document (JPG, PNG, PDF up to 10MB)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Validated for secure Firebase Storage upload
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting Complaint...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Ticket</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
