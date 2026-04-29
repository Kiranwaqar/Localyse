import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '@/lib/api';
import type { Role } from '@/lib/auth';
import { toast } from 'sonner';

/**
 * De-dupe verification across React Strict Mode double-mount and fast re-renders.
 * Without this, two concurrent POSTs can consume the one-time token; the second fails.
 */
const verifyDoneKeys = new Set<string>();
const verifyInflight = new Map<string, Promise<void>>();

const verifyEmailOnce = async (token: string, role: Role) => {
  const key = `${role}:${token}`;
  if (verifyDoneKeys.has(key)) {
    return;
  }
  let p = verifyInflight.get(key);
  if (!p) {
    p = verifyEmail({ token, role })
      .then(() => {
        verifyDoneKeys.add(key);
      })
      .finally(() => {
        verifyInflight.delete(key);
      });
    verifyInflight.set(key, p);
  }
  await p;
};

const VerifyEmail = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = (params.get('token') || '').trim();
  const role = (params.get('role') as Role) || 'customer';

  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');
  const [errMsg, setErrMsg] = useState('');

  const resolvedRole: Role = role === 'merchant' ? 'merchant' : 'customer';
  const signInPath = resolvedRole === 'merchant' ? '/auth?role=merchant' : '/auth?role=customer';

  useEffect(() => {
    if (!token) {
      setStatus('err');
      setErrMsg('Missing verification token. Open the full link from your email, or request a new one on the sign-in page.');
      return;
    }

    const doneKey = `${resolvedRole}:${token}`;
    if (verifyDoneKeys.has(doneKey)) {
      setStatus('ok');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await verifyEmailOnce(token, resolvedRole);
        if (cancelled) return;
        setStatus('ok');
        toast.success('Email verified', { description: 'You can sign in now.' });
      } catch (e) {
        if (cancelled) return;
        setStatus('err');
        const msg = e instanceof Error ? e.message : 'Verification failed.';
        const hint =
          /Something went wrong|Failed to fetch|NetworkError/i.test(msg) || !msg.trim()
            ? ' On Vercel, clear VITE_API_URL or remove any localhost value so the site uses the live /api routes.'
            : '';
        setErrMsg(msg + hint);
        toast.error(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, resolvedRole]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying your email…</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <i className="bi bi-check-lg text-2xl" />
            </div>
            <h1 className="text-xl font-semibold">You are all set</h1>
            <p className="text-sm text-muted-foreground">
              {resolvedRole === 'merchant'
                ? 'Your business email is verified. Sign in to the merchant portal with your password.'
                : 'Your email is verified. Sign in to your customer account with your password.'}
            </p>
            <Link
              to={signInPath}
              className="inline-flex items-center justify-center rounded-xl h-11 px-6 bg-primary text-primary-foreground text-sm font-medium mt-2"
            >
              {resolvedRole === 'merchant' ? 'Go to merchant sign in' : 'Go to customer sign in'}
            </Link>
            <p className="pt-2">
              <button type="button" onClick={() => navigate(-1)} className="text-xs text-muted-foreground hover:underline">
                Back
              </button>
            </p>
          </>
        )}
        {status === 'err' && (
          <>
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <i className="bi bi-exclamation-lg text-2xl" />
            </div>
            <h1 className="text-xl font-semibold">Link did not work</h1>
            <p className="text-sm text-destructive/90">{errMsg}</p>
            <p className="text-sm text-muted-foreground">Request a new link from the sign-in page (use the same email and password you registered with).</p>
            <Link
              to={signInPath}
              className="inline-flex items-center justify-center rounded-xl h-11 px-6 border border-border text-sm font-medium mt-2"
            >
              {resolvedRole === 'merchant' ? 'Back to merchant sign in' : 'Back to customer sign in'}
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
