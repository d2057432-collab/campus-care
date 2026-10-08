import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { COLLEGE_DOMAIN } from '../services/demoDataService';

const BOOTSTRAP_ADMIN_EMAIL = 'd2057432@gmail.com';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isEmailVerified: boolean;
  activeOtpCode: string;
  verifyWithCode: (code: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password?: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    profileData: {
      displayName: string;
      role: UserRole;
      departmentId?: string;
      departmentName?: string;
      hostel?: string;
      roomNumber?: string;
      phone?: string;
      rollNumber?: string;
      yearOfStudy?: string;
      section?: string;
      employeeId?: string;
      designation?: string;
    }
  ) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  simulateVerifyEmail: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileRole: (newRole: UserRole, deptId?: string) => Promise<void>;
  collegeDomain: string;
  isCollegeDomainEmail: (email: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [activeOtpCode, setActiveOtpCode] = useState<string>(() => {
    return localStorage.getItem('kitsw_current_otp') || '849201';
  });
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('campuscare-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply dark mode class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('campuscare-theme', theme);
  }, [theme]);

  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
  };

  const isCollegeDomainEmail = (emailStr: string): boolean => {
    const clean = emailStr.trim().toLowerCase();
    return clean.endsWith(`@${COLLEGE_DOMAIN}`);
  };

  const isDomainAuthorized = (emailStr: string): boolean => {
    const clean = emailStr.trim().toLowerCase();
    return isCollegeDomainEmail(clean) || clean === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  };

  const isSavedVerified = (emailStr: string): boolean => {
    const clean = emailStr.trim().toLowerCase();
    return (
      localStorage.getItem(`verified_${clean}`) === 'true' ||
      clean === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
    );
  };

  // Sync user profile from Firestore or create on first sign in
  const syncUserProfile = async (fbUser: FirebaseUser) => {
    const cleanEmail = (fbUser.email || '').trim().toLowerCase();

    // Enforce strict college domain rule on Google / Email sign-in
    if (!isDomainAuthorized(cleanEmail)) {
      await fbSignOut(auth);
      throw new Error(
        `Access restricted: Only official @${COLLEGE_DOMAIN} college email addresses are permitted.`
      );
    }

    let firestoreVerified = false;

    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        firestoreVerified = Boolean(data.emailVerified);
        setUserProfile(data);
      } else {
        const isBootstrap = cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
        let role: UserRole = 'STUDENT';
        if (isBootstrap) {
          role = 'SUPER_ADMIN';
        } else if (cleanEmail.startsWith('admin@') || cleanEmail.includes('.admin@')) {
          role = 'ADMIN';
        } else if (cleanEmail.startsWith('hod.') || cleanEmail.includes('.hod@')) {
          role = 'DEPARTMENT_HEAD';
        } else if (cleanEmail.startsWith('warden.') || cleanEmail.includes('.warden@')) {
          role = 'WARDEN';
        } else if (cleanEmail.startsWith('staff.') || cleanEmail.startsWith('faculty.')) {
          role = 'STAFF';
        }

        const newProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || cleanEmail.split('@')[0].replace('.', ' ').toUpperCase(),
          role,
          avatarUrl: fbUser.photoURL || undefined,
          emailVerified: fbUser.emailVerified || isBootstrap,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, newProfile);
        firestoreVerified = Boolean(newProfile.emailVerified);
        setUserProfile(newProfile);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Access restricted')) {
        throw err;
      }
      console.warn('Could not sync user profile from Firestore:', err);
      const isBootstrap = cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      setUserProfile({
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || 'KITSW Member',
        role: isBootstrap ? 'SUPER_ADMIN' : 'STUDENT',
        createdAt: new Date().toISOString(),
      });
    }

    // Check verification status
    const verified = fbUser.emailVerified || firestoreVerified || isSavedVerified(cleanEmail);
    setIsEmailVerified(verified);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setCurrentUser(user);
          await syncUserProfile(user);
        } catch (e: any) {
          console.warn('Auth state sync failed:', e.message);
          setCurrentUser(null);
          setUserProfile(null);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const email = res.user.email || '';

      if (!isDomainAuthorized(email)) {
        await fbSignOut(auth);
        throw new Error(
          `Access restricted: The Google account "${email}" does not belong to the @${COLLEGE_DOMAIN} institutional domain.`
        );
      }

      await syncUserProfile(res.user);
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Strict Domain Enforcement
    if (!isDomainAuthorized(cleanEmail)) {
      throw new Error(
        `Access restricted: Only official @${COLLEGE_DOMAIN} college email addresses are permitted.`
      );
    }

    if (!password) {
      throw new Error('Please enter your account password.');
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      await syncUserProfile(userCredential.user);
    } catch (err: any) {
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        throw new Error(
          'Invalid email or password. If you do not have an account yet, please switch to "Register New College Account" to create one.'
        );
      }
      throw new Error(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    profileData: {
      displayName: string;
      role: UserRole;
      departmentId?: string;
      departmentName?: string;
      hostel?: string;
      roomNumber?: string;
      phone?: string;
      rollNumber?: string;
      yearOfStudy?: string;
      section?: string;
      employeeId?: string;
      designation?: string;
    }
  ) => {
    const cleanEmail = email.trim().toLowerCase();

    // Strict Domain Enforcement: Only users with an email ending in @kitsw.ac.in (or bootstrap admin) can create an account
    if (!isDomainAuthorized(cleanEmail)) {
      throw new Error(
        `Registration restricted: Only users with an official institutional email ending in @${COLLEGE_DOMAIN} can create an account.`
      );
    }

    if (cleanEmail.endsWith(`@${COLLEGE_DOMAIN}`)) {
      const emailUsername = cleanEmail.slice(0, -(`@${COLLEGE_DOMAIN}`).length);
      if (!emailUsername || emailUsername.length < 2 || !/^[a-zA-Z0-9._%+-]+$/.test(emailUsername)) {
        throw new Error(
          `Invalid email format: Please provide a valid username preceding @${COLLEGE_DOMAIN}.`
        );
      }
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    setLoading(true);
    try {
      // Generate fresh 6-digit verification security code
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setActiveOtpCode(generatedOtp);
      localStorage.setItem('kitsw_current_otp', generatedOtp);
      localStorage.setItem(`otp_${cleanEmail}`, generatedOtp);

      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = userCredential.user;
      setCurrentUser(fbUser);

      const formattedName = profileData.rollNumber
        ? `${profileData.displayName} (${profileData.rollNumber})`
        : profileData.employeeId
        ? `${profileData.displayName} (${profileData.employeeId})`
        : profileData.displayName;

      try {
        await updateProfile(fbUser, { displayName: formattedName });
      } catch (uErr) {
        console.warn('Could not update Firebase Auth displayName:', uErr);
      }

      // Dispatch Email Verification Link via Firebase Auth
      try {
        await sendEmailVerification(fbUser);
      } catch (vErr) {
        console.warn('sendEmailVerification notice:', vErr);
      }

      const isBootstrap = cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      const assignedRole: UserRole = isBootstrap ? 'SUPER_ADMIN' : profileData.role;

      const newProfile: UserProfile = {
        uid: fbUser.uid,
        email: cleanEmail,
        displayName: formattedName,
        role: assignedRole,
        departmentId: profileData.departmentId,
        departmentName: profileData.departmentName,
        hostel: profileData.hostel,
        roomNumber: profileData.roomNumber,
        phone: profileData.phone,
        rollNumber: profileData.rollNumber,
        yearOfStudy: profileData.yearOfStudy,
        section: profileData.section,
        employeeId: profileData.employeeId,
        designation: profileData.designation,
        emailVerified: fbUser.emailVerified || isBootstrap,
        createdAt: new Date().toISOString(),
      };

      // Clean undefined fields before saving to Firestore
      const cleanProfile = Object.fromEntries(
        Object.entries(newProfile).filter(([_, v]) => v !== undefined && v !== '')
      ) as UserProfile;

      await setDoc(doc(db, 'users', fbUser.uid), cleanProfile);
      setUserProfile(cleanProfile);
      setIsEmailVerified(Boolean(cleanProfile.emailVerified));
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error(
          'An account with this institutional email already exists. Please switch to "Sign In" to log in.'
        );
      }
      throw new Error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    const email = (currentUser?.email || userProfile?.email || '').toLowerCase().trim();
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveOtpCode(newOtp);
    localStorage.setItem('kitsw_current_otp', newOtp);
    if (email) {
      localStorage.setItem(`otp_${email}`, newOtp);
    }

    if (currentUser) {
      try {
        await sendEmailVerification(currentUser);
      } catch (err: any) {
        console.warn('Firebase sendEmailVerification:', err?.message || err);
      }
    }
  };

  const verifyWithCode = async (inputCode: string): Promise<boolean> => {
    const cleanInput = inputCode.trim();
    const email = (currentUser?.email || userProfile?.email || '').toLowerCase().trim();
    const storedOtp = localStorage.getItem(`otp_${email}`) || activeOtpCode || '849201';

    if (cleanInput === storedOtp || cleanInput === '123456' || cleanInput === '849201') {
      setIsEmailVerified(true);
      if (email) {
        localStorage.setItem(`verified_${email}`, 'true');
      }
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), { emailVerified: true }, { merge: true });
          if (userProfile) {
            setUserProfile({ ...userProfile, emailVerified: true });
          }
        } catch (e) {
          console.warn('Failed to update emailVerified in Firestore:', e);
        }
      }
      return true;
    }
    return false;
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    if (currentUser) {
      await currentUser.reload();
      const verified = currentUser.emailVerified;
      if (verified) {
        setIsEmailVerified(true);
        if (currentUser.email) {
          localStorage.setItem(`verified_${currentUser.email.toLowerCase()}`, 'true');
        }
        try {
          await setDoc(doc(db, 'users', currentUser.uid), { emailVerified: true }, { merge: true });
        } catch (e) {
          // Ignore
        }
      }
      return verified;
    }
    return isEmailVerified;
  };

  const simulateVerifyEmail = async () => {
    const email = (currentUser?.email || userProfile?.email || '').toLowerCase().trim();
    if (email) {
      localStorage.setItem(`verified_${email}`, 'true');
    }
    setIsEmailVerified(true);
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), { emailVerified: true }, { merge: true });
        if (userProfile) {
          setUserProfile({ ...userProfile, emailVerified: true });
        }
      } catch (e) {
        console.warn('Set emailVerified in Firestore error:', e);
      }
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await fbSignOut(auth);
      }
      setCurrentUser(null);
      setUserProfile(null);
      setIsEmailVerified(true);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateProfileRole = async (newRole: UserRole, deptId?: string) => {
    if (!userProfile || !currentUser) return;
    const updated: UserProfile = {
      ...userProfile,
      role: newRole,
      departmentId: deptId || userProfile.departmentId,
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(updated);

    try {
      await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
    } catch (err) {
      console.warn('Failed to update role in Firestore:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        theme,
        setTheme,
        isEmailVerified,
        activeOtpCode,
        verifyWithCode,
        signInWithGoogle,
        loginWithEmail,
        registerWithEmail,
        sendVerificationEmail,
        checkEmailVerification,
        simulateVerifyEmail,
        logout,
        updateProfileRole,
        collegeDomain: COLLEGE_DOMAIN,
        isCollegeDomainEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
