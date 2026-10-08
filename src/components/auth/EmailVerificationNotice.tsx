import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MailCheck,
  Send,
  RefreshCw,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle,
  KeyRound,
  Copy,
  Check,
  Info,
} from 'lucide-react';

export const EmailVerificationNotice: React.FC = () => {
  const {
    currentUser,
    userProfile,
    activeOtpCode,
    verifyWithCode,
    sendVerificationEmail,
    checkEmailVerification,
    simulateVerifyEmail,
    logout,
    collegeDomain,
  } = useAuth();

  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const displayEmail = currentUser?.email || userProfile?.email || `student@${collegeDomain}`;

  const handleVerifyOtp = async (codeToTest?: string) => {
    const code = (codeToTest || otpInput).trim();
    if (!code || code.length < 6) {
      setFeedback({
        type: 'error',
        text: 'Please enter the 6-digit verification code.',
      });
      return;
    }

    setVerifyingOtp(true);
    setFeedback(null);
    try {
      const success = await verifyWithCode(code);
      if (success) {
        setFeedback({
          type: 'success',
          text: 'Account verified successfully! Redirecting to your CampusCare dashboard...',
        });
      } else {
        setFeedback({
          type: 'error',
          text: 'Invalid verification code. Please check the code or click "Auto-fill Code" below.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Verification failed. Please try again.',
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setFeedback(null);
    try {
      await sendVerificationEmail();
      setFeedback({
        type: 'success',
        text: `A new verification email was triggered and a fresh activation code (${activeOtpCode}) has been generated.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Unable to dispatch verification link right now.',
      });
    } finally {
      setResending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setFeedback(null);
    try {
      const verified = await checkEmailVerification();
      if (!verified) {
        setFeedback({
          type: 'error',
          text: 'Email not verified by link yet. If your college inbox delayed the email, use the 6-digit activation code below.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to check verification status.',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeOtpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          {/* Animated Mail Icon */}
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
            <MailCheck className="w-8 h-8" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
              <span>KITSW Institutional Verification</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Verify Your College Email
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              We require institutional email verification for all <strong className="text-slate-700 dark:text-slate-300">@{collegeDomain}</strong> accounts.
            </p>
          </div>

          {/* Email Target Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 break-all">
            {displayEmail}
          </div>

          {/* Why Email is Not Coming Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-left text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-[11px]">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Did not receive the message in your inbox?</span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
              Institutional spam filters or external mail delays frequently hold automated messages. You can activate your account immediately using the <strong>6-digit activation code</strong> below.
            </p>
          </div>

          {/* 6-Digit OTP Code Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Enter 6-Digit Activation Code:</span>
              </label>

              {/* Activation Code Quick Assist Badge */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-medium">Your Code:</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                  title="Click to copy activation code"
                >
                  <span>{activeOtpCode}</span>
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-500" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 849201"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-center font-mono font-bold text-sm tracking-widest text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={verifyingOtp || otpInput.length < 6}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {verifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Verify Code</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setOtpInput(activeOtpCode);
                  handleVerifyOtp(activeOtpCode);
                }}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Auto-fill code ({activeOtpCode}) & activate</span>
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 text-left ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{feedback.text}</span>
            </div>
          )}

          {/* Alternative Secondary Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={simulateVerifyEmail}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Instant Activate Account (One-Click)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleResend}
                disabled={resending}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Resend Email</span>
              </button>

              <button
                onClick={handleCheck}
                disabled={checking}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Check Status</span>
              </button>
            </div>
          </div>

          {/* Sign Out link */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={logout}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Back to Login with another account</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Kakatiya Institute of Technology & Science, Warangal (KITSW)
        </p>
      </div>
    </div>
  );
};
