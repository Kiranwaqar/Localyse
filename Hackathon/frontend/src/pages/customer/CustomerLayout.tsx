import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { CustomerNotificationsProvider } from '@/contexts/CustomerNotificationsContext';
import { CustomerNotificationMenu } from '@/components/CustomerNotificationMenu';
import { CustomerOnboardingTour } from '@/components/CustomerOnboardingTour';

const tabs = [
  { to: '/app', icon: 'bi-house', activeIcon: 'bi-house-fill', label: 'Home', shortLabel: 'Home', end: true },
  { to: '/app/map', icon: 'bi-map', activeIcon: 'bi-map-fill', label: 'Map', shortLabel: 'Map', end: false },
  { to: '/app/saved', icon: 'bi-stars', activeIcon: 'bi-stars', label: 'For you', shortLabel: 'You', end: false },
  { to: '/app/wallet', icon: 'bi-wallet2', activeIcon: 'bi-wallet-fill', label: 'Wallet', shortLabel: 'Wallet', end: false },
  { to: '/app/redeemed', icon: 'bi-receipt', activeIcon: 'bi-receipt', label: 'History', shortLabel: 'Past', end: false },
  { to: '/app/profile', icon: 'bi-person', activeIcon: 'bi-person-fill', label: 'Profile', shortLabel: 'Me', end: false },
];

const CustomerLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== 'customer') navigate('/');
  }, [navigate]);

  return (
    <CustomerNotificationsProvider>
      <CustomerOnboardingTour />
      <div className="flex min-h-screen min-h-dvh w-full flex-col bg-background md:h-dvh md:flex-row md:overflow-hidden">
        {/* Laptop / desktop — sidebar navigation */}
        <aside className="hidden md:flex md:w-56 lg:w-60 shrink-0 flex-col border-r border-border bg-card min-h-0">
          <div className="flex flex-col h-full min-h-0 p-4 lg:p-5 overflow-y-auto overscroll-contain">
            <div className="flex items-center gap-3 mb-8 px-1">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <i className="bi bi-wallet2 text-primary-foreground text-lg" />
              </div>
              <div className="leading-tight min-w-0">
                <p className="text-sm font-semibold tracking-tight truncate">Localyse</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Customer</p>
              </div>
            </div>
            <nav className="flex flex-col gap-0.5 flex-1" aria-label="Customer app sections">
              {tabs.map(({ to, icon, activeIcon, label, end }) => (
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
                  {({ isActive }) => (
                    <>
                      <i className={cn('bi w-5 text-base shrink-0 text-center', isActive ? activeIcon : icon)} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main column — header + scrollable content; bottom bar only on mobile */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-x-hidden md:min-h-0">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-20 shrink-0 bg-background/85 backdrop-blur-md border-b border-border/70 px-3 xs:px-4 sm:px-5 h-14 flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <i className="bi bi-wallet2 text-primary-foreground text-sm" />
              </div>
              <div className="leading-tight min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Localyse</p>
                <p className="text-[13px] font-semibold truncate">Live city</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground shrink-0">
              <CustomerNotificationMenu />
              <span className="text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Live
              </span>
            </div>
          </header>

          {/* Desktop — slim top bar (actions only; nav is in sidebar) */}
          <header className="hidden md:flex shrink-0 h-14 items-center justify-between border-b border-border/70 bg-background/90 backdrop-blur-md px-6 lg:px-8 z-20">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Live city</p>
              <p className="text-sm font-semibold text-foreground tracking-tight mt-0.5">Wallet · offers</p>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <CustomerNotificationMenu />
              <span className="text-xs flex items-center gap-2 text-foreground/80">
                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success)/0.5)]" />
                Live data
              </span>
            </div>
          </header>

          <main className="flex-1 min-h-0 md:overflow-y-auto md:overscroll-contain pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            <div className="mx-auto w-full max-w-3xl md:max-w-none lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl min-h-full px-0 sm:px-4 md:px-6 lg:px-8 xl:px-10 md:py-6 lg:py-8 pb-6">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile bottom nav only */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md pt-1 shadow-[0_-6px_24px_-10px_rgba(0,0,0,0.08)]"
          role="navigation"
          aria-label="Customer app sections"
        >
          <div className="mx-auto flex w-full max-w-3xl px-0 sm:px-2">
            <div className="flex w-full min-w-0 justify-between gap-0 px-0.5 sm:gap-1 sm:px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
              {tabs.map(({ to, icon, activeIcon, label, shortLabel, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-[48px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-[9px] font-medium leading-none tracking-tight transition-colors xs:text-[10px] sm:px-1.5 sm:text-[11px]',
                      'touch-manipulation [-webkit-tap-highlight-color:transparent]',
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                  title={label}
                >
                  {({ isActive }) => (
                    <>
                      <i
                        className={cn(
                          'bi text-[17px] xs:text-[18px] sm:text-[19px] leading-none',
                          isActive ? activeIcon : icon
                        )}
                        aria-hidden
                      />
                      <span className="max-w-full truncate text-center">
                        <span className="xs:hidden">{shortLabel}</span>
                        <span className="hidden xs:inline">{label}</span>
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </CustomerNotificationsProvider>
  );
};

export default CustomerLayout;
