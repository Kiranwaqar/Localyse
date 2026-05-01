import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { clearSession, getSession, setSession, Role, Session } from '@/lib/auth';
import { login, resendVerification, signup } from '@/lib/api';
import { toast } from 'sonner';
import GoogleSignInButton from '@/components/GoogleSignInButton';

/** After a sign-in fails because email isn’t verified, wait this long before showing the resend block. */
const RESEND_COOLDOWN_MS = 60_000;
const SESSION_RESEND_UNLOCK_KEY = 'localyse_auth_resend_unlock_at';

const readStoredResendUnlockAt = (): number | null => {
  try {
    const s = sessionStorage.getItem(SESSION_RESEND_UNLOCK_KEY);
    if (!s) return null;
    const t = parseInt(s, 10);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
};

const isUnverifiedSignInError = (message: string) =>
  /verify your address before signing in/i.test(message);

const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const isEmailConflictMessage = (message: string) =>
  /already used for a|already exists\.?$/i.test(message) ||
  /already used for/i.test(message);

const merchantCategoryOptions = [
  { value: 'food', label: 'Restaurant / Food' },
  { value: 'coffee', label: 'Cafe / Coffee' },
  { value: 'retail', label: 'Retail / Shopping' },
  { value: 'grocery', label: 'Grocery / Market' },
  { value: 'fitness', label: 'Gym / Fitness' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'beauty', label: 'Beauty / Salon' },
  { value: 'services', label: 'Local Services' },
];

const Auth = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const role = (params.get('role') as Role) || 'customer';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingInfo, setPendingInfo] = useState<{
    message: string;
    email: string;
    devPath?: string;
    role: Role;
  } | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendUnlockAt, setResendUnlockAt] = useState<number | null>(() => readStoredResendUnlockAt());
  const [, setResendTick] = useState(0);
  const [browserSession, setBrowserSession] = useState<Session | null>(() => getSession());

  useEffect(() => {
    const syncSession = () => setBrowserSession(getSession());
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  useEffect(() => {
    if (resendUnlockAt == null) return;
    if (Date.now() >= resendUnlockAt) return;
    const id = window.setInterval(() => setResendTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [resendUnlockAt]);

  const beginResendCooldown = useCallback(() => {
    const at = Date.now() + RESEND_COOLDOWN_MS;
    setResendUnlockAt(at);
    try {
      sessionStorage.setItem(SESSION_RESEND_UNLOCK_KEY, String(at));
    } catch {
      /* ignore */
    }
  }, []);

  const clearResendCooldown = useCallback(() => {
    setResendUnlockAt(null);
    try {
      sessionStorage.removeItem(SESSION_RESEND_UNLOCK_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const signOutThisDevice = useCallback(() => {
    clearSession();
    clearResendCooldown();
    setBrowserSession(null);
    toast.info('Signed out on this device', {
      description: 'Your browser was still holding the old account; you can sign up or sign in again.',
    });
  }, [clearResendCooldown]);

  const showSignInResendPanel =
    mode === 'signin' &&
    !pendingInfo &&
    resendUnlockAt != null &&
    Date.now() >= resendUnlockAt;

  const showSignInResendCountdown =
    mode === 'signin' &&
    !pendingInfo &&
    resendUnlockAt != null &&
    Date.now() < resendUnlockAt;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (mode === 'signup' && (!name || (role === 'merchant' && !category)))) return;

    try {
      setSubmitting(true);
      if (mode === 'signup') {
        const data = await signup({
          name,
          email,
          password,
          role,
          category: role === 'merchant' ? category : undefined,
        });
        if (data.requiresEmailVerification) {
          setPassword('');
          setEmail(data.email);
          setPendingInfo({
            message: data.message || 'Check your email to verify your account.',
            email: data.email,
            devPath: data.devVerificationPath,
            role: data.role,
          });
          if (data.verificationEmailSent === false) {
            toast.warning('Email may not have been sent', {
              description:
                data.message ||
                'We could not send the verification email right now. Try again shortly or contact support if this continues.',
            });
          } else {
            toast.info('Check your email', { description: 'We sent a verification link.' });
          }
          return;
        }
        setSession(data);
        toast.success('Account created', {
          description: `Welcome to Localyse, ${data.name}.`,
        });
        navigate(data.role === 'merchant' ? '/merchant' : '/app');
        return;
      }

      const session = await login({ email, password, role });
      clearResendCooldown();
      setSession(session);
      toast.success('Signed in', {
        description: `Welcome to Localyse, ${session.name || session.email}.`,
      });
      navigate(session.role === 'merchant' ? '/merchant' : '/app');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not authenticate. Please try again.';
      if (mode === 'signin' && isUnverifiedSignInError(message)) {
        beginResendCooldown();
      }
      setError(message);
      const conflict = mode === 'signup' && isEmailConflictMessage(message);
      toast.error(message, {
        ...(conflict
          ? {
              description:
                'One email can serve both merchant and wallet: use the correct password / Google role, verify your wallet email first if you’re adding a business, then sign out on this device if the browser cached an old session.',
              duration: 10_000,
            }
          : {}),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email || !password) {
      setError('Enter the email and password you used at sign up to resend the link.');
      return;
    }
    setError('');
    try {
      setResendLoading(true);
      const res = await resendVerification({ email, password, role: pendingInfo?.role || role });
      if (res.alreadyVerified) {
        toast.success(res.message);
        setPendingInfo(null);
        setMode('signin');
        return;
      }
      toast.success(res.message);
      if (import.meta.env.DEV && res.devVerificationPath) {
        setPendingInfo((prev) =>
          prev
            ? { ...prev, devPath: res.devVerificationPath, message: res.message }
            : {
                message: res.message,
                email,
                devPath: res.devVerificationPath,
                role: role,
              }
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not resend.';
      setError(message);
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  };

  const googleIntent = mode === 'signin' ? 'signin' : 'signup';
  const googleBlocked =
    mode === 'signup' && role === 'merchant' && !category
      ? 'Select a business category to continue with Google for your business.'
      : null;

  const onGoogleSuccess = useCallback(
    (session: Session) => {
      setSession(session);
      toast.success(mode === 'signup' ? 'Account ready' : 'Signed in', {
        description: `Welcome to Localyse, ${session.name || session.email}.`,
      });
      navigate(session.role === 'merchant' ? '/merchant' : '/app');
    },
    [mode, navigate]
  );

  const onGoogleError = useCallback((message: string) => {
    setError(message);
    const conflict = isEmailConflictMessage(message);
    toast.error(message, {
      ...(conflict
        ? {
            description:
              'One email works for merchant and wallet. Try the matching role (“Continue with Google” vs password). Sign out above if something looks cached.',
            duration: 10_000,
          }
        : {}),
    });
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      <header className="w-full min-w-0 px-3 xs:px-4 sm:px-10 py-4 sm:py-6">
        <Link to="/" className="inline-flex items-center gap-2.5 min-w-0 max-w-full">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-primary flex items-center justify-center">
            <i className="bi bi-wallet2 text-primary-foreground text-lg" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight truncate">Localyse</span>
        </Link>
      </header>

      <main className="flex-1 flex w-full min-w-0 items-start sm:items-center justify-center px-3 xs:px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full min-w-0 max-w-md mx-auto animate-fade-up">
          {browserSession && (
            <div className="mb-4 rounded-xl border border-border bg-secondary/50 px-3.5 py-3 text-left">
              <p className="text-xs font-medium text-foreground">
                Signed in on this browser as{' '}
                <span className="text-foreground">{browserSession.email}</span> ({browserSession.role})
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Clearing this device’s saved session doesn’t change your password on our servers. Sign out before reusing the same email on a different role.
              </p>
              <button
                type="button"
                onClick={signOutThisDevice}
                className="mt-2.5 text-xs font-semibold text-primary hover:underline"
              >
                Sign out on this device
              </button>
            </div>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary-soft px-2.5 py-1 rounded-full mb-4">
            <i className={`bi ${role === 'merchant' ? 'bi-shop' : 'bi-person'} text-[10px]`} />
            {role === 'merchant' ? 'Merchant portal' : 'Customer wallet'}
          </span>
          <h1 className="text-[1.35rem] xs:text-2xl sm:text-3xl font-semibold tracking-tight mb-2 break-words">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6 sm:mb-8 break-words">
            {pendingInfo
              ? 'One more step: confirm your email.'
              : mode === 'signin'
                ? 'Sign in to access your Localyse.'
                : `Get started in less than a minute.`}
          </p>

          {role === 'merchant' && !pendingInfo && (
            <div className="rounded-xl border border-primary/20 bg-primary-soft/30 px-3.5 py-3 text-left mb-5">
              <p className="text-sm font-medium text-foreground">Merchant sign up is invite-only</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Submit a request for the email you will use. After approval, return here to create your account
                (email verification or Google, same as before).
              </p>
              <Link
                to="/merchant-apply"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary mt-2.5 hover:underline"
              >
                Request merchant access
                <i className="bi bi-arrow-right text-xs" />
              </Link>
            </div>
          )}

          {pendingInfo ? (
            <div className="space-y-4 rounded-2xl border border-border bg-card/80 p-4 sm:p-5 text-left min-w-0">
              <p className="text-sm text-foreground leading-relaxed break-words">{pendingInfo.message}</p>
              <p className="text-xs text-muted-foreground">
                We sent a link to <span className="text-foreground font-medium">{pendingInfo.email}</span>. After you
                verify, return here and sign in.
              </p>
              {import.meta.env.DEV && pendingInfo.devPath && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Dev: </span>
                  <Link to={pendingInfo.devPath} className="text-primary font-medium break-all">
                    Open verification link
                  </Link>
                </p>
              )}
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs font-medium text-foreground">Didn&apos;t get the email?</p>
                <p className="text-[11px] text-muted-foreground">
                  Enter the same email and password you used at sign up, then resend.
                </p>
                <Field
                  label="Email"
                  icon="bi-envelope"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  placeholder="you@example.com"
                />
                <Field
                  label="Password"
                  icon="bi-lock"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  placeholder="••••••••"
                />
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="w-full border border-border rounded-xl h-10 text-sm font-medium hover:bg-secondary transition"
                >
                  {resendLoading ? 'Sending…' : 'Resend verification email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingInfo(null);
                    setMode('signin');
                    setError('');
                    setPassword('');
                  }}
                  className="w-full text-sm text-primary font-medium hover:underline"
                >
                    I already verified — go to sign in
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={submit} className="space-y-3 sm:space-y-4 w-full min-w-0">
            {mode === 'signup' && (
              <Field
                label={role === 'merchant' ? 'Business name' : 'Full name'}
                icon="bi-person"
                value={name}
                onChange={setName}
                required
                placeholder={role === 'merchant' ? 'Your business name' : 'Your full name'}
              />
            )}
            {mode === 'signup' && role === 'merchant' && (
              <CategoryField
                value={category}
                onChange={setCategory}
              />
            )}
            <Field
              label="Email"
              icon="bi-envelope"
              type="email"
              value={email}
              onChange={setEmail}
              required
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              icon="bi-lock"
              type="password"
              value={password}
              onChange={setPassword}
              required
              placeholder="••••••••"
            />
            {mode === 'signin' && (
              <div className="flex justify-end -mt-0.5">
                <Link
                  to={`/forgot-password?role=${role}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-11 min-[360px]:h-12 touch-manipulation bg-primary text-primary-foreground rounded-xl py-2.5 xs:py-0 font-medium text-sm sm:text-sm hover:bg-[hsl(var(--primary-hover))] transition active:scale-[0.99] mt-1 sm:mt-2"
            >
              {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <div className="relative my-4 sm:my-5 flex items-center w-full min-w-0">
              <div className="min-w-0 flex-1 border-t border-border" />
              <span className="shrink-0 px-2.5 sm:px-3 text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">or</span>
              <div className="min-w-0 flex-1 border-t border-border" />
            </div>

            <div className="space-y-2 sm:space-y-2.5 w-full min-w-0 max-w-full">
              <GoogleSignInButton
                role={role}
                intent={googleIntent}
                category={role === 'merchant' ? category : undefined}
                blocked={googleBlocked}
                onSuccess={onGoogleSuccess}
                onError={onGoogleError}
              />
              <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center leading-relaxed px-0 sm:px-0.5 max-w-prose mx-auto">
                Sign in with a Google account that has a <span className="text-foreground/80">verified email</span>.
                We use Google to confirm your email—no passwords stored for Google-only accounts.
              </p>
            </div>
          </form>
          )}

          {showSignInResendCountdown && (
            <div className="mt-4 sm:mt-5 w-full min-w-0 rounded-xl border border-border/60 bg-primary-soft/40 px-3 py-3 text-center">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                We sent a verification message—check your inbox first. You can resend a new link in{' '}
                <span className="font-semibold tabular-nums text-foreground/90">
                  {formatCountdown(resendUnlockAt! - Date.now())}
                </span>
                .
              </p>
            </div>
          )}

          {showSignInResendPanel && (
            <div className="mt-4 sm:mt-5 w-full min-w-0 rounded-xl border border-dashed border-primary/25 bg-primary-soft/30 px-2.5 sm:px-3 py-3 text-center">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-1.5 sm:mb-2">Haven’t verified your email yet?</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-2 sm:mb-2.5 leading-relaxed">Enter your email and password, then resend the link.</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || !email || !password}
                className="min-h-9 touch-manipulation text-xs sm:text-sm text-primary font-medium hover:underline disabled:opacity-50 px-2 py-1"
              >
                {resendLoading ? 'Sending…' : 'Resend verification email'}
              </button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-5 sm:mt-6 min-w-0">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setPendingInfo(null);
                if (mode === 'signin') {
                  clearResendCooldown();
                }
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
              }}
              className="text-primary font-medium hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-8">
            <Link to="/" className="hover:text-foreground inline-flex items-center gap-1">
              <i className="bi bi-arrow-left" /> Choose a different role
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

const Field = ({
  label, icon, value, onChange, placeholder, type = 'text', required,
}: {
  label: string; icon: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) => (
  <div>
    <label className="text-xs font-medium text-foreground mb-1.5 block">{label}</label>
    <div className="relative">
      <i className={`bi ${icon} absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm`} />
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 max-w-full bg-card text-foreground rounded-xl pl-10 pr-3 sm:pr-4 min-h-11 min-[360px]:min-h-12 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition placeholder:text-muted-foreground"
        placeholder={placeholder}
      />
    </div>
  </div>
);

const CategoryField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="text-xs font-medium text-foreground mb-1.5 block">Business category</label>
    <div className="relative">
      <i className="bi bi-tag absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 max-w-full bg-card text-foreground rounded-xl pl-10 pr-3 sm:pr-4 min-h-11 min-[360px]:min-h-12 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition"
      >
        <option value="">Select your business category</option>
        {merchantCategoryOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
    <p className="text-[11px] text-muted-foreground mt-1.5">
      This helps Localyse generate more relevant customer offers for your business.
    </p>
  </div>
);

export default Auth;
