import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { clearSession, getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/merchant', icon: 'bi-grid-1x2', label: 'Dashboard', end: true },
  { to: '/merchant/create', icon: 'bi-plus-square', label: 'Create offer' },
  { to: '/merchant/analytics', icon: 'bi-bar-chart', label: 'Analytics' },
  { to: '/merchant/claims', icon: 'bi-ticket-perforated', label: 'Coupon claims' },
  { to: '/merchant/profile', icon: 'bi-shop', label: 'Business' },
];

const MerchantLayout = () => {
  const navigate = useNavigate();
  const session = getSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session || session.role !== 'merchant') navigate('/');
  }, [navigate, session]);

  const logout = () => {
    clearSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-card p-5 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 mb-10 px-1">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <i className="bi bi-wallet2 text-primary-foreground text-lg" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Localyse</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Merchant</p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1">
          {nav.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-soft text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
            >
              <i className={`bi ${icon} text-base w-5`} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-2.5 px-1 mb-3">
            <div className="w-8 h-8 rounded-lg bg-secondary text-foreground flex items-center justify-center text-xs font-semibold">
              {(session?.name || 'M')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{session?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{session?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive transition px-1">
            <i className="bi bi-box-arrow-right" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-background/85 backdrop-blur-md border-b border-border h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <i className="bi bi-wallet2 text-primary-foreground text-sm" />
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold">Localyse</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Merchant</p>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center">
          <i className={`bi ${open ? 'bi-x-lg' : 'bi-list'} text-base`} />
        </button>
      </header>

      {/* Mobile menu drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 top-14 z-20 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-card border-b border-border p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
            {nav.map(({ to, icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium transition',
                    isActive ? 'bg-primary-soft text-primary' : 'text-foreground hover:bg-secondary'
                  )
                }
              >
                <i className={`bi ${icon} text-base w-5`} />
                {label}
              </NavLink>
            ))}
            <button onClick={logout} className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium text-destructive hover:bg-secondary">
              <i className="bi bi-box-arrow-right text-base w-5" /> Sign out
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 max-w-full overflow-x-hidden pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default MerchantLayout;
