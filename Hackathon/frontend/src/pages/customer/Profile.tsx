import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { updateUser } from '@/lib/api';
import { clearSession, getSession, setSession } from '@/lib/auth';
import { toast } from 'sonner';
import { resetCustomerTour } from '@/lib/customerOnboarding';

const preferenceOptions = ['coffee', 'food', 'retail', 'fitness', 'vegetarian', 'desserts', 'student deals', 'high discount'];

const Profile = () => {
  const navigate = useNavigate();
  const session = getSession();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(session?.name || '');
  const [email, setEmail] = useState(session?.email || '');
  const [preferences, setPreferences] = useState<string[]>(session?.preferences || []);

  const logout = () => {
    clearSession();
    navigate('/');
  };

  const togglePreference = (preference: string) => {
    setPreferences((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference]
    );
  };

  const saveProfile = async () => {
    if (!session?._id) {
      toast.error('Please sign in again before updating your profile.');
      return;
    }

    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required.');
      return;
    }

    setSaving(true);

    try {
      const updated = await updateUser(session._id, {
        name: name.trim(),
        email: email.trim(),
        preferences,
        location: session.location,
      });

      setSession(updated);
      setEditing(false);
      toast.success('Profile updated', {
        description: 'Your profile was saved.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update your profile.';
      toast.error('Update failed', { description: message });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setName(session?.name || '');
    setEmail(session?.email || '');
    setPreferences(session?.preferences || []);
    setEditing(false);
  };

  return (
    <div className="px-3 xs:px-4 sm:px-5 pt-4 sm:pt-5 space-y-6 pb-6">
      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Account</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Profile</h1>
      </section>

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold shrink-0">
          {(session?.name || 'U')[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{name || 'You'}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
        <button onClick={() => setEditing(true)} className="text-xs text-primary font-medium">Edit</button>
      </div>

      {editing && (
        <section className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Edit account info</h2>
            <p className="text-xs text-muted-foreground mt-1">Update your customer profile details.</p>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input
              value={email}
              type="email"
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Preferences</p>
            <div className="flex flex-wrap gap-2">
              {preferenceOptions.map((preference) => {
                const active = preferences.includes(preference);

                return (
                  <button
                    key={preference}
                    type="button"
                    onClick={() => togglePreference(preference)}
                    className={
                      'rounded-full px-3 py-1 text-xs font-medium transition ' +
                      (active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground')
                    }
                  >
                    {preference}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col xs:flex-row gap-2">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex-1 min-h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2.5">Preferences</h2>
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          {preferences.length ? (
            <div className="flex flex-wrap gap-2">
              {preferences.map((preference) => (
                <span key={preference} className="text-xs font-medium px-3 py-1 rounded-full bg-primary-soft text-primary">
                  {preference}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No saved preferences yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2.5">Help</h2>
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          <p className="text-sm text-muted-foreground mb-3">
            New here? Run the short welcome bubbles again — they explain each tab in the app.
          </p>
          <button
            type="button"
            onClick={() => {
              const id = session?._id;
              if (!id) {
                toast.error('Sign in again to replay the tour.');
                return;
              }
              resetCustomerTour(id);
              toast.message('Welcome tour will show on Home.');
              navigate('/app');
            }}
            className="h-10 rounded-xl border border-primary/30 bg-primary-soft text-primary text-sm font-medium px-4 hover:bg-primary/15 transition"
          >
            Replay welcome tour
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2.5">Settings</h2>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          <div className="w-full flex items-start xs:items-center gap-3 p-4 text-left">
            <i className="bi bi-envelope text-muted-foreground text-base w-5" />
            <span className="text-sm flex-1">Email</span>
            <span className="text-xs text-muted-foreground break-all text-right">{email}</span>
          </div>
          <div className="w-full flex items-center gap-3 p-4 text-left">
            <i className="bi bi-person-badge text-muted-foreground text-base w-5" />
            <span className="text-sm flex-1">Role</span>
            <span className="text-xs text-muted-foreground">{session?.role}</span>
          </div>
        </div>
      </section>

      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-border bg-card text-sm font-medium text-destructive hover:border-destructive/50 transition"
      >
        <i className="bi bi-box-arrow-right" /> Sign out
      </button>
    </div>
  );
};

export default Profile;
