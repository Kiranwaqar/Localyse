import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/app', icon: 'bi-house', activeIcon: 'bi-house-fill', label: 'Home', end: true },
  { to: '/app/map', icon: 'bi-map', activeIcon: 'bi-map-fill', label: 'Map' },
  { to: '/app/saved', icon: 'bi-stars', activeIcon: 'bi-stars', label: 'For you' },
  { to: '/app/wallet', icon: 'bi-wallet2', activeIcon: 'bi-wallet-fill', label: 'Wallet' },
  { to: '/app/redeemed', icon: 'bi-receipt', activeIcon: 'bi-receipt', label: 'History' },
  { to: '/app/profile', icon: 'bi-person', activeIcon: 'bi-person-fill', label: 'Profile' },
];

const CustomerLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== 'customer') navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto relative min-h-screen flex flex-col overflow-x-hidden px-0 sm:px-4 lg:px-8 xl:px-10">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border/70 px-3 xs:px-4 sm:px-5 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <i className="bi bi-wallet2 text-primary-foreground text-sm" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Localyse</p>
              <p className="text-[13px] font-semibold">Live city</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <button className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center transition">
              <i className="bi bi-bell text-base" />
            </button>
            <span className="text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Live
            </span>
          </div>
        </header>

        <main className="flex-1 pb-24">
          <Outlet />
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl bg-card/95 backdrop-blur-md border-t border-border px-1.5 sm:px-2 lg:px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-start sm:justify-around gap-1 overflow-x-auto scrollbar-none z-30">
          {tabs.map(({ to, icon, activeIcon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 flex-col items-center gap-0.5 px-2 sm:px-3 py-1.5 rounded-lg text-[9px] xs:text-[10px] font-medium transition-colors min-w-[48px] xs:min-w-[54px] sm:min-w-[60px] tap-target',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <i className={`bi ${isActive ? activeIcon : icon} text-[18px]`} />
                  <span className="whitespace-nowrap">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default CustomerLayout;
