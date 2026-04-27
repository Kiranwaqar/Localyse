import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCouponClaims, redeemCouponClaim } from '@/lib/api';
import { getSession } from '@/lib/auth';
import type { CouponClaim, CouponClaimsResponse } from '@/lib/domain';
import { formatPkrInteger } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const norm = (s: string | undefined | null) => String(s || '').toLowerCase().trim();

const claimMatchesQuery = (claim: CouponClaim, q: string) => {
  if (!q) return true;
  const hay = [
    claim.couponCode,
    claim.customerName,
    claim.customerEmail,
    claim.offerText,
    claim.targetItem,
    claim.category,
    claim.offerId,
    claim.merchantEmail,
  ]
    .map(norm)
    .join(' ');

  return q.split(/\s+/).every((word) => word.length === 0 || hay.includes(word));
};

const CouponClaims = () => {
  const session = getSession();
  const [records, setRecords] = useState<CouponClaimsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadClaims = useCallback(async (showLoader = true) => {
    if (!session?._id) {
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const result = await getCouponClaims(session._id);
      setRecords(result);
    } catch {
      setRecords(null);
    } finally {
      setLoading(false);
    }
  }, [session?._id]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  useEffect(() => {
    const onFocus = () => loadClaims(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadClaims]);

  useEffect(() => {
    const intervalId = window.setInterval(() => loadClaims(false), 5000);
    return () => window.clearInterval(intervalId);
  }, [loadClaims]);

  const onRedeem = async (claim: CouponClaim) => {
    if (!session?._id) {
      toast.error('Please sign in again before redeeming a coupon.');
      return;
    }

    setRedeemingId(claim.id);

    try {
      const response = await redeemCouponClaim(claim.id, session._id);
      setRecords((current) => {
        if (!current) return current;
        return {
          summary: {
            totalClaims: current.summary.totalClaims,
            redeemedClaims: current.summary.redeemedClaims + (claim.redeemedAt ? 0 : 1),
            pendingClaims: Math.max(0, current.summary.pendingClaims - (claim.redeemedAt ? 0 : 1)),
          },
          claims: current.claims.map((item) =>
            item.id === claim.id ? { ...item, status: 'redeemed' as const, redeemedAt: response.redeemedAt } : item
          ),
        };
      });
      toast.success('Coupon redeemed', {
        description: response.walletImpact
          ? `${claim.couponCode} is now marked as used. ${response.walletImpact.message}`
          : `${claim.couponCode} is now marked as used.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to redeem this coupon.';
      toast.error('Redeem failed', { description: message });
    } finally {
      setRedeemingId(null);
    }
  };

  const summary = records?.summary;
  const claims = records?.claims || [];
  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => claims.filter((c) => claimMatchesQuery(c, query)), [claims, query]);

  const stats = [
    { label: 'Total claims', value: summary?.totalClaims || 0, icon: 'bi-ticket-perforated' },
    { label: 'Waiting to redeem', value: summary?.pendingClaims || 0, icon: 'bi-hourglass-heart' },
    { label: 'Redeemed', value: summary?.redeemedClaims || 0, icon: 'bi-patch-check' },
  ];

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto p-3 xs:p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <header className="relative overflow-hidden rounded-3xl border border-[#f5c7dc] bg-[#fff4fb] p-4 xs:p-5 sm:p-8 shadow-sm">
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#ffd6e9]" />
        <div className="absolute right-16 bottom-4 h-16 w-16 rounded-full bg-[#e9ddff]" />
        <div className="relative max-w-2xl">
          <p className="text-xs uppercase tracking-wider text-[#b35f88] mb-2 font-semibold">Coupon records</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Claimed offers</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            One row per claim—search by code, customer, offer, or item.
          </p>
        </div>
        <button
          onClick={() => loadClaims()}
          className="relative mt-5 inline-flex min-h-10 w-full xs:w-auto items-center justify-center gap-2 rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-[#b35f88] ring-1 ring-[#f5c7dc] transition hover:bg-white"
        >
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#fde7f3] text-[#b35f88]">
              <i className={`bi ${stat.icon}`} />
            </div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight">Customer coupons</h2>
          <span className="rounded-full bg-[#fff4fb] px-3 py-1 text-xs font-medium text-[#b35f88] tabular-nums w-fit">
            {query ? (
              <>
                {filtered.length} of {claims.length} shown
              </>
            ) : (
              <>{claims.length} total</>
            )}
          </span>
        </div>

        {claims.length > 0 && (
          <div className="relative">
            <i className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, name, email, offer, item…"
              className="w-full min-h-11 rounded-2xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#b35f88]/30"
              aria-label="Filter coupon claims"
            />
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading coupon records…
          </div>
        ) : claims.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#f5c7dc] bg-[#fffafd] p-6 xs:p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fde7f3] text-[#b35f88]">
              <i className="bi bi-envelope-heart text-2xl" />
            </div>
            <p className="text-sm font-semibold mt-4">No coupon claims yet</p>
            <p className="text-xs text-muted-foreground mt-1">When a customer claims an offer, it appears here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No claims match &quot;{search.trim()}&quot;. Try a different search.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-3 font-semibold w-[120px]">Code</th>
                    <th className="px-3 py-3 font-semibold min-w-[160px]">Customer</th>
                    <th className="px-3 py-3 font-semibold min-w-[200px]">Offer</th>
                    <th className="px-3 py-3 font-semibold w-[100px]">Item</th>
                    <th className="px-3 py-3 font-semibold w-[72px]">%</th>
                    <th className="px-3 py-3 font-semibold w-[100px]">Est. (PKR)</th>
                    <th className="px-3 py-3 font-semibold w-[110px]">Claimed</th>
                    <th className="px-3 py-3 font-semibold w-[110px]">Redeemed</th>
                    <th className="px-3 py-3 font-semibold w-[100px]">Status</th>
                    <th className="px-3 py-3 font-semibold w-[120px] text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((claim) => (
                    <tr
                      key={claim.id}
                      className={cn(
                        'border-b border-border/80 last:border-0 align-top transition-colors',
                        claim.redeemedAt ? 'bg-success-soft/15' : 'hover:bg-muted/30'
                      )}
                    >
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs font-bold tracking-wider text-[#b35f88] break-all">
                          {claim.couponCode}
                        </span>
                      </td>
                      <td className="px-3 py-3 min-w-0">
                        <p className="font-medium text-foreground leading-tight">{claim.customerName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 break-all line-clamp-2">
                          {claim.customerEmail}
                        </p>
                      </td>
                      <td className="px-3 py-3 min-w-0 max-w-[280px]">
                        <p className="text-foreground leading-snug line-clamp-2" title={claim.offerText}>
                          {claim.offerText}
                        </p>
                        {claim.category ? (
                          <p className="text-[10px] text-muted-foreground mt-1 capitalize">{claim.category}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {claim.targetItem ? (
                          <span className="line-clamp-2" title={claim.targetItem}>
                            {claim.targetItem}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {claim.discountPercentage != null ? `${claim.discountPercentage}%` : '—'}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-foreground text-xs">
                        {formatPkrInteger(claim.estimatedRevenue || 0)}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(claim.claimedAt)}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(claim.redeemedAt)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            claim.redeemedAt ? 'bg-success/15 text-success' : 'bg-[#fde7f3] text-[#b35f88]'
                          )}
                        >
                          {claim.redeemedAt ? 'Done' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-3 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => onRedeem(claim)}
                          disabled={Boolean(claim.redeemedAt) || redeemingId === claim.id}
                          className={cn(
                            'inline-flex min-h-9 min-w-[96px] items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition',
                            claim.redeemedAt
                              ? 'bg-success-soft text-success cursor-default'
                              : 'bg-[#b35f88] text-white hover:bg-[#984b72] disabled:opacity-70'
                          )}
                        >
                          {redeemingId === claim.id ? (
                            <>
                              <i className="bi bi-arrow-repeat animate-spin" />
                              <span>…</span>
                            </>
                          ) : claim.redeemedAt ? (
                            <>
                              <i className="bi bi-check2-circle" />
                              <span>Redeemed</span>
                            </>
                          ) : (
                            <>
                              <i className="bi bi-ticket-perforated" />
                              <span>Redeem</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CouponClaims;
