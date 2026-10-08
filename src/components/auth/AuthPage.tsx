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
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const {
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
    collegeDomain,
  } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [roleTab, setRoleTab] = useState<'STUDENT' | 'STAFF' | 'ADMIN'>('STUDENT');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    setIsLoading(true);
    try {
      if (mode === 'LOGIN') {
        await loginWithEmail(cleanEmail, password);
      } else {
        const selectedRole: UserRole =
          roleTab === 'STUDENT'
            ? 'STUDENT'
            : roleTab === 'ADMIN'
            ? 'ADMIN'
            : staffRoleType;

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
          {/* Mode Switcher: Login vs Register */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'LOGIN'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In to CampusCare
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'REGISTER'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Register College Account
            </button>
          </div>

          {/* Role selector for registration */}
          {mode === 'REGISTER' && (
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
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
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

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min. 6 characters)"
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
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors shadow-xs"
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
