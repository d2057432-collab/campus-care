import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  GraduationCap,
  Building2,
  Home,
  Hash,
  Layers,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { KITSW_BRANCHES, KITSW_RESIDENCE_OPTIONS } from '../../services/demoDataService';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateUserProfileDetails } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState(KITSW_BRANCHES[0]);
  const [hostel, setHostel] = useState(KITSW_RESIDENCE_OPTIONS[0]);
  const [yearOfStudy, setYearOfStudy] = useState('III Year B.Tech');
  const [section, setSection] = useState('Section A');
  const [roomNumber, setRoomNumber] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (userProfile && isOpen) {
      setDisplayName(userProfile.displayName || '');
      setPhoneNumber(userProfile.phoneNumber || '');
      setRollNumber(userProfile.rollNumber || '');
      setBranch(userProfile.branch || KITSW_BRANCHES[0]);
      // Map legacy hostel values to the 3 standard options if needed
      const currentHostel = userProfile.hostel || KITSW_RESIDENCE_OPTIONS[0];
      if ((KITSW_RESIDENCE_OPTIONS as readonly string[]).includes(currentHostel)) {
        setHostel(currentHostel as any);
      } else if (currentHostel.toLowerCase().includes('day scholar')) {
        setHostel('Day Scholar');
      } else if (currentHostel.toLowerCase().includes('outside')) {
        setHostel('Outside Hostel');
      } else {
        setHostel('College Hostel');
      }
      setYearOfStudy(userProfile.yearOfStudy || 'III Year B.Tech');
      setSection(userProfile.section || 'Section A');
      setRoomNumber(userProfile.roomNumber || '');
      setError('');
      setSuccess(false);
    }
  }, [userProfile, isOpen]);

  if (!isOpen || !userProfile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!displayName.trim()) {
      setError('Full Name cannot be empty.');
      return;
    }

    const cleanedPhone = phoneNumber.replace(/[^0-9+-\s]/g, '').trim();
    if (cleanedPhone && cleanedPhone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfileDetails({
        displayName: displayName.trim(),
        phoneNumber: cleanedPhone,
        rollNumber: rollNumber.trim().toUpperCase(),
        branch,
        hostel,
        yearOfStudy,
        section,
        roomNumber: hostel === 'Day Scholar' ? 'N/A' : roomNumber.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
              {displayName.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                Edit KITSW Profile & Academic Details
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 rounded-md border border-indigo-400/30">
                  {userProfile.role}
                </span>
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-indigo-400" />
                {userProfile.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              Profile updated and synced across CampusCare KITSW!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Full Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Mobile / WhatsApp Number *
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Academic Branch (KITSW Reference) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              KITSW Academic Branch / Department *
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value as any)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {KITSW_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Roll No, Year, Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Roll No / Emp ID
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                placeholder="B21CS045"
                className="w-full px-3 py-2 text-sm uppercase font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Year of Study
              </label>
              <select
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="I Year B.Tech">I Year B.Tech</option>
                <option value="II Year B.Tech">II Year B.Tech</option>
                <option value="III Year B.Tech">III Year B.Tech</option>
                <option value="IV Year B.Tech">IV Year B.Tech</option>
                <option value="M.Tech / PG">M.Tech / MBA (PG)</option>
                <option value="Ph.D / Research">Ph.D / Research</option>
                <option value="Faculty / Staff">Faculty / Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
                <option value="Section D">Section D</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
          </div>

          {/* Residence / Hostel Type */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Accommodation / Residence Status *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {KITSW_RESIDENCE_OPTIONS.map((option) => {
                const isSelected = hostel === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setHostel(option)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    <Building2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {hostel !== 'Day Scholar' && (
              <div className="pt-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {hostel === 'College Hostel'
                    ? 'College Hostel Block & Room Number'
                    : 'Outside Hostel Name & Room / Locality'}
                </label>
                <input
                  type="text"
                  value={roomNumber === 'N/A' ? '' : roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder={
                    hostel === 'College Hostel'
                      ? 'e.g. Boys Hostel-1, Room 204'
                      : 'e.g. Sai Ram Deluxe Hostel, Yerragattugutta'
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Synced with KITSW Firestore Profile</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
