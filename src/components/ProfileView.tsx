import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  MailCheck,
  Save,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { COSMIC_AVATAR_PRESETS, UserAvatar } from './UserAvatar';

async function compressImageToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process avatar image.'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Invalid image file selected.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Failed to read selected image.'));
    reader.readAsDataURL(file);
  });
}

export function ProfileView() {
  const {
    profile,
    updateAccountProfile,
    changeAccountPassword,
    resendVerificationEmail,
    signOutAccount,
    deleteAccount,
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [studyBio, setStudyBio] = useState(profile?.studyBio || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  // Verification email state
  const [verifySent, setVerifySent] = useState(false);

  // Delete account state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!profile) return null;

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    setProfileError(null);

    if (!displayName.trim()) {
      setProfileError('Display name cannot be empty.');
      return;
    }

    setProfileSaving(true);
    try {
      await updateAccountProfile({
        displayName: displayName.trim(),
        studyBio: studyBio.trim(),
        photoURL,
      });
      setProfileNotice('Profile saved across your Orbit account.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileError(null);
    try {
      const compressed = await compressImageToAvatarDataUrl(file);
      setPhotoURL(compressed);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not process image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwNotice(null);
    setPwError(null);

    if (!currentPassword) {
      setPwError('Enter your current password first.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwSaving(true);
    try {
      await changeAccountPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPwNotice('Your password has been updated securely.');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (deleteTyped.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm permanent account removal.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Please enter your current password to confirm deletion.');
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteAccount(deletePassword);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete account.');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Account · Profile &amp; Security
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-1">
            Your Orbit Profile
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Manage your personal details, avatar, password, and active session.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void signOutAccount()}
          className="min-h-[44px] rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 px-4 text-sm font-extrabold text-slate-100 inline-flex items-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4 text-amber-300" />
          <span>Sign Out / Switch Account</span>
        </button>
      </div>

      {/* Identity Summary Card */}
      <section className="aurora-glass-card rounded-[28px] p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <UserAvatar name={profile.displayName} photoURL={photoURL || profile.photoURL} size="lg" />
          <div className="min-w-0 space-y-1">
            <div className="text-lg font-extrabold text-slate-50 truncate">
              {profile.displayName}
            </div>
            <div className="text-sm text-slate-300 truncate">{profile.email}</div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {profile.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-xl bg-teal-400/15 border border-teal-300/35 px-2.5 py-0.5 text-[11px] font-bold text-teal-200">
                  <UserCheck className="w-3 h-3" />
                  <span>Email Verified</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void resendVerificationEmail().then(() => setVerifySent(true)).catch(() => {});
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-400/15 border border-amber-300/35 px-2.5 py-0.5 text-[11px] font-bold text-amber-100 hover:bg-amber-400/25"
                >
                  <MailCheck className="w-3 h-3" />
                  <span>{verifySent ? 'Verification Email Sent' : 'Verify Email'}</span>
                </button>
              )}
              <span className="text-[11px] font-mono-tabular text-slate-400">
                ID: {profile.uid.slice(0, 10)}…
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Profile & Avatar */}
      <section className="aurora-glass-card rounded-[28px] p-6 space-y-4">
        <h2 className="text-base font-extrabold text-slate-50">Profile Details &amp; Avatar</h2>

        {profileError && (
          <div className="rounded-2xl bg-amber-400/15 border border-amber-300/40 px-4 py-3 text-xs font-semibold text-amber-100">
            {profileError}
          </div>
        )}
        {profileNotice && (
          <div className="rounded-2xl bg-teal-400/15 border border-teal-300/40 px-4 py-3 text-xs font-semibold text-teal-100 inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{profileNotice}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="profile-display-name"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                Display Name
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                className="w-full min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 px-4 text-sm text-slate-100 focus:outline-none focus:border-amber-300/60"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email-readonly"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                Account Email
              </label>
              <input
                id="profile-email-readonly"
                type="email"
                value={profile.email}
                readOnly
                className="w-full min-h-[44px] rounded-2xl bg-white/[0.03] border border-white/10 px-4 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="profile-study-bio"
              className="block text-xs font-bold text-slate-300 mb-1.5"
            >
              Study Focus / Note (Optional)
            </label>
            <input
              id="profile-study-bio"
              type="text"
              value={studyBio}
              onChange={(e) => setStudyBio(e.target.value)}
              placeholder="e.g., CS undergrad focusing on Python & internship prep"
              maxLength={300}
              className="w-full min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-300/60"
            />
          </div>

          {/* Avatar Picker */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-300">Profile Picture</span>
            <div className="flex flex-wrap items-center gap-3">
              {COSMIC_AVATAR_PRESETS.map((preset) => {
                const selected = photoURL === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPhotoURL(preset.id)}
                    title={preset.label}
                    className={`rounded-2xl p-1 border transition-colors ${
                      selected
                        ? 'border-amber-300 bg-amber-400/15'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
                    }`}
                  >
                    <UserAvatar photoURL={preset.id} size="md" />
                  </button>
                );
              })}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[42px] rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/12 px-4 text-xs font-extrabold text-slate-100 inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4 text-teal-300" />
                <span>Upload Photo</span>
              </button>

              {photoURL && (
                <button
                  type="button"
                  onClick={() => setPhotoURL('')}
                  className="min-h-[42px] rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] px-3 text-xs font-bold text-slate-300"
                >
                  Use Initials
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="min-h-[44px] rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-extrabold text-sm px-5 inline-flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{profileSaving ? 'Saving Profile...' : 'Save Profile'}</span>
          </button>
        </form>
      </section>

      {/* Change Password */}
      <section className="aurora-glass-card rounded-[28px] p-6 space-y-4">
        <div className="flex items-center gap-2 text-teal-300 text-sm font-extrabold">
          <KeyRound className="w-4 h-4" />
          <span>Change Password</span>
        </div>

        {pwError && (
          <div className="rounded-2xl bg-amber-400/15 border border-amber-300/40 px-4 py-3 text-xs font-semibold text-amber-100">
            {pwError}
          </div>
        )}
        {pwNotice && (
          <div className="rounded-2xl bg-teal-400/15 border border-teal-300/40 px-4 py-3 text-xs font-semibold text-teal-100 inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{pwNotice}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <label
                htmlFor="pw-current"
                className="block text-xs font-bold text-slate-300 mb-1"
              >
                Current Password
              </label>
              <input
                id="pw-current"
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 pl-3.5 pr-10 text-sm text-slate-100 focus:outline-none focus:border-amber-300/60"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((p) => !p)}
                aria-label={showCurrentPw ? 'Hide current password' : 'Show current password'}
                className="absolute right-2 bottom-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-100"
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <label htmlFor="pw-new" className="block text-xs font-bold text-slate-300 mb-1">
                New Password
              </label>
              <input
                id="pw-new"
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 chars"
                autoComplete="new-password"
                className="w-full min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 pl-3.5 pr-10 text-sm text-slate-100 focus:outline-none focus:border-amber-300/60"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((p) => !p)}
                aria-label={showNewPw ? 'Hide new password' : 'Show new password'}
                className="absolute right-2 bottom-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-100"
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <label
                htmlFor="pw-confirm-new"
                className="block text-xs font-bold text-slate-300 mb-1"
              >
                Confirm New Password
              </label>
              <input
                id="pw-confirm-new"
                type={showNewPw ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 px-3.5 text-sm text-slate-100 focus:outline-none focus:border-amber-300/60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pwSaving}
            className="min-h-[44px] rounded-2xl bg-teal-400/20 hover:bg-teal-400/30 border border-teal-300/40 text-teal-100 font-extrabold text-sm px-5 transition-colors"
          >
            {pwSaving ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </section>

      {/* Permanent Account Deletion */}
      <section className="aurora-glass-card rounded-[28px] p-6 border border-amber-300/25 space-y-3">
        <h2 className="text-base font-extrabold text-slate-50">Delete Account Permanently</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Permanently erases your Orbit account, profile, goals, work items, opportunities, tasks,
          and wins from Cloud Firestore and Firebase Authentication. This cannot be undone.
        </p>

        {!deleteConfirmOpen ? (
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="min-h-[44px] rounded-2xl bg-amber-400/18 hover:bg-amber-400/28 border border-amber-300/35 px-5 text-sm font-extrabold text-amber-100 inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete my account</span>
          </button>
        ) : (
          <form
            onSubmit={handleDeleteAccount}
            className="rounded-2xl bg-amber-400/10 border border-amber-300/35 p-4 space-y-3"
          >
            {deleteError && (
              <div className="rounded-xl bg-amber-400/20 border border-amber-300/40 px-3 py-2 text-xs font-semibold text-amber-100">
                {deleteError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="delete-confirm-word"
                  className="block text-xs font-bold text-amber-100 mb-1"
                >
                  Type DELETE to confirm
                </label>
                <input
                  id="delete-confirm-word"
                  type="text"
                  value={deleteTyped}
                  onChange={(e) => setDeleteTyped(e.target.value)}
                  placeholder="DELETE"
                  className="w-full min-h-[42px] rounded-xl bg-white/[0.06] border border-white/15 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="relative">
                <label
                  htmlFor="delete-confirm-password"
                  className="block text-xs font-bold text-amber-100 mb-1"
                >
                  Enter Current Password
                </label>
                <input
                  id="delete-confirm-password"
                  type={showDeletePw ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full min-h-[42px] rounded-xl bg-white/[0.06] border border-white/15 pl-3 pr-10 text-sm text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePw((p) => !p)}
                  aria-label={showDeletePw ? 'Hide password' : 'Show password'}
                  className="absolute right-2 bottom-2 p-1 rounded-lg text-slate-400 hover:text-slate-100"
                >
                  {showDeletePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={deletingAccount}
                className="min-h-[42px] rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-extrabold text-xs px-4"
              >
                {deletingAccount ? 'Deleting Account...' : 'Confirm Permanent Deletion'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteTyped('');
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="min-h-[42px] rounded-xl bg-white/10 text-slate-200 font-bold text-xs px-4"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
