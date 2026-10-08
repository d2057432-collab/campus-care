import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Complaint,
  ComplaintCategory,
  ComplaintPriority,
  AIAnalysis,
  Attachment,
} from '../../types';
import { createComplaint } from '../../services/complaintService';
import {
  analyzeComplaintWithAI,
  detectDuplicatesWithAI,
  analyzeComplaintImageWithAI,
} from '../../services/aiService';
import {
  KITSW_CAMPUS_BLOCKS,
  KITSW_HOSTEL_FACILITIES,
} from '../../services/demoDataService';
import {
  X,
  Sparkles,
  AlertTriangle,
  MapPin,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  Link2,
  Camera,
  Upload,
  Clock,
  Building2,
  Home,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

interface RaiseComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  openComplaints: Complaint[];
  onComplaintCreated: (complaint: Complaint) => void;
  initialValues?: { title?: string; description?: string; location?: string };
}

const PRIMARY_CATEGORIES: ComplaintCategory[] = [
  'Electrical',
  'Network/Wi-Fi',
  'Hostel Maintenance',
  'Civil',
  'Academic',
  'Plumbing',
  'Cleanliness',
  'Mess/Food',
  'Laboratory',
  'Security',
  'Transport',
  'Library',
  'Other',
];

// Compress uploaded image via canvas to keep base64 size small (<120KB) for Firestore & Gemini API
async function compressImageToDataUrl(file: File, maxWidth = 800, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [category, setCategory] = useState<ComplaintCategory>('Electrical');
  const [priority, setPriority] = useState<ComplaintPriority>('HIGH');
  const [estimatedResolutionTime, setEstimatedResolutionTime] = useState<string>('12 - 24 Hours');

  // Structured KITSW Campus Location & Block Selector
  const [zoneType, setZoneType] = useState<'CAMPUS_BLOCK' | 'HOSTEL_FACILITY'>('CAMPUS_BLOCK');
  const [selectedFacility, setSelectedFacility] = useState<string>(KITSW_CAMPUS_BLOCKS[3]); // Block-IV default
  const [floorOrWing, setFloorOrWing] = useState<string>('2nd Floor');
  const [roomOrLabNumber, setRoomOrLabNumber] = useState<string>(userProfile?.roomNumber || 'Lab-204');
  const [landmark, setLandmark] = useState<string>('');

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [contactPreference, setContactPreference] = useState<'IN_APP' | 'EMAIL' | 'PHONE'>('IN_APP');

  // Complaint Photo Upload & Gemini Vision Auto-Triage states
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageTriageBanner, setImageTriageBanner] = useState<{
    category: string;
    urgency: string;
    estimatedResolutionTime: string;
    reasoning: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Text AI states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<
    Array<{ complaintId: string; similarityScore: number; reason: string }>
  >([]);
  const [linkedToMasterId, setLinkedToMasterId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<Complaint | null>(null);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCreatedResult(null);
      if (initialValues?.title) setTitle(initialValues.title);
      if (initialValues?.description) setDescription(initialValues.description);
    }
  }, [isOpen, initialValues]);

  // Handle switching between Campus Blocks and Hostel Facilities
  const handleZoneTypeChange = (type: 'CAMPUS_BLOCK' | 'HOSTEL_FACILITY') => {
    setZoneType(type);
    if (type === 'CAMPUS_BLOCK') {
      setSelectedFacility(KITSW_CAMPUS_BLOCKS[0]);
    } else {
      setSelectedFacility(KITSW_HOSTEL_FACILITIES[0]);
    }
  };

  // Handle Photo Upload / Camera Capture & Trigger Gemini Vision Auto-Triage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsAnalyzingImage(true);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file);
      setUploadedImagePreview(compressedDataUrl);

      const triage = await analyzeComplaintImageWithAI({
        imageBase64: compressedDataUrl,
        mimeType: 'image/jpeg',
        fileName: file.name,
      });

      if (triage) {
        setTitle(triage.title);
        if (!description.trim() || description.length < 15) {
          setDescription(triage.description);
        }
        setCategory(triage.category as ComplaintCategory);
        setPriority(triage.urgency as ComplaintPriority);
        setEstimatedResolutionTime(triage.estimatedResolutionTime || '12 - 24 Hours');
        setImageTriageBanner({
          category: triage.category,
          urgency: triage.urgency,
          estimatedResolutionTime: triage.estimatedResolutionTime || '12 - 24 Hours',
          reasoning: triage.reasoning,
        });
        setAiAnalysis({
          category: triage.category as ComplaintCategory,
          subcategory: 'AI Visual Inspection',
          urgency: triage.urgency as ComplaintPriority,
          severityScore: triage.severityScore || 82,
          sentiment: triage.urgency === 'CRITICAL' ? 'URGENT' : 'NEGATIVE',
          keywords: triage.keywords || ['visual-proof', 'kitsw'],
          suggestedDepartment: triage.suggestedDepartment || 'Electrical & Power Grid',
          summary: triage.description,
          possibleDuplicate: false,
          reasoning: triage.reasoning,
          estimatedResolutionTime: triage.estimatedResolutionTime,
        });
      }
    } catch (err) {
      console.warn('Error processing complaint image:', err);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Debounced real-time AI text analysis & duplicate detection
  const lastAnalyzedText = useRef('');

  useEffect(() => {
    const currentText = `${title} ${description}`.trim();
    if (currentText.length < 10 || currentText === lastAnalyzedText.current || isAnalyzingImage) return;

    const timer = setTimeout(async () => {
      lastAnalyzedText.current = currentText;
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeComplaintWithAI({
          title,
          description: description || title,
          category,
          location: selectedFacility,
          building: selectedFacility,
          block: floorOrWing,
          roomNumber: roomOrLabNumber,
        });
        setAiAnalysis(analysis);
        if (analysis.estimatedResolutionTime) {
          setEstimatedResolutionTime(analysis.estimatedResolutionTime);
        }

        if (currentText.length >= 16) {
          const duplicates = await detectDuplicatesWithAI(
            title,
            description || title,
            category,
            selectedFacility,
            openComplaints
          );
          setDuplicateMatches(duplicates);
        }
      } catch {
        // Silent fallback
      } finally {
        setIsAnalyzing(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [title, description, category, selectedFacility, openComplaints, isAnalyzingImage]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSubmitting(true);

    try {
      const attachmentsList: Attachment[] = uploadedImagePreview
        ? [
            {
              id: `att-${Date.now()}`,
              name: uploadedFileName || 'issue_proof.jpg',
              url: uploadedImagePreview,
              type: 'image/jpeg',
            },
          ]
        : [];

      const fullLocationString = `${selectedFacility}${roomOrLabNumber ? ` • Room/Lab ${roomOrLabNumber}` : ''}${landmark ? ` (${landmark})` : ''}`;

      const deptMap: Record<string, { id: string; name: string }> = {
        Electrical: { id: 'dept-electrical', name: 'Electrical & Power Grid' },
        'Network/Wi-Fi': { id: 'dept-it', name: 'Computer Science & IT Support' },
        'Wi-Fi/Internet': { id: 'dept-it', name: 'Computer Science & IT Support' },
        IT: { id: 'dept-it', name: 'Computer Science & IT Support' },
        'Hostel Maintenance': { id: 'dept-hostel', name: 'Hostel & Residential Life' },
        Hostel: { id: 'dept-hostel', name: 'Hostel & Residential Life' },
        Civil: { id: 'dept-facilities', name: 'Civil & Plumbing Maintenance' },
        Plumbing: { id: 'dept-facilities', name: 'Civil & Plumbing Maintenance' },
        Academic: { id: 'dept-academics', name: 'Academic & Examination Cell' },
        Academics: { id: 'dept-academics', name: 'Academic & Examination Cell' },
        'Mess/Food': { id: 'dept-mess', name: 'Dining & Canteen Services' },
      };

      const targetDept = deptMap[category] || {
        id: 'dept-facilities',
        name: aiAnalysis?.suggestedDepartment || 'Civil & Plumbing Maintenance',
      };

      const newTicket = await createComplaint({
        title: title.trim(),
        description: description.trim(),
        category,
        subcategory: aiAnalysis?.subcategory || zoneType.replace('_', ' '),
        location: selectedFacility,
        building: selectedFacility,
        block: floorOrWing.trim(),
        roomNumber: roomOrLabNumber.trim(),
        landmark: landmark.trim() || undefined,
        estimatedResolutionTime: estimatedResolutionTime || aiAnalysis?.estimatedResolutionTime || '12 - 24 Hours',
        proofImageUrl: uploadedImagePreview || undefined,
        attachments: attachmentsList.length > 0 ? attachmentsList : undefined,
        priority: priority || aiAnalysis?.urgency || 'MEDIUM',
        urgency: priority || aiAnalysis?.urgency || 'MEDIUM',
        severityScore: aiAnalysis?.severityScore || 75,
        isAnonymous,
        studentId: userProfile.uid,
        studentName: userProfile.displayName,
        studentEmail: userProfile.email,
        contactPreference,
        departmentId: targetDept.id,
        departmentName: targetDept.name,
        aiAnalysis: aiAnalysis || undefined,
        masterComplaintId: linkedToMasterId || undefined,
      });

      setCreatedResult(newTicket);
      onComplaintCreated(newTicket);
      setStep(3);
    } catch (err) {
      console.error('Failed to submit complaint:', err);
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
                Raise New Campus Complaint
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload issue photo for instant Gemini AI auto-triage & structured KITSW block routing
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
        <div className="p-6 max-h-[82vh] overflow-y-auto">
          {step === 3 && createdResult ? (
            /* Success confirmation */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Complaint Registered & Routed!
                </h4>
                <div className="inline-block mt-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold rounded-lg text-sm border border-indigo-200 dark:border-indigo-800">
                  {createdResult.complaintId}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                  Assigned to <span className="font-semibold text-slate-700 dark:text-slate-300">{createdResult.departmentName}</span>. Estimated resolution time: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{createdResult.estimatedResolutionTime || `${createdResult.slaHours} hours`}</span>.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-left border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">SUBMITTED (Live in staff queue)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location & Pinpoint:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {createdResult.location} {createdResult.roomNumber ? `• ${createdResult.roomNumber}` : ''} {createdResult.landmark ? `(${createdResult.landmark})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Urgency & Est. Fix Time:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {createdResult.priority} • {createdResult.estimatedResolutionTime || `${createdResult.slaHours}h SLA`}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-sm"
                >
                  Track Live Status in Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step indicator */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`flex items-center gap-1.5 ${
                    step === 1 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''
                  }`}
                >
                  <span>1. Photo AI Auto-Triage & Issue Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (title && description) setStep(2);
                  }}
                  className={`flex items-center gap-1.5 ${
                    step === 2 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''
                  }`}
                >
                  <span>2. KITSW Block / Hostel Selector & Submit</span>
                </button>
              </div>

              {step === 1 ? (
                <>
                  {/* Feature 1: Complaint Photo Upload & Gemini Vision AI Auto-Triage */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-violet-50/60 to-slate-50 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>Issue Proof Photo & Gemini AI Auto-Triage</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
                              Vision AI
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Upload or capture a photo (damaged lab switch, AC fault, water cooler leak) to auto-fill title, category, urgency & ETA
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hidden file & camera inputs */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {uploadedImagePreview ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800">
                        <img
                          src={uploadedImagePreview}
                          alt="Complaint proof preview"
                          referrerPolicy="no-referrer"
                          className="w-24 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {uploadedFileName || 'Captured Issue Photo'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadedImagePreview(null);
                                setUploadedFileName('');
                                setImageTriageBanner(null);
                              }}
                              className="text-rose-500 hover:text-rose-600 p-1 rounded-lg text-xs flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>

                          {isAnalyzingImage ? (
                            <div className="space-y-1.5 py-1">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Gemini Vision analyzing photo & pre-filling fields...</span>
                              </div>
                              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                            </div>
                          ) : imageTriageBanner ? (
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 space-y-0.5">
                              <div className="font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>
                                  Auto-Filled: {imageTriageBanner.category} • {imageTriageBanner.urgency} Urgency • Est. {imageTriageBanner.estimatedResolutionTime}
                                </span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 line-clamp-2">
                                {imageTriageBanner.reasoning}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="py-3 px-4 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 bg-white/80 dark:bg-slate-900/80 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-2 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload Photo Proof</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="py-3 px-4 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 hover:border-violet-500 bg-white/80 dark:bg-slate-900/80 text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center justify-center gap-2 transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Take Photo with Camera</span>
                        </button>
                      </div>
                    )}
                  </div>

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
                      placeholder="e.g. Damaged lab switchboard in Block-IV or Water cooler leak"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Category, Urgency & Estimated Resolution Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      >
                        {PRIMARY_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Urgency Level *
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      >
                        <option value="CRITICAL">Critical (2 - 4h SLA)</option>
                        <option value="HIGH">High (12 - 24h SLA)</option>
                        <option value="MEDIUM">Medium (24 - 48h SLA)</option>
                        <option value="LOW">Low (48 - 72h SLA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Est. Resolution Time
                      </label>
                      <div className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{estimatedResolutionTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Detailed Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the exact issue, equipment affected, or safety hazard..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                    />
                  </div>

                  {/* Live Gemini AI Triage Summary */}
                  {(isAnalyzing || aiAnalysis) && (
                    <div className="p-3.5 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-800/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-violet-800 dark:text-violet-300">
                          <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          <span>Gemini AI Triage Assessment</span>
                        </div>
                        {isAnalyzing && (
                          <span className="text-[10px] text-violet-600 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Updating triage...
                          </span>
                        )}
                      </div>

                      {aiAnalysis && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-violet-100 dark:border-violet-900/40">
                            <span className="text-[10px] text-slate-400 block">Routed Dept</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                              {aiAnalysis.suggestedDepartment}
                            </span>
                          </div>
                          <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-violet-100 dark:border-violet-900/40">
                            <span className="text-[10px] text-slate-400 block">Urgency Score</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              {aiAnalysis.urgency} ({aiAnalysis.severityScore}/100)
                            </span>
                          </div>
                          <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-violet-100 dark:border-violet-900/40">
                            <span className="text-[10px] text-slate-400 block">Est. Resolution</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {estimatedResolutionTime}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Duplicate Detection Warning */}
                  {duplicateMatches.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-1">
                          <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            Similar Active Ticket Found ({duplicateMatches.length})
                          </h5>
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
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                }`}
                              >
                                <Link2 className="w-3 h-3" />
                                {linkedToMasterId === m.complaintId ? 'Linked' : 'Link'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={!title.trim() || !description.trim()}
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-2"
                    >
                      <span>Next: Select KITSW Block / Hostel Location →</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Step 2: Structured KITSW Campus Location & Block Selector */
                <>
                  <div className="space-y-4">
                    {/* Zone Type Selector: Campus Blocks vs Hostel Facilities */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        1. Select KITSW Zone Category *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleZoneTypeChange('CAMPUS_BLOCK')}
                          className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                            zoneType === 'CAMPUS_BLOCK'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
                          <div>
                            <div className="text-xs font-bold">Academic & Campus Blocks</div>
                            <div className="text-[10px] text-slate-500">Block-I to IV, SJB, Mechanical Sheds</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleZoneTypeChange('HOSTEL_FACILITY')}
                          className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                            zoneType === 'HOSTEL_FACILITY'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Home className="w-5 h-5 text-indigo-600 shrink-0" />
                          <div>
                            <div className="text-xs font-bold">Hostel Facilities</div>
                            <div className="text-[10px] text-slate-500">Boys Hostel-1, Boys Hostel-2, Girls Hostel</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Structured Block / Hostel Pills */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        2. Select Specific {zoneType === 'CAMPUS_BLOCK' ? 'Campus Block' : 'Hostel Facility'} *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(zoneType === 'CAMPUS_BLOCK' ? KITSW_CAMPUS_BLOCKS : KITSW_HOSTEL_FACILITIES).map(
                          (item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setSelectedFacility(item)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-left transition-all flex items-center gap-1.5 ${
                                selectedFacility === item
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{item}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Pinpoint Inputs: Floor/Wing, Room/Lab Number, and Landmark */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Floor / Wing *
                        </label>
                        <select
                          value={floorOrWing}
                          onChange={(e) => setFloorOrWing(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold"
                        >
                          <option value="Ground Floor">Ground Floor</option>
                          <option value="1st Floor">1st Floor</option>
                          <option value="2nd Floor">2nd Floor</option>
                          <option value="3rd Floor">3rd Floor</option>
                          <option value="North Wing">North Wing</option>
                          <option value="South Wing">South Wing</option>
                          <option value="Main Corridor / Outdoor">Main Corridor / Outdoor</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Room / Lab Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={roomOrLabNumber}
                          onChange={(e) => setRoomOrLabNumber(e.target.value)}
                          placeholder="e.g. Lab-302 / Room 108"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Specific Landmark *
                        </label>
                        <input
                          type="text"
                          required
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder="e.g. Near Drinking Water Cooler / HOD Cabin"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Anonymity Option */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="anonymousToggle"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <div className="space-y-0.5">
                      <label
                        htmlFor="anonymousToggle"
                        className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                      >
                        Submit Anonymously
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Your name and roll number will be hidden from technicians.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ← Back to Step 1
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || !roomOrLabNumber.trim() || !landmark.trim()}
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
                          <span>Submit Complaint Ticket</span>
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
