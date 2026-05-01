import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getSession } from '@/lib/auth';
import { getCustomerCouponClaims, getOffers } from '@/lib/api';
import { useCustomerNotifications } from '@/contexts/CustomerNotificationsContext';
import type { CustomerNotificationItem } from '@/contexts/CustomerNotificationsContext';

const timeAgo = (t: number) => {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const CustomerNotificationMenu = () => {
  const navigate = useNavigate();
  const { items, unreadCount, markRead, markAllRead, dismiss } = useCustomerNotifications();
  const [open, setOpen] = useState(false);
  const [digest, setDigest] = useState<{ live: number; loading: boolean } | null>(null);

  useEffect(() => {
    if (!open) {
      setDigest(null);
      return;
    }
    let cancelled = false;
    setDigest({ live: 0, loading: true });
    void (async () => {
      try {
        const session = getSession();
        const [offers, history] = await Promise.all([
          getOffers(),
          session?._id || session?.email
            ? getCustomerCouponClaims({ customerId: session?._id, customerEmail: session?.email })
            : Promise.resolve({ claims: [], summary: { totalClaims: 0, redeemedClaims: 0, pendingClaims: 0 } }),
        ]);
        if (cancelled) return;
        const claimed = new Set(history.claims.map((c) => c.offerId));
        const live = offers.filter((o) => !claimed.has(o.id)).length;
        setDigest({ live, loading: false });
      } catch {
        if (!cancelled) setDigest({ live: 0, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onItemClick = (n: CustomerNotificationItem) => {
    markRead(n.id);
    if (n.href) navigate(n.href);
    setOpen(false);
  };

  const showActivityEmpty =
    items.length === 0 && digest !== null && !digest.loading && digest.live === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center transition text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        >
          <i className="bi bi-bell text-base" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground flex items-center justify-center tabular-nums leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(calc(100vw-1.5rem),20rem)] sm:w-80 p-0 z-[60]" sideOffset={8}>
        <div className="border-b border-border px-3 py-2.5 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Notifications</p>
          {items.some((x) => !x.read) && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-medium text-primary hover:underline shrink-0"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[min(70vh,22rem)] overflow-y-auto overscroll-contain">
          {digest?.loading && (
            <div className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <i className="bi bi-arrow-repeat animate-spin" /> Syncing your feed…
            </div>
          )}
          {digest !== null && !digest.loading && (
            <div className="px-3 py-3 border-b border-border bg-muted/40">
              <p className="text-xs font-medium text-foreground">Live feed</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {digest.live === 0
                  ? 'No unclaimed live offers right now.'
                  : `${digest.live} unclaimed offer${digest.live === 1 ? '' : 's'} available.`}
              </p>
              {digest.live > 0 && (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                  onClick={() => {
                    navigate('/app');
                    setOpen(false);
                  }}
                >
                  Open home feed
                </button>
              )}
            </div>
          )}

          {showActivityEmpty && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              <i className="bi bi-inbox text-xl opacity-40" />
              <p className="mt-2 font-medium text-foreground/80">You are all caught up</p>
              <p className="mt-1">Offer claims and alerts will appear here.</p>
            </div>
          )}

          {items.length > 0 && (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className="relative group">
                  <button
                    type="button"
                    className={cn(
                      'w-full text-left pl-3 pr-10 py-2.5 hover:bg-muted/60 transition',
                      !n.read && 'bg-primary-soft/25'
                    )}
                    onClick={() => onItemClick(n)}
                  >
                    <div className="flex gap-2">
                      <span
                        className={cn(
                          'mt-1.5 w-1.5 h-1.5 rounded-full shrink-0',
                          n.read ? 'bg-transparent' : 'bg-primary'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    className="absolute top-2 right-1.5 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground opacity-70 hover:opacity-100 hover:bg-secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dismiss(n.id);
                    }}
                  >
                    <i className="bi bi-x-lg text-xs" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
