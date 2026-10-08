import React, { useState, useEffect } from 'react';
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
  Building,
  User,
  MessageSquare,
  Sparkles,
  Star,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Lock,
  Layers,
  FileCheck,
  Shield,
  Loader2,
} from 'lucide-react';

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onComplaintUpdated?: (updated: Complaint) => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onComplaintUpdated,
}) => {
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'timeline' | 'chat'>('timeline');
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Staff update state
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(
    complaint?.status || 'SUBMITTED'
  );
  const [statusComment, setStatusComment] = useState('');
  const [resolutionNote, setResolutionNote] = useState(complaint?.resolutionNote || '');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingAIResponse, setIsGeneratingAIResponse] = useState(false);

  // Feedback state
  const [rating, setRating] = useState(complaint?.feedback?.rating || 5);
  const [feedbackComment, setFeedbackComment] = useState(complaint?.feedback?.comment || '');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(!!complaint?.feedback);

  useEffect(() => {
    if (!complaint?.id || !userProfile?.role) return;
    setSelectedStatus(complaint.status);
    setResolutionNote(complaint.resolutionNote || '');
    setFeedbackSubmitted(!!complaint.feedback);

    if (!currentUser) return;

    const unsub = subscribeToMessages(
      complaint.id,
      (list) => {
        setMessages(list);
      },
      userProfile.role
    );

    return () => unsub();
  }, [currentUser, complaint?.id, userProfile?.role]);

  if (!isOpen || !complaint) return null;

  const isStaffOrAdmin =
    userProfile?.role === 'STAFF' ||
    userProfile?.role === 'DEPARTMENT_HEAD' ||
    userProfile?.role === 'WARDEN' ||
    userProfile?.role === 'ADMIN' ||
    userProfile?.role === 'SUPER_ADMIN';

  const isOwner = userProfile?.uid === complaint.studentId;

  // Handle message send
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile) return;
    setIsSendingMessage(true);

    try {
      await addComplaintMessage(complaint.id, {
        senderId: userProfile.uid,
        senderName: userProfile.displayName,
        senderRole: userProfile.role,
        message: newMessage.trim(),
        isInternal: isInternalNote && isStaffOrAdmin,
      });
      setNewMessage('');
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
        });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Could not update status. Please try again.');
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

  // Student feedback submission
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      await submitComplaintFeedback(complaint.id, rating, feedbackComment);
      setFeedbackSubmitted(true);
      if (onComplaintUpdated) {
        onComplaintUpdated({
          ...complaint,
          feedback: { rating, comment: feedbackComment, submittedAt: new Date().toISOString() },
        });
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Student reopen ticket
  const handleReopenTicket = async () => {
    if (!userProfile) return;
    const reason = prompt('Please enter the reason for reopening this complaint:');
    if (!reason) return;

    try {
      await updateComplaintStatus(
        complaint,
        'REOPENED',
        {
          uid: userProfile.uid,
          displayName: userProfile.displayName,
          role: userProfile.role,
        },
        { comment: `Ticket reopened by student: ${reason}` }
      );
    } catch (err) {
      console.error('Reopen error:', err);
    }
  };

  const isResolvedOrClosed = complaint.status === 'RESOLVED' || complaint.status === 'CLOSED';

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
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> SLA Overdue
                </span>
              )}

              {complaint.isMasterComplaint && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                  <Layers className="w-3 h-3" /> Master Ticket ({complaint.linkedComplaintCount || 1} linked)
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
            Details & Visual Timeline
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
            <span>Messages & Notes</span>
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
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {complaint.departmentName || 'General Administration'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {complaint.location}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Room / Block</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {complaint.block || ''} {complaint.roomNumber ? `• Rm ${complaint.roomNumber}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">SLA Target</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {complaint.slaHours} hrs
                  </span>
                </div>
              </div>

              {/* Description Body */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Description
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
                  {complaint.description}
                </p>
              </div>

              {/* AI Triage Synthesis */}
              {complaint.aiAnalysis && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50/50 dark:from-violet-950/30 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-900/60 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-violet-800 dark:text-violet-300">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span>Gemini AI Triage Assessment</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {complaint.aiAnalysis.reasoning}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {complaint.aiAnalysis.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Note & Proof (if resolved) */}
              {complaint.status === 'RESOLVED' && complaint.resolutionNote && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Staff Resolution Summary</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {complaint.resolutionNote}
                  </p>
                </div>
              )}

              {/* Visual Timeline Component */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Live Resolution Timeline
                </h4>
                <VisualTimeline events={complaint.timeline || []} />
              </div>

              {/* Student Feedback Widget (when resolved) */}
              {isResolvedOrClosed && isOwner && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Student Resolution Feedback</span>
                  </h4>

                  {feedbackSubmitted ? (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1 font-bold">
                          <span>Rating: {rating} / 5 Stars</span>
                        </div>
                        {feedbackComment && <p className="mt-1 italic">"{feedbackComment}"</p>}
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700">Submitted</span>
                    </div>
                  ) : (
                    <form onSubmit={handleFeedbackSubmit} className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-500 block mb-1">
                          Was your issue resolved satisfactorily?
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= rating
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <input
                        type="text"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Add optional comment for the department..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      />

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleReopenTicket}
                          className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Not fixed? Reopen complaint</span>
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmittingFeedback}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
                        >
                          Submit Rating
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Staff Status Action Panel */}
              {isStaffOrAdmin && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Staff Lifecycle Management</span>
                    </h4>

                    {/* AI Suggest Response Button */}
                    <button
                      type="button"
                      onClick={handleGenerateAIResponse}
                      disabled={isGeneratingAIResponse}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-100 hover:bg-violet-200 text-violet-800 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-violet-500" />
                      <span>{isGeneratingAIResponse ? 'Generating...' : 'Gemini Auto-Draft'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Change Status</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as ComplaintStatus)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="SUBMITTED">SUBMITTED</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="IN_REVIEW">IN REVIEW</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="ESCALATED">ESCALATED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Status Note / Update</label>
                      <input
                        type="text"
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="e.g. Technician dispatched to site"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {selectedStatus === 'RESOLVED' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Resolution Explanation (Visible to Student) *
                      </label>
                      <textarea
                        rows={2}
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="Detail the exact repair or fix performed..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white resize-none"
                      />
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
                      <span>Update Status</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Chat & Messages Tab */
            <div className="space-y-4">
              {/* Message List */}
              <div className="space-y-3 min-h-[240px] max-h-[380px] overflow-y-auto p-2">
                {messages.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No messages yet. Use this section to clarify details with student or post internal notes.
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
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xs space-y-1 ${
                            isInternal
                              ? 'bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                              : isMyMessage
                              ? 'bg-indigo-600 text-white rounded-br-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px] opacity-75">
                            <span className="font-bold flex items-center gap-1">
                              {isInternal && <Lock className="w-2.5 h-2.5" />}
                              {m.senderName} ({m.senderRole})
                            </span>
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="leading-relaxed">{m.message}</p>
                        </div>
                        {isInternal && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-1 mt-0.5">
                            Internal Staff Note (Protected from student view)
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                      Post as Internal Staff Note (Never visible to students)
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      isInternalNote
                        ? 'Type private note for department staff...'
                        : 'Write message to student / department...'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !newMessage.trim()}
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
