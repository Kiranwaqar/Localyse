import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { submitMerchantApplication } from '@/lib/api';

const MerchantApply = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ message: string; status: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Enter the business email you plan to use for Localyse.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitMerchantApplication({
        email: email.trim(),
        name: name.trim() || undefined,
        message: message.trim() || undefined,
      });
      setDone({ message: res.message, status: res.status });
      toast.success(res.status === 'approved' ? 'You can sign up' : 'Request sent', {
        description: res.message,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit. Try again.');
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

      <main className="flex-1 flex w-full items-start justify-center px-3 xs:px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-md mx-auto animate-fade-up">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary-soft px-2.5 py-1 rounded-full mb-4">
            <i className="bi bi-shop text-[10px]" />
            Merchant access
          </span>
          <h1 className="text-[1.35rem] xs:text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            Request merchant access
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            New merchant sign ups are reviewed first. Use the same email you will use for your business account (password
            or Google). After approval, you can complete sign up and email verification as usual.
          </p>

          {done ? (
            <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">{done.message}</p>
              {done.status === 'approved' ? (
                <Link
                  to="/auth?role=merchant"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Go to merchant sign up <i className="bi bi-arrow-right" />
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">
                  When you’re approved, you’ll get an email. Then use{' '}
                  <Link to="/auth?role=merchant" className="text-primary font-medium">
                    Sign up
                  </Link>{' '}
                  with that address.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Business email *</label>
                <div className="relative">
                  <i className="bi bi-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-card text-foreground rounded-xl pl-10 pr-3 min-h-11 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                    placeholder="you@yourbusiness.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Your name (optional)</label>
                <div className="relative">
                  <i className="bi bi-person absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-card text-foreground rounded-xl pl-10 pr-3 min-h-11 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                    placeholder="How we should address you"
                    autoComplete="name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-card text-foreground rounded-xl px-3 py-2.5 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none resize-y min-h-[5rem]"
                  placeholder="Business type, location, or anything helpful for review"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-11 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-[hsl(var(--primary-hover))] transition"
              >
                {submitting ? 'Sending…' : 'Submit request'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-8">
            <Link to="/auth?role=merchant" className="text-primary font-medium hover:underline">
              Back to sign in / sign up
            </Link>
            {' · '}
            <Link to="/" className="hover:underline">
              Home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default MerchantApply;
