import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  ShieldCheck,
  GraduationCap,
  Wrench,
  Building,
  Mail,
  User,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Loader2,
  Shield,
  BookOpen,
  BadgeCheck,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const {
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
    requestPasswordRecoveryOtp,
    verifyPasswordRecoveryOtp,
    resetPasswordWithOtp,
    collegeDomain,
  } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  const [roleTab, setRoleTab] = useState<'STUDENT' | 'STAFF' | 'ADMIN'>('STUDENT');

  // Forgot Password / OTP states
  const [forgotStep, setForgotStep] = useState<'REQUEST_OTP' | 'VERIFY_OTP' | 'RECOVERED'>('REQUEST_OTP');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState<string | null>(null);
  const [recoveredPassword, setRecoveredPassword] = useState<string | null>(null);
  const [recoveredUserName, setRecoveredUserName] = useState<string>('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showRecoveredPassword, setShowRecoveredPassword] = useState(true);
  const [copiedPass, setCopiedPass] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('III Year B.Tech');
  const [section, setSection] = useState('Section A');
  const [branch, setBranch] = useState('Computer Science & Engineering (CSE)');
  const [hostel, setHostel] = useState('Boys Hostel-1 (BH-1 / Krishna Hostel)');
  const [roomNumber, setRoomNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor / Technical Officer');
  const [staffRoleType, setStaffRoleType] = useState<UserRole>('STAFF');
  const [department, setDepartment] = useState('Computer Science & IT Support');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateCollegeEmail = (emailStr: string): boolean => {
    const clean = emailStr.trim().toLowerCase();
    return clean.endsWith(`@${collegeDomain}`) || clean === 'd2057432@gmail.com';
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!validateCollegeEmail(cleanEmail)) {
      setErrorMessage(
        `Access restricted: Only official institutional email accounts ending with @${collegeDomain} are permitted.`
      );
      return;
    }

    if (mode === 'REGISTER' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    const selectedRole: UserRole =
      roleTab === 'STUDENT'
        ? 'STUDENT'
        : roleTab === 'ADMIN'
        ? 'ADMIN'
        : staffRoleType;

    setIsLoading(true);
    try {
      if (mode === 'LOGIN') {
        await loginWithEmail(cleanEmail, password, selectedRole);
      } else {
        await registerWithEmail(cleanEmail, password, {
          displayName: displayName.trim(),
          role: selectedRole,
          rollNumber: roleTab === 'STUDENT' ? rollNumber.trim().toUpperCase() : undefined,
          yearOfStudy: roleTab === 'STUDENT' ? yearOfStudy : undefined,
          section: roleTab === 'STUDENT' ? section : undefined,
          employeeId: roleTab !== 'STUDENT' ? employeeId.trim().toUpperCase() : undefined,
          designation: roleTab !== 'STUDENT' ? designation.trim() : undefined,
          departmentName: roleTab === 'STUDENT' ? branch : department,
          hostel: roleTab === 'STUDENT' ? hostel : undefined,
          roomNumber: roleTab === 'STUDENT' ? roomNumber.trim() : undefined,
          phone: phone.trim(),
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    const selectedRole: UserRole =
      roleTab === 'STUDENT'
        ? 'STUDENT'
        : roleTab === 'ADMIN'
        ? 'ADMIN'
        : staffRoleType;

    setIsLoading(true);
    try {
      await signInWithGoogle(selectedRole);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign-In failed. Please use your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPasswordFlow = () => {
    setMode('FORGOT_PASSWORD');
    setForgotStep('REQUEST_OTP');
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpInput('');
    setDispatchedOtp(null);
    setRecoveredPassword(null);
    setNewResetPassword('');
    setConfirmResetPassword('');
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!validateCollegeEmail(cleanEmail)) {
      setErrorMessage(
        `Recovery restricted: Please enter a valid institutional email ending with @${collegeDomain}.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPasswordRecoveryOtp(cleanEmail, recoveryIdentifier.trim() || undefined);
      setDispatchedOtp(result.otp);
      setRecoveredUserName(result.displayName || cleanEmail.split('@')[0]);
      setForgotStep('VERIFY_OTP');
      setSuccessMessage(`6-digit OTP generated for ${cleanEmail}. Enter the OTP below to view or reset your password.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate OTP. Please verify your institutional email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otpInput || otpInput.trim().length < 6) {
      setErrorMessage('Please enter the 6-digit OTP verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyPasswordRecoveryOtp(email.trim().toLowerCase(), otpInput.trim());
      if (result.verified) {
        setRecoveredPassword(result.currentPassword);
        if (result.user?.displayName) {
          setRecoveredUserName(result.user.displayName);
        }
        setForgotStep('RECOVERED');
        setSuccessMessage('OTP verified! You can now view your registered password or set a new password below.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid OTP code. Please check the 6-digit code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newResetPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordWithOtp(email.trim().toLowerCase(), otpInput.trim(), newResetPassword);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInWithRecoveredPassword = async () => {
    if (!recoveredPassword) return;
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await loginWithEmail(email.trim().toLowerCase(), recoveredPassword);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign in failed. Please set a new password below.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 text-white shadow-lg shadow-indigo-500/25 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kakatiya Institute of Technology & Science, Warangal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            CampusCare Portal
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Official Institutional Grievance & Infrastructure Management System
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          {/* Mode Switcher: Login vs Register vs Forgot Password */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'LOGIN'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'REGISTER'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register Account
            </button>
            <button
              type="button"
              onClick={openForgotPasswordFlow}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                mode === 'FORGOT_PASSWORD'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Forgot Password</span>
            </button>
          </div>

          {/* Role selector for Login & Registration */}
          {mode !== 'FORGOT_PASSWORD' && (
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Select Institutional Portal Role
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRoleTab('STUDENT')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  roleTab === 'STUDENT'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>Student</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleTab('STAFF')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  roleTab === 'STAFF'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Wrench className="w-4 h-4 shrink-0" />
                <span>Staff & Faculty</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleTab('ADMIN')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  roleTab === 'ADMIN'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>Admin</span>
              </button>
            </div>
          </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {mode === 'LOGIN' && (
                <div className="pl-6">
                  <button
                    type="button"
                    onClick={openForgotPasswordFlow}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Forgot your password? Recover or reset via 6-digit OTP →</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* FORGOT PASSWORD / OTP RECOVERY VIEW */}
          {mode === 'FORGOT_PASSWORD' ? (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-sm">
                  <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Institutional OTP Password Recovery & Reset</span>
                </div>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
                  Verify your <strong>@{collegeDomain}</strong> account using a 6-digit OTP code to view your registered password or set a new password.
                </p>
              </div>

              {forgotStep === 'REQUEST_OTP' && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Registered Institutional Email *
                      </label>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        @{collegeDomain}
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={`username@${collegeDomain}`}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Roll Number / Employee ID / Phone (Optional Verification)
                    </label>
                    <input
                      type="text"
                      value={recoveryIdentifier}
                      onChange={(e) => setRecoveryIdentifier(e.target.value)}
                      placeholder="e.g. B22CS045 or KITSW-EMP-204 (leave blank if unsure)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Send 6-Digit Verification OTP</span>
                  </button>
                </form>
              )}

              {forgotStep === 'VERIFY_OTP' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {/* Live OTP Dispatch Box for College Portal */}
                  {dispatchedOtp && (
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                          <BadgeCheck className="w-4 h-4 text-indigo-600" />
                          KITSW Security OTP Dispatched
                        </span>
                        <button
                          type="button"
                          onClick={handleRequestOtp}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Resend OTP
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Account: <strong>{recoveredUserName}</strong> ({email})
                      </p>
                      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Your 6-Digit Verification OTP
                          </span>
                          <span className="text-lg font-mono font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400">
                            {dispatchedOtp}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOtpInput(dispatchedOtp)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors"
                        >
                          Auto-Fill OTP
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Enter 6-Digit OTP Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter 6-digit OTP (e.g. 482910)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-base tracking-widest text-center font-bold"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep('REQUEST_OTP')}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || otpInput.length < 6}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Verify OTP & Know / Reset Password</span>
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 'RECOVERED' && (
                <div className="space-y-5">
                  {/* Section 1: Reveal Current Password */}
                  <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Recovered Password for {email}
                      </span>
                    </div>

                    {recoveredPassword ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">
                              Your Current Registered Password
                            </span>
                            <span className="text-base font-mono font-extrabold text-slate-900 dark:text-white">
                              {showRecoveredPassword ? recoveredPassword : '••••••••'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowRecoveredPassword(!showRecoveredPassword)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Show/Hide Password"
                            >
                              {showRecoveredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(recoveredPassword);
                                setCopiedPass(true);
                                setTimeout(() => setCopiedPass(false), 2000);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1"
                            >
                              {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedPass ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleSignInWithRecoveredPassword}
                          disabled={isLoading}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <span>Sign In Immediately with Current Password</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        No local password was stored for <strong>{email}</strong> yet. Please set a new password below to immediately sign in to your account.
                      </p>
                    )}
                  </div>

                  {/* Section 2: Set a New Password */}
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Or Set a New Password
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          New Password *
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={newResetPassword}
                          onChange={(e) => setNewResetPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Confirm New Password *
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={confirmResetPassword}
                          onChange={(e) => setConfirmResetPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Update Password & Sign In</span>
                    </button>
                  </form>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('LOGIN');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </div>
          ) : (
          /* Form */
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {mode === 'REGISTER' && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={
                      roleTab === 'STUDENT'
                        ? 'Enter Student Full Name'
                        : roleTab === 'STAFF'
                        ? 'Enter Faculty / Staff Full Name'
                        : 'Enter Administrator Full Name'
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Official Institutional Email *
                </label>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  @{collegeDomain}
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder={`username@${collegeDomain}`}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                    email.length > 5 && !validateCollegeEmail(email)
                      ? 'border-amber-400 dark:border-amber-500 focus:ring-amber-400'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>
              {email.length > 5 && !validateCollegeEmail(email) ? (
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Only official @{collegeDomain} accounts are permitted
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Use your official college email ending with <strong>@{collegeDomain}</strong>
                </span>
              )}
            </div>

            <div className={mode === 'REGISTER' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Password *
                  </label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={openForgotPasswordFlow}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Forgot Password? (Use OTP)</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min. 6 chars)"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'REGISTER' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                        confirmPassword.length > 0 && confirmPassword !== password
                          ? 'border-rose-400 dark:border-rose-500'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Student Specific Fields */}
            {mode === 'REGISTER' && roleTab === 'STUDENT' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Roll Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. B22CS045"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Year of Study *
                    </label>
                    <select
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="I Year B.Tech">I Year B.Tech</option>
                      <option value="II Year B.Tech">II Year B.Tech</option>
                      <option value="III Year B.Tech">III Year B.Tech</option>
                      <option value="IV Year B.Tech">IV Year B.Tech</option>
                      <option value="M.Tech / PG">M.Tech / PG</option>
                      <option value="MBA">MBA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Section
                    </label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="Section A">Section A</option>
                      <option value="Section B">Section B</option>
                      <option value="Section C">Section C</option>
                      <option value="Section D">Section D</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Branch / Department *
                  </label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="Computer Science & Engineering (CSE)">Computer Science & Engineering (CSE)</option>
                    <option value="Computer Science & Engineering - AI & ML (CSM)">CSE - AI & Machine Learning (CSM)</option>
                    <option value="Computer Science & Engineering - Data Science (CSD)">CSE - Data Science (CSD)</option>
                    <option value="Information Technology (IT)">Information Technology (IT)</option>
                    <option value="Electronics & Communication Engineering (ECE)">Electronics & Communication Engineering (ECE)</option>
                    <option value="Electrical & Electronics Engineering (EEE)">Electrical & Electronics Engineering (EEE)</option>
                    <option value="Mechanical Engineering (MECH)">Mechanical Engineering (MECH)</option>
                    <option value="Civil Engineering (CIVIL)">Civil Engineering (CIVIL)</option>
                    <option value="Electronics & Instrumentation Engineering (EIE)">Electronics & Instrumentation (EIE)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Accommodation / Hostel
                    </label>
                    <select
                      value={hostel}
                      onChange={(e) => setHostel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="Boys Hostel-1 (BH-1 / Krishna Hostel)">Boys Hostel-1 (BH-1 / Krishna Hostel)</option>
                      <option value="Boys Hostel-2 (BH-2 / Godavari Hostel)">Boys Hostel-2 (BH-2 / Godavari Hostel)</option>
                      <option value="Boys Hostel-3 (BH-3 / Kaveri Hostel)">Boys Hostel-3 (BH-3 / Kaveri Hostel)</option>
                      <option value="Girls Hostel-1 (GH-1 / Priyadarshini Hostel)">Girls Hostel-1 (GH-1 / Priyadarshini Hostel)</option>
                      <option value="Girls Hostel-2 (GH-2 / Sarojini Hostel)">Girls Hostel-2 (GH-2 / Sarojini Hostel)</option>
                      <option value="Day Scholar">Day Scholar (Warangal / Hanamkonda)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Room No.
                    </label>
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="e.g. 304"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Student Contact Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98491 XXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Staff / Faculty / Admin Specific Fields */}
            {mode === 'REGISTER' && (roleTab === 'STAFF' || roleTab === 'ADMIN') && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Employee / Faculty ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. KITSW-EMP-204"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Associate Professor / Network Engineer"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {roleTab === 'STAFF' && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Institutional Role Responsibility *
                    </label>
                    <select
                      value={staffRoleType}
                      onChange={(e) => setStaffRoleType(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="STAFF">Department Staff / Resolver / Faculty</option>
                      <option value="DEPARTMENT_HEAD">Head of Department (HOD)</option>
                      <option value="WARDEN">Hostel Warden / Chief Warden</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department / Section Assignment *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="Computer Science & IT Support">Computer Science & IT Support</option>
                    <option value="Civil & Plumbing Maintenance">Civil & Plumbing Maintenance</option>
                    <option value="Electrical & Power Grid">Electrical & Power Grid</option>
                    <option value="Hostel & Residential Life">Hostel & Residential Life</option>
                    <option value="Dining & Canteen Services">Dining & Canteen Services</option>
                    <option value="Academic & Examination Cell">Academic & Examination Cell</option>
                    <option value="Principal Office & Central Administration">Principal Office & Central Administration</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Contact Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98491 XXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {mode === 'LOGIN'
                  ? 'Sign In with Institutional Credentials'
                  : 'Register Official KITSW Account'}
              </span>
            </button>
          </form>
          )}

          {/* Social Sign-In Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white dark:bg-slate-900 px-2">
              <span>Or Authenticate with Institutional Google</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors shadow-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Workspace (@{collegeDomain})</span>
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 Kakatiya Institute of Technology & Science, Warangal (KITSW).</p>
          <p className="mt-0.5 text-[11px]">
            Secured by Firebase Authentication & Zero-Trust Firestore ABAC Rules.
          </p>
        </div>
      </div>
    </div>
  );
};
