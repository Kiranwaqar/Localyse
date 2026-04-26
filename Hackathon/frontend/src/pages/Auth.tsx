import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { setSession, Role } from '@/lib/auth';
import { login, signup } from '@/lib/api';
import { toast } from 'sonner';

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (mode === 'signup' && (!name || (role === 'merchant' && !category)))) return;

    try {
      setSubmitting(true);
      const session =
        mode === 'signup'
          ? await signup({
              name,
              email,
              password,
              role,
              category: role === 'merchant' ? category : undefined,
            })
          : await login({ email, password, role });

      setSession(session);
      toast.success(mode === 'signup' ? 'Account created' : 'Signed in', {
        description: `Welcome to Localyse, ${session.name}.`,
      });
      navigate(session.role === 'merchant' ? '/merchant' : '/app');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not authenticate. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <header className="px-4 sm:px-10 py-5 sm:py-6">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <i className="bi bi-wallet2 text-primary-foreground text-lg" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight">Localyse</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-3 xs:px-4 sm:px-6 py-8 sm:py-10">
        <div className="w-full max-w-md animate-fade-up">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary-soft px-2.5 py-1 rounded-full mb-4">
            <i className={`bi ${role === 'merchant' ? 'bi-shop' : 'bi-person'} text-[10px]`} />
            {role === 'merchant' ? 'Merchant portal' : 'Customer wallet'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === 'signin'
              ? 'Sign in to access your Localyse.'
              : `Get started in less than a minute.`}
          </p>

          <form onSubmit={submit} className="space-y-4">
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground rounded-xl h-11 font-medium text-sm hover:bg-[hsl(var(--primary-hover))] transition active:scale-[0.99] mt-2"
            >
              {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <div className="relative my-5 flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 text-[11px] text-muted-foreground uppercase tracking-wider">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <button
              type="button"
              className="w-full h-11 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition flex items-center justify-center gap-2"
            >
              <i className="bi bi-google" /> Continue with Google
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
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
        className="w-full bg-card text-foreground rounded-xl pl-10 pr-4 min-h-11 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition placeholder:text-muted-foreground"
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
        className="w-full bg-card text-foreground rounded-xl pl-10 pr-4 min-h-11 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition"
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
