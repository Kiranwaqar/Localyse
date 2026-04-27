import { useState } from 'react';
import { getSession, setSession } from '@/lib/auth';
import { updateMerchant } from '@/lib/api';
import { toast } from 'sonner';

const BusinessProfile = () => {
  const [currentSession, setCurrentSession] = useState(() => getSession());
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: currentSession?.name || '',
    email: currentSession?.email || '',
    category: currentSession?.category || '',
  });
  const rows = [
    { icon: 'bi-shop', label: 'Business name', value: currentSession?.name },
    { icon: 'bi-envelope', label: 'Email', value: currentSession?.email },
    { icon: 'bi-tag', label: 'Category', value: currentSession?.category },
    { icon: 'bi-person-badge', label: 'Account type', value: currentSession?.role },
  ].filter((row) => row.value);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveChanges = async () => {
    if (!currentSession?._id) {
      toast.error('Please sign in again before editing your business.');
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.category.trim()) {
      toast.error('Business name, email, and category are required.');
      return;
    }

    try {
      setSaving(true);
      const updatedSession = await updateMerchant(currentSession._id, {
        name: form.name.trim(),
        email: form.email.trim(),
        category: form.category.trim(),
      });

      setSession(updatedSession);
      setCurrentSession(updatedSession);
      setIsEditing(false);
      toast.success('Business details updated', {
        description: 'Your merchant record was saved in MongoDB.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update business details.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto p-3 xs:p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Business</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">{currentSession?.name || 'Your business'}</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Manage your storefront on Localyse</p>
      </header>

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 flex flex-col xs:flex-row xs:items-center gap-4 shadow-xs">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center text-xl font-semibold shrink-0">
          {(currentSession?.name || 'B')[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold truncate">{currentSession?.name || 'Your business'}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success-soft text-success text-[10px] font-semibold">
              <i className="bi bi-patch-check-fill text-[9px]" /> Verified
            </span>
            <span className="break-all">{currentSession?.email}</span>
          </p>
        </div>
        <button
          onClick={() => setIsEditing((current) => !current)}
          className="w-full xs:w-auto text-xs font-medium text-primary px-3 h-9 rounded-lg border border-border hover:bg-secondary transition shrink-0"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {isEditing ? (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <Field label="Business name" value={form.name} onChange={(value) => updateField('name', value)} />
          <Field label="Email" value={form.email} onChange={(value) => updateField('email', value)} type="email" />
          <Field label="Category" value={form.category} onChange={(value) => updateField('category', value)} />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-xs">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start xs:items-center gap-4 p-4 sm:p-5">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
                <i className={`bi ${row.icon} text-sm`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{row.label}</p>
                <p className="text-sm font-medium mt-0.5 break-words">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={saveChanges}
        disabled={!isEditing || saving}
        className="w-full bg-primary text-primary-foreground rounded-xl h-11 text-sm font-medium hover:bg-[hsl(var(--primary-hover))] transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) => (
  <label className="block">
    <span className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full bg-card text-foreground rounded-xl px-3 h-11 text-sm border border-border focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition"
    />
  </label>
);

export default BusinessProfile;
