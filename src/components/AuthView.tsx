import { useState, type FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  User as UserIcon,
  ArrowRight,
  KeyRound,
  X,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';

type AuthMode = 'signin' | 'signup' | 'reset';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthView() {
  const { signIn, signUp, requestPasswordReset, savedAccounts, forgetSavedAccount } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => savedAccounts[0]?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorMsg(null);
    setStatusMsg(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSelectSavedAccount = (savedEmail: string) => {
    setMode('signin');
    setEmail(savedEmail);
    setPassword('');
    setErrorMsg(null);
    setStatusMsg(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address (for example, name@domain.com).');
      return;
    }

    if (mode === 'reset') {
      setSubmitting(true);
      try {
        await requestPasswordReset(trimmedEmail);
        setStatusMsg(
          `Password reset link sent to ${trimmedEmail}. Check your inbox (and spam folder) to set a new password.`
        );
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not send password reset email.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Please enter your name so Orbit can personalize your workspace.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Please choose a password with at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please double-check both password fields.');
        return;
      }

      setSubmitting(true);
      try {
        await signUp({ name: name.trim(), email: trimmedEmail, password });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Could not create your Orbit account.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // mode === 'signin'
    if (!password) {
      setErrorMsg('Please enter your password to sign in.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn({ email: trimmedEmail, password });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative z-10">
      <div className="w-full max-w-md space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/12 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Luna · Vega · Polaris</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-50">
            Orbit
          </h1>
          <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
            Other apps punish you when you fall behind. Orbit makes the restart small.
          </p>
        </div>

        {/* Auth Card */}
        <div className="aurora-glass-card rounded-[28px] p-6 sm:p-7 space-y-5">
          {/* Mode Tabs */}
          <div
            role="tablist"
            aria-label="Account access"
            className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04] border border-white/10"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => switchMode('signin')}
              className={`min-h-[42px] rounded-xl text-sm font-extrabold transition-colors ${
                mode === 'signin'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => switchMode('signup')}
              className={`min-h-[42px] rounded-xl text-sm font-extrabold transition-colors ${
                mode === 'signup'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Multi-user saved accounts quick switcher */}
          {mode === 'signin' && savedAccounts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-300" />
                  <span>Accounts on this device</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('');
                    setPassword('');
                  }}
                  className="text-amber-300 hover:text-amber-200 underline-offset-2 hover:underline"
                >
                  Use another email
                </button>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {savedAccounts.map((acc) => {
                  const selected = email.trim().toLowerCase() === acc.email.toLowerCase();
                  return (
                    <div
                      key={acc.uid}
                      className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 transition-colors ${
                        selected
                          ? 'bg-teal-400/15 border-teal-300/40'
                          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSavedAccount(acc.email)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      >
                        <UserAvatar name={acc.displayName} photoURL={acc.photoURL} size="sm" />
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-100 truncate">
                            {acc.displayName}
                          </div>
                          <div className="text-[11px] text-slate-300 truncate">{acc.email}</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => forgetSavedAccount(acc.uid)}
                        aria-label={`Remove ${acc.email} from saved list`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl bg-amber-400/15 border border-amber-300/40 px-4 py-3 text-xs font-semibold text-amber-100 leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          {statusMsg && (
            <div
              role="status"
              className="rounded-2xl bg-teal-400/15 border border-teal-300/40 px-4 py-3 text-xs font-semibold text-teal-100 leading-relaxed"
            >
              {statusMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="orbit-auth-name"
                  className="block text-xs font-bold text-slate-300 mb-1.5"
                >
                  Your Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="orbit-auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    autoComplete="name"
                    maxLength={100}
                    className="w-full min-h-[46px] rounded-2xl bg-white/[0.06] border border-white/12 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-300/60"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="orbit-auth-email"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="orbit-auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  autoComplete="email"
                  maxLength={200}
                  className="w-full min-h-[46px] rounded-2xl bg-white/[0.06] border border-white/12 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-300/60"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="orbit-auth-password"
                    className="block text-xs font-bold text-slate-300"
                  >
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs font-bold text-amber-300 hover:text-amber-200"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="orbit-auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full min-h-[46px] rounded-2xl bg-white/[0.06] border border-white/12 pl-10 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-300/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="orbit-auth-confirm"
                  className="block text-xs font-bold text-slate-300 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="orbit-auth-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full min-h-[46px] rounded-2xl bg-white/[0.06] border border-white/12 pl-10 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-300/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] font-semibold text-amber-200 mt-1">
                    Passwords do not match yet.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-extrabold text-sm px-5 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/15"
            >
              {mode === 'reset' ? (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>{submitting ? 'Sending reset link...' : 'Send Password Reset Email'}</span>
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>{submitting ? 'Creating your Orbit...' : 'Create My Orbit Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>{submitting ? 'Signing in...' : 'Enter My Orbit Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="w-full min-h-[40px] rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 text-xs font-bold"
              >
                Back to Sign In
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 px-4">
          Each account has its own private Firestore workspace. Your goals, assignments, and wins
          are never visible to other users.
        </p>
      </div>
    </div>
  );
}
