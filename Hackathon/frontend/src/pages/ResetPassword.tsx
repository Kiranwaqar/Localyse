import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/lib/api';
import type { Role } from '@/lib/auth';
import { toast } from 'sonner';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const role = ((params.get('role') as Role) || 'customer') === 'merchant' ? 'merchant' : 'customer';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const signInPath = role === 'merchant' ? '/auth?role=merchant' : '/auth?role=customer';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('This page needs a valid link from your email. Request a new reset from sign in.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await resetPassword({ token, role, newPassword: password });
      toast.success(res.message);
      navigate(signInPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
      toast.error(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Missing link</h1>
          <p className="text-sm text-muted-foreground">Open the full link from your reset email, or request a new one.</p>
          <Link
            to={`/forgot-password?role=${role}`}
            className="inline-flex items-center justify-center rounded-xl h-11 px-6 bg-primary text-primary-foreground text-sm font-medium"
          >
            Request reset link
          </Link>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Set a new password</h1>
            <p className="text-sm text-muted-foreground">
              {role === 'merchant' ? 'Merchant' : 'Customer'} account — pick a new password, then sign in.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">New password</label>
              <div className="relative">
                <i className="bi bi-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-card text-foreground rounded-xl pl-10 pr-3 min-h-11 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Confirm password</label>
              <div className="relative">
                <i className="bi bi-lock-fill absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-card text-foreground rounded-xl pl-10 pr-3 min-h-11 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-11 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-[hsl(var(--primary-hover))] transition mt-1"
            >
              {submitting ? 'Saving…' : 'Update password'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link to={signInPath} className="text-primary font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
