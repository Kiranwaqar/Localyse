import { useCallback, useEffect, useState } from 'react';
import { getCouponClaims, redeemCouponClaim } from '@/lib/api';
import { getSession } from '@/lib/auth';
import type { CouponClaim, CouponClaimsResponse } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not yet';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const Detail = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="min-w-0 rounded-xl bg-secondary/50 px-3 py-2">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={cn('mt-1 break-all font-medium capitalize text-foreground', mono && 'font-mono normal-case')}>
      {value}
    </p>
  </div>
);

const CouponClaims = () => {
  const session = getSession();
  const [records, setRecords] = useState<CouponClaimsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

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
            item.id === claim.id ? { ...item, status: 'redeemed', redeemedAt: response.redeemedAt } : item
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
  const stats = [
    { label: 'Total claims', value: summary?.totalClaims || 0, icon: 'bi-ticket-perforated' },
    { label: 'Waiting to redeem', value: summary?.pendingClaims || 0, icon: 'bi-hourglass-heart' },
    { label: 'Redeemed', value: summary?.redeemedClaims || 0, icon: 'bi-patch-check' },
  ];

  return (
    <div className="w-full max-w-6xl p-3 xs:p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <header className="relative overflow-hidden rounded-3xl border border-[#f5c7dc] bg-[#fff4fb] p-4 xs:p-5 sm:p-8 shadow-sm">
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#ffd6e9]" />
        <div className="absolute right-16 bottom-4 h-16 w-16 rounded-full bg-[#e9ddff]" />
        <div className="relative max-w-2xl">
          <p className="text-xs uppercase tracking-wider text-[#b35f88] mb-2 font-semibold">Coupon records</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
            Claimed offers, cute and organized.
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Every customer who claims one of your offers appears here with their email, coupon code, and redemption status.
          </p>
        </div>
        <button
          onClick={() => loadClaims()}
          className="relative mt-5 inline-flex min-h-10 w-full xs:w-auto items-center justify-center gap-2 rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-[#b35f88] ring-1 ring-[#f5c7dc] transition hover:bg-white"
        >
          <i className="bi bi-arrow-clockwise" /> Refresh records
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight">Customer coupon list</h2>
          <span className="rounded-full bg-[#fff4fb] px-3 py-1 text-xs font-medium text-[#b35f88]">
            {claims.length} records
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading coupon records from MongoDB...
          </div>
        ) : claims.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#f5c7dc] bg-[#fffafd] p-6 xs:p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fde7f3] text-[#b35f88]">
              <i className="bi bi-envelope-heart text-2xl" />
            </div>
            <p className="text-sm font-semibold mt-4">No coupon claims yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              When a customer clicks Claim offer, their coupon record will bloom here.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {claims.map((claim) => (
              <article
                key={claim.id}
                className={cn(
                  'relative overflow-hidden rounded-3xl border p-4 sm:p-5 shadow-sm transition',
                  claim.redeemedAt
                    ? 'border-success/30 bg-success-soft/20'
                    : 'border-[#f5c7dc] bg-gradient-to-br from-[#fffafd] via-white to-[#f6efff]'
                )}
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#fde7f3]/80" />
                <div className="relative space-y-4">
                  <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Coupon code</p>
                      <p className="mt-1 font-mono text-xl xs:text-2xl font-bold tracking-widest text-[#b35f88] break-all">
                        {claim.couponCode}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'w-fit rounded-full px-3 py-1 text-[11px] font-semibold',
                        claim.redeemedAt ? 'bg-success text-success-foreground' : 'bg-[#fde7f3] text-[#b35f88]'
                      )}
                    >
                      {claim.redeemedAt ? 'Redeemed' : 'Ready to redeem'}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-border/60">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fde7f3] text-sm font-bold text-[#b35f88]">
                        {(claim.customerName || 'C')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{claim.customerName}</p>
                        <p className="text-xs text-muted-foreground mt-1 break-all">{claim.customerEmail}</p>
                        {claim.customerId && (
                          <p className="text-[10px] text-muted-foreground mt-1 break-all">User ID: {claim.customerId}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium leading-relaxed">{claim.offerText}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {claim.targetItem && (
                        <span className="rounded-full bg-secondary px-2 py-1">Item: {claim.targetItem}</span>
                      )}
                      {claim.discountPercentage ? (
                        <span className="rounded-full bg-secondary px-2 py-1">{claim.discountPercentage}% off</span>
                      ) : null}
                      <span className="rounded-full bg-secondary px-2 py-1">
                        Claimed {formatDateTime(claim.claimedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-2xl bg-white/70 p-4 text-xs ring-1 ring-border/60 sm:grid-cols-2">
                    <Detail label="Merchant" value={claim.merchantName} />
                    <Detail label="Merchant email" value={claim.merchantEmail || 'Not saved'} />
                    <Detail label="Offer ID" value={claim.offerId} mono />
                    <Detail label="Category" value={claim.category || 'Not saved'} />
                    <Detail label="Status" value={claim.status} />
                    <Detail label="Offer expires" value={formatDateTime(claim.expiresAt)} />
                    <Detail label="Claimed date" value={formatDateTime(claim.claimedAt)} />
                    <Detail label="Redeemed date" value={formatDateTime(claim.redeemedAt)} />
                    <Detail label="Est. revenue" value={`$${Math.round(claim.estimatedRevenue || 0).toLocaleString()}`} />
                  </div>

                  <div className="flex flex-col xs:flex-row xs:flex-wrap xs:items-center xs:justify-between gap-3 border-t border-border/70 pt-4">
                    <p className="text-xs text-muted-foreground">
                      {claim.redeemedAt ? `Redeemed ${formatDateTime(claim.redeemedAt)}` : 'Ask the customer for this code at checkout.'}
                    </p>
                    <button
                      onClick={() => onRedeem(claim)}
                      disabled={Boolean(claim.redeemedAt) || redeemingId === claim.id}
                      className={cn(
                        'inline-flex min-h-10 w-full xs:w-auto items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-default disabled:opacity-70',
                        claim.redeemedAt
                          ? 'bg-success-soft text-success'
                          : 'bg-[#b35f88] text-white hover:bg-[#984b72]'
                      )}
                    >
                      {redeemingId === claim.id ? (
                        <>
                          <i className="bi bi-arrow-repeat animate-spin" /> Redeeming
                        </>
                      ) : claim.redeemedAt ? (
                        <>
                          <i className="bi bi-check2-circle" /> Redeemed
                        </>
                      ) : (
                        <>
                          <i className="bi bi-magic" /> Redeem
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CouponClaims;
