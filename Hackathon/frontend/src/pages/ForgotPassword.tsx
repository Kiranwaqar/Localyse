import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { forgotPassword } from '@/lib/api';
import type { Role } from '@/lib/auth';
import { toast } from 'sonner';

const ForgotPassword = () => {
  const [params] = useSearchParams();
  const initialRole = (params.get('role') as Role) || 'customer';
  const role: Role = initialRole === 'merchant' ? 'merchant' : 'customer';
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  const [devPath, setDevPath] = useState<string | null>(null);

  const backToSignIn = role === 'merchant' ? '/auth?role=merchant' : '/auth?role=customer';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setDevPath(null);
    try {
      const res = await forgotPassword({ email: email.trim(), role });
      setDoneMessage(res.message);
      setSubmitted(true);
      toast.info('Check your email', { description: res.message });
      if (import.meta.env.DEV && res.devResetPath) {
        setDevPath(res.devResetPath);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col overflow-x-hidden">
      <header className="w-full px-3 xs:px-4 sm:px-10 py-4 sm:py-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <i className="bi bi-wallet2 text-primary-foreground text-lg" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight">Localyse</span>
        </Link>
      </header>

      <main className="flex-1 flex w-full items-start justify-center px-3 py-6 sm:py-10">
        <div className="w-full max-w-md mx-auto space-y-6 animate-fade-up">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Forgot password</h1>
            <p className="text-sm text-muted-foreground">
              {role === 'merchant' ? 'Merchant' : 'Customer'} account — we&apos;ll email you a one-time link to set a
              new password. Google-only sign-in accounts are not included (use Google to sign in).
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Email</label>
                <div className="relative">
                  <i className="bi bi-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-card text-foreground rounded-xl pl-10 pr-3 min-h-11 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-11 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-[hsl(var(--primary-hover))] transition"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5 space-y-2">
              <p className="text-sm text-foreground leading-relaxed">{doneMessage}</p>
              {import.meta.env.DEV && devPath && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Dev (SMTP off): </span>
                  <Link to={devPath} className="text-primary font-medium break-all">
                    Open reset link
                  </Link>
                </p>
              )}
            </div>
          )}

          <p className="text-center text-sm">
            <Link to={backToSignIn} className="text-primary font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
