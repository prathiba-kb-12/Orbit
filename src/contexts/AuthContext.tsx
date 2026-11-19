import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  clearOrbitState,
  loadSavedAccounts,
  removeSavedAccount,
  upsertSavedAccount,
} from '../lib/orbitStore';
import {
  deleteEntireUserWorkspace,
  ensureUserWorkspaceDoc,
} from '../lib/orbitFirestore';
import type { SavedAccountPreview, UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  savedAccounts: SavedAccountPreview[];
  signUp: (params: { name: string; email: string; password: string }) => Promise<void>;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateAccountProfile: (params: {
    displayName: string;
    studyBio?: string;
    photoURL?: string;
  }) => Promise<void>;
  changeAccountPassword: (params: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  signOutAccount: () => Promise<void>;
  deleteAccount: (currentPassword: string) => Promise<void>;
  forgetSavedAccount: (uid: string) => void;
  setProfile: (next: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function mapFirebaseAuthError(err: unknown): string {
  const code = (err as any)?.code || '';
  const msg = err instanceof Error ? err.message : String(err || '');

  if (code === 'auth/email-already-in-use') {
    return 'An Orbit account with this email already exists. Try signing in or resetting your password.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/weak-password') {
    return 'Please choose a stronger password (at least 6 characters).';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Incorrect email or password. Double-check your credentials or use Forgot Password.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many recent attempts. Take a brief pause and try again in a few moments.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'For your security, please re-enter your current password to confirm this change.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in needs to be enabled in your Firebase Console (Authentication → Sign-in method → Email/Password).';
  }
  if (code === 'auth/network-request-failed') {
    return 'Could not connect to Firebase Authentication right now. Check your connection and try again.';
  }

  return msg || 'Orbit could not complete that account action right now.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountPreview[]>(() =>
    loadSavedAccounts()
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      const fallbackProfile: UserProfile = {
        uid: nextUser.uid,
        displayName:
          nextUser.displayName || nextUser.email?.split('@')[0] || 'Orbit Student',
        email: nextUser.email || '',
        photoURL: nextUser.photoURL || undefined,
        emailVerified: nextUser.emailVerified,
        createdAt: nextUser.metadata.creationTime || new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      setAuthLoading(false);

      try {
        const synced = await ensureUserWorkspaceDoc(nextUser);
        setProfile(synced);
        setSavedAccounts(
          upsertSavedAccount({
            uid: synced.uid,
            displayName: synced.displayName,
            email: synced.email,
            photoURL: synced.photoURL,
            lastUsedAt: new Date().toISOString(),
          })
        );
      } catch {
        // Fallback profile remains active if offline
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const cleanName = name.trim() || email.split('@')[0] || 'Orbit Student';
      await updateProfile(cred.user, { displayName: cleanName });
      const created = await ensureUserWorkspaceDoc(cred.user, { displayName: cleanName });
      setProfile(created);
      setSavedAccounts(
        upsertSavedAccount({
          uid: created.uid,
          displayName: created.displayName,
          email: created.email,
          photoURL: created.photoURL,
          lastUsedAt: new Date().toISOString(),
        })
      );
      sendEmailVerification(cred.user).catch(() => {
        // Non-blocking verification dispatch
      });
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const synced = await ensureUserWorkspaceDoc(cred.user);
      setProfile(synced);
      setSavedAccounts(
        upsertSavedAccount({
          uid: synced.uid,
          displayName: synced.displayName,
          email: synced.email,
          photoURL: synced.photoURL,
          lastUsedAt: new Date().toISOString(),
        })
      );
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error('Please sign in first.');
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const updateAccountProfile = async ({
    displayName,
    studyBio,
    photoURL,
  }: {
    displayName: string;
    studyBio?: string;
    photoURL?: string;
  }) => {
    if (!auth.currentUser) throw new Error('Please sign in first.');
    try {
      const cleanName = displayName.trim() || 'Orbit Student';
      // Firebase Auth photoURL has a ~2KB limit; store custom avatars in Firestore and short URLs in both
      const authPhoto = photoURL && photoURL.length <= 1800 ? photoURL : undefined;
      await updateProfile(auth.currentUser, {
        displayName: cleanName,
        ...(authPhoto !== undefined ? { photoURL: authPhoto } : {}),
      });
      const updated = await ensureUserWorkspaceDoc(auth.currentUser, {
        displayName: cleanName,
        studyBio: studyBio?.trim() || '',
        photoURL: photoURL ?? '',
      });
      setProfile(updated);
      setSavedAccounts(
        upsertSavedAccount({
          uid: updated.uid,
          displayName: updated.displayName,
          email: updated.email,
          photoURL: updated.photoURL,
          lastUsedAt: new Date().toISOString(),
        })
      );
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const changeAccountPassword = async ({
    currentPassword,
    newPassword,
  }: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error('Please sign in first.');
    }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const signOutAccount = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const deleteAccount = async (currentPassword: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error('Please sign in first.');
    }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      const uid = currentUser.uid;
      await deleteEntireUserWorkspace(uid);
      clearOrbitState(uid);
      setSavedAccounts(removeSavedAccount(uid));
      await deleteUser(currentUser);
      setUser(null);
      setProfile(null);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const forgetSavedAccount = (uid: string) => {
    setSavedAccounts(removeSavedAccount(uid));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authLoading,
        savedAccounts,
        signUp,
        signIn,
        requestPasswordReset,
        resendVerificationEmail,
        updateAccountProfile,
        changeAccountPassword,
        signOutAccount,
        deleteAccount,
        forgetSavedAccount,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}
