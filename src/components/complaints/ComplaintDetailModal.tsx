import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Complaint,
  ComplaintStatus,
  ComplaintMessage,
} from '../../types';
import {
  updateComplaintStatus,
  submitComplaintFeedback,
  addComplaintMessage,
  subscribeToMessages,
} from '../../services/complaintService';
import { getSuggestedStaffResponse } from '../../services/aiService';
import { StatusBadge, PriorityBadge } from '../common/StatusBadge';
import { VisualTimeline } from '../common/VisualTimeline';
import {
  X,
  Clock,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Lock,
  Layers,
  Shield,
  Loader2,
  Camera,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onComplaintUpdated?: (updated: Complaint) => void;
}

async function compressProofImage(file: File, maxWidth = 760, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onComplaintUpdated,
}) => {
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'timeline' | 'chat'>('timeline');
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatPhotoUrl, setChatPhotoUrl] = useState<string | null>(null);
  const [chatPhotoName, setChatPhotoName] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatPhotoInputRef = useRef<HTMLInputElement>(null);

  // Staff update state
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(
    complaint?.status || 'SUBMITTED'
  );
  const [statusComment, setStatusComment] = useState('');
  const [resolutionNote, setResolutionNote] = useState(complaint?.resolutionNote || '');
  const [resolutionProofImage, setResolutionProofImage] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingAIResponse, setIsGeneratingAIResponse] = useState(false);
  const resolutionPhotoInputRef = useRef<HTMLInputElement>(null);

  // Student Reopen inline state
  const [showReopenInput, setShowReopenInput] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Feedback & Resolution Rating System state
  const [rating, setRating] = useState(complaint?.feedback?.rating || 5);
  const [feedbackComment, setFeedbackComment] = useState(complaint?.feedback?.comment || '');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(!!complaint?.feedback);
  const [autoEscalatedAlert, setAutoEscalatedAlert] = useState(false);

  useEffect(() => {
    if (!complaint?.id || !userProfile?.role) return;
    setSelectedStatus(complaint.status);
    setResolutionNote(complaint.resolutionNote || '');
    setFeedbackSubmitted(!!complaint.feedback);
    setRating(complaint.feedback?.rating || 5);
    setFeedbackComment(complaint.feedback?.comment || '');
    setAutoEscalatedAlert(Boolean(complaint.feedback?.escalatedByFeedback));

    const unsub = subscribeToMessages(
      complaint.id,
      (list) => {
        setMessages(list);
      },
      userProfile.role
    );

    return () => unsub();
  }, [complaint?.id, complaint?.status, userProfile?.role]);

  if (!isOpen || !complaint) return null;

  const isStaffOrAdmin =
    userProfile?.role === 'STAFF' ||
    userProfile?.role === 'DEPARTMENT_HEAD' ||
    userProfile?.role === 'WARDEN' ||
    userProfile?.role === 'ADMIN' ||
    userProfile?.role === 'SUPER_ADMIN';

  const isOwner =
    userProfile?.uid === complaint.studentId ||
    (userProfile?.email &&
      complaint.studentEmail &&
      userProfile.email.toLowerCase() === complaint.studentEmail.toLowerCase());

  // Handle attaching photo in chat thread
  const handleChatPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressProofImage(file);
      setChatPhotoUrl(dataUrl);
      setChatPhotoName(file.name);
    } catch {
      // Ignore
    }
  };

  // Handle attaching resolution verification photo
  const handleResolutionPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressProofImage(file);
      setResolutionProofImage(dataUrl);
    } catch {
      // Ignore
    }
  };

  // Handle message send
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !chatPhotoUrl) || !userProfile) return;
    setIsSendingMessage(true);

    try {
      await addComplaintMessage(complaint.id, {
        senderId: userProfile.uid,
        senderName: userProfile.displayName,
        senderRole: userProfile.role,
        message: newMessage.trim() || 'Attached photo verification proof.',
        isInternal: isInternalNote && isStaffOrAdmin,
        attachments: chatPhotoUrl
          ? [
              {
                id: `msg-att-${Date.now()}`,
                name: chatPhotoName || 'verification_photo.jpg',
                url: chatPhotoUrl,
                type: 'image/jpeg',
              },
            ]
          : undefined,
      });
      setNewMessage('');
      setChatPhotoUrl(null);
      setChatPhotoName('');
    } catch (err) {
      console.error('Failed to post message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle staff status update
  const handleStatusUpdate = async () => {
    if (!userProfile) return;
    setIsUpdatingStatus(true);

    try {
      const proofList = resolutionProofImage
        ? [resolutionProofImage, ...(complaint.resolutionProofUrls || [])]
        : complaint.resolutionProofUrls;

      await updateComplaintStatus(
        complaint,
        selectedStatus,
        {
          uid: userProfile.uid,
          displayName: userProfile.displayName,
          role: userProfile.role,
        },
        {
          comment: statusComment,
          resolutionNote: selectedStatus === 'RESOLVED' ? resolutionNote : undefined,
          resolutionProofUrls: selectedStatus === 'RESOLVED' ? proofList : undefined,
          proofImageUrl: resolutionProofImage || undefined,
          assignedStaffId: userProfile.uid,
          assignedStaffName: userProfile.displayName,
        }
      );

      setStatusComment('');
      if (onComplaintUpdated) {
        onComplaintUpdated({
          ...complaint,
          status: selectedStatus,
          resolutionNote: selectedStatus === 'RESOLVED' ? resolutionNote : complaint.resolutionNote,
          resolutionProofUrls: selectedStatus === 'RESOLVED' ? proofList : complaint.resolutionProofUrls,
        });
      }
      setResolutionProofImage(null);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Generate suggested response using Gemini
  const handleGenerateAIResponse = async () => {
    setIsGeneratingAIResponse(true);
    try {
      const suggestion = await getSuggestedStaffResponse(
        complaint.title,
        complaint.description,
        complaint.category,
        selectedStatus
      );
      if (selectedStatus === 'RESOLVED') {
        setResolutionNote(suggestion);
      } else {
        setStatusComment(suggestion);
      }
    } catch (err) {
      console.warn('AI suggestion error:', err);
    } finally {
      setIsGeneratingAIResponse(false);
    }
  };

  // Student feedback submission (Auto-Reopens & Escalates if rated 1 or 2 stars)
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSubmittingFeedback(true);
    try {
      const result = await submitComplaintFeedback(complaint, rating, feedbackComment, {
        uid: userProfile.uid,
        displayName: userProfile.displayName,
      });
      setFeedbackSubmitted(true);
      setAutoEscalatedAlert(result.escalated);
      if (onComplaintUpdated) {
        onComplaintUpdated(result.updatedComplaint);
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Student manual reopen ticket
  const handleReopenTicket = async () => {
    if (!userProfile || !reopenReason.trim()) return;
    try {
      await updateComplaintStatus(
        complaint,
        'ESCALATED',
        {
          uid: userProfile.uid,
          displayName: userProfile.displayName,
          role: userProfile.role,
        },
        { comment: `Ticket reopened & escalated by student: ${reopenReason.trim()}` }
      );
      if (onComplaintUpdated) {
        onComplaintUpdated({
          ...complaint,
          status: 'ESCALATED',
          isOverdue: true,
        });
      }
      setShowReopenInput(false);
      setReopenReason('');
    } catch (err) {
      console.error('Reopen error:', err);
    }
  };

  const isResolvedOrClosed =
    complaint.status === 'RESOLVED' ||
    complaint.status === 'CLOSED' ||
    Boolean(complaint.feedback);

  const issuePhoto =
    complaint.proofImageUrl || complaint.attachments?.[0]?.url || null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {complaint.complaintId}
              </span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />

              {complaint.isOverdue && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> SLA Overdue / Escalated
                </span>
              )}

              {complaint.isMasterComplaint && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                  <Layers className="w-3.5 h-3.5" /> Master Ticket ({complaint.linkedComplaintCount || 1} linked)
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {complaint.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Status Stepper & Details
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Student-Technician Live Chat & Photo Proof</span>
            {messages.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center justify-center font-bold">
                {messages.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'timeline' ? (
            <div className="space-y-6">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">Assigned Department</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {complaint.departmentName || 'General Administration'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">Campus Block / Hostel</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {complaint.location}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">Room / Lab & Landmark</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {complaint.block || ''} {complaint.roomNumber ? `· ${complaint.roomNumber}` : ''}{' '}
                    {complaint.landmark ? `(${complaint.landmark})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">Est. Resolution / SLA</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 tabular-nums">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {complaint.estimatedResolutionTime || `${complaint.slaHours} hrs`}
                  </span>
                </div>
              </div>

              {/* Description & Uploaded Issue Photo Proof */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={issuePhoto ? 'md:col-span-2 space-y-1.5' : 'md:col-span-3 space-y-1.5'}>
                  <h4 className="text-xs font-bold text-slate-500">Issue Description</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
                    {complaint.description}
                  </p>
                </div>

                {issuePhoto && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Uploaded Issue Proof</span>
                    </h4>
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={issuePhoto}
                        alt="Uploaded complaint issue proof"
                        referrerPolicy="no-referrer"
                        className="w-full h-36 object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* AI Triage Synthesis */}
              {complaint.aiAnalysis && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50/50 dark:from-violet-950/30 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-violet-800 dark:text-violet-300">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                      <span>Gemini AI Triage Assessment</span>
                    </div>
                    {complaint.estimatedResolutionTime && (
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Est. Fix: {complaint.estimatedResolutionTime}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {complaint.aiAnalysis.reasoning}
                  </p>
                </div>
              )}

              {/* Resolution Summary & Technician Photo Proof */}
              {(complaint.resolutionNote || (complaint.resolutionProofUrls && complaint.resolutionProofUrls.length > 0)) && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Technician Resolution Summary & Photo Verification</span>
                  </div>
                  {complaint.resolutionNote && (
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {complaint.resolutionNote}
                    </p>
                  )}
                  {complaint.resolutionProofUrls && complaint.resolutionProofUrls.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {complaint.resolutionProofUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Resolution verification proof ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="h-32 w-44 object-cover rounded-lg border border-emerald-300 dark:border-emerald-700 shadow-xs"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Feature 5: Feedback & Resolution Rating System (1-2 Stars Auto-Reopens & Escalates) */}
              {isResolvedOrClosed && (isOwner || userProfile?.role === 'STUDENT') && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>Student Resolution Rating & Verification</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      1 or 2 stars automatically reopens & escalates to Admin
                    </span>
                  </div>

                  {feedbackSubmitted ? (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        autoEscalatedAlert || rating <= 2
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>Your Rating: {rating} / 5 Stars</span>
                          {(autoEscalatedAlert || rating <= 2) && (
                            <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                              · Ticket Reopened & Flagged as ESCALATED for Admin Review
                            </span>
                          )}
                        </div>
                        {feedbackComment && <p className="italic">"{feedbackComment}"</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFeedbackSubmitted(false)}
                        className="text-[11px] font-semibold underline shrink-0"
                      >
                        Update Rating
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-600 dark:text-slate-300 block mb-1.5 font-medium">
                          Rate the quality of the maintenance fix (1 to 5 stars):
                        </span>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-transform"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= rating
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            </button>
                          ))}
                          <span
                            className={`ml-2 text-xs font-bold ${
                              rating <= 2 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {rating === 1
                              ? '1 Star — Unresolved (Will Reopen & Escalate)'
                              : rating === 2
                              ? '2 Stars — Unsatisfactory (Will Reopen & Escalate)'
                              : rating === 3
                              ? '3 Stars — Acceptable'
                              : rating === 4
                              ? '4 Stars — Good Fix'
                              : '5 Stars — Excellent & Verified'}
                          </span>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder={
                          rating <= 2
                            ? 'Explain why the issue is still unresolved so the HOD/Admin can intervene...'
                            : 'Add optional feedback for the technician & department...'
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setShowReopenInput(!showReopenInput)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Issue still persists? Reopen manually</span>
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmittingFeedback}
                          className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition-colors shadow-xs ${
                            rating <= 2
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                        >
                          {isSubmittingFeedback
                            ? 'Submitting...'
                            : rating <= 2
                            ? 'Submit Low Rating & Escalate Ticket'
                            : 'Submit Rating & Verify Fix'}
                        </button>
                      </div>

                      {showReopenInput && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <input
                            type="text"
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                            placeholder="Reason for reopening complaint..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleReopenTicket}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
                          >
                            Confirm Reopen
                          </button>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* Visual Progress Stepper & Timeline */}
              <VisualTimeline events={complaint.timeline || []} currentStatus={complaint.status} />

              {/* Staff / Technician / Warden Lifecycle Management Panel with Photo Proof Upload */}
              {isStaffOrAdmin && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Technician / Warden Lifecycle & Photo Verification</span>
                    </h4>

                    <button
                      type="button"
                      onClick={handleGenerateAIResponse}
                      disabled={isGeneratingAIResponse}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-100 hover:bg-violet-200 text-violet-800 dark:bg-violet-950 dark:text-violet-300 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-violet-500" />
                      <span>{isGeneratingAIResponse ? 'Drafting...' : 'Gemini Auto-Draft'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Update Stage</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as ComplaintStatus)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                      >
                        <option value="SUBMITTED">1. Submitted</option>
                        <option value="IN_REVIEW">2. Under Review</option>
                        <option value="ASSIGNED">3. Assigned to Technician</option>
                        <option value="IN_PROGRESS">4. Work in Progress</option>
                        <option value="RESOLVED">5. Resolved / Verified</option>
                        <option value="ESCALATED">Escalated (SLA / HOD Review)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Timestamped Remark</label>
                      <input
                        type="text"
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="e.g. Replaced faulty switchboard & tested load"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {selectedStatus === 'RESOLVED' && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Resolution Summary (Visible to Student) *
                        </label>
                        <textarea
                          rows={2}
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          placeholder="Detail the exact repair or replacement completed..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white resize-none"
                        />
                      </div>

                      {/* Completion Photo Verification Upload */}
                      <div>
                        <input
                          ref={resolutionPhotoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleResolutionPhotoChange}
                          className="hidden"
                        />
                        {resolutionProofImage ? (
                          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800">
                            <img
                              src={resolutionProofImage}
                              alt="Resolution proof"
                              referrerPolicy="no-referrer"
                              className="w-16 h-14 object-cover rounded-lg"
                            />
                            <div className="flex-1 text-xs">
                              <span className="font-bold text-emerald-700 dark:text-emerald-300 block">
                                Completion Verification Photo Attached
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Will be embedded in timeline & resolution card
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setResolutionProofImage(null)}
                              className="text-rose-500 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => resolutionPhotoInputRef.current?.click()}
                            className="px-3.5 py-2 rounded-xl border border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100/60 transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Attach Completion Photo Verification</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={handleStatusUpdate}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isUpdatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Status Update</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Student-Technician Live Chat & Photo Verification Thread */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Direct Student ↔ Assigned Technician / Warden Live Thread
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Assigned: {complaint.assignedStaffName || complaint.departmentName || 'Department Technician'}
                </span>
              </div>

              {/* Message List */}
              <div className="space-y-3 min-h-[260px] max-h-[380px] overflow-y-auto p-2">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 space-y-1">
                    <MessageSquare className="w-7 h-7 text-slate-300 dark:text-slate-700 mx-auto mb-1" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">
                      No messages in this thread yet
                    </p>
                    <p>
                      Send a message or attach a verification photo to communicate directly with the student or technician.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMyMessage = m.senderId === userProfile?.uid;
                    const isInternal = m.isInternal;

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xs space-y-2 ${
                            isInternal
                              ? 'bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                              : isMyMessage
                              ? 'bg-indigo-600 text-white rounded-br-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-80">
                            <span className="font-bold flex items-center gap-1">
                              {isInternal && <Lock className="w-2.5 h-2.5" />}
                              {m.senderName} · {m.senderRole.replace('_', ' ')}
                            </span>
                            <span className="tabular-nums">
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="leading-relaxed">{m.message}</p>

                          {m.attachments && m.attachments.length > 0 && (
                            <div className="pt-1 space-y-1">
                              {m.attachments.map((att) => (
                                <div key={att.id} className="rounded-lg overflow-hidden border border-white/20">
                                  <img
                                    src={att.url}
                                    alt={att.name || 'Chat verification photo'}
                                    referrerPolicy="no-referrer"
                                    className="max-h-44 w-auto object-cover rounded-lg"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {isInternal && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-1 mt-0.5">
                            Internal Staff Remark (Hidden from student)
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Box with Photo Verification Upload */}
              <form
                onSubmit={handleSendMessage}
                className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800"
              >
                {chatPhotoUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img
                      src={chatPhotoUrl}
                      alt="Chat attachment preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1 text-xs truncate">
                      <span className="font-bold text-slate-700 dark:text-slate-200 block truncate">
                        {chatPhotoName || 'Attached Verification Photo'}
                      </span>
                      <span className="text-[10px] text-slate-400">Ready to send in chat</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChatPhotoUrl(null);
                        setChatPhotoName('');
                      }}
                      className="text-rose-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {isStaffOrAdmin && (
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      id="internalNoteToggle"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    <label
                      htmlFor="internalNoteToggle"
                      className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3 h-3 text-amber-600" />
                      Post as Internal Staff / Warden Remark (Hidden from student)
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    ref={chatPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChatPhotoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => chatPhotoInputRef.current?.click()}
                    title="Attach verification photo"
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? 'Write internal technician/warden note...'
                        : 'Write message or update to student / technician...'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || (!newMessage.trim() && !chatPhotoUrl)}
                    className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
