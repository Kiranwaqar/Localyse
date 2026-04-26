import { useEffect, useState } from 'react';
import { getCustomerCouponClaims } from '@/lib/api';
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

const formatDollars = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value || 0);

const getSavingsEstimate = (claim: CouponClaim) => {
  const estimatedOriginalValue = Number(claim.estimatedRevenue || 0);
  const discountRate = Number(claim.discountPercentage || 0) / 100;

  if (estimatedOriginalValue <= 0 || discountRate <= 0) return 0;

  return estimatedOriginalValue * discountRate;
};

const Redeemed = () => {
  const session = getSession();
  const [history, setHistory] = useState<CouponClaimsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?._id && !session?.email) {
      setLoading(false);
      return;
    }

    getCustomerCouponClaims({
      customerId: session?._id,
      customerEmail: session?.email,
    })
      .then(setHistory)
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Could not load your offer history.';
        toast.error('History unavailable', { description: message });
        setHistory(null);
      })
      .finally(() => setLoading(false));
  }, [session?._id, session?.email]);

  const claims = history?.claims || [];
  const redeemed = claims.filter((claim) => claim.status === 'redeemed');
  const lifetimeSavings = redeemed.reduce((sum, claim) => sum + getSavingsEstimate(claim), 0);

  return (
    <div className="px-3 xs:px-4 sm:px-5 pt-4 sm:pt-5 space-y-5">
      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Receipts</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Your history</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Claimed coupons and redeemed offers from your Localyse account.
        </p>
      </section>

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <i className="bi bi-graph-up-arrow text-success" /> Lifetime savings
        </div>
        <p className="text-2xl xs:text-3xl sm:text-4xl font-semibold tracking-tight break-words">
          <span className="tabular-nums">{formatDollars(lifetimeSavings)}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          Based on redeemed offer discounts from your dollar finance data. {redeemed.length} redeemed, {history?.summary.pendingClaims || 0} waiting to redeem
        </p>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
          Loading your claimed offers...
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 xs:p-10 text-center">
          <i className="bi bi-receipt text-3xl text-muted-foreground" />
          <p className="text-sm font-medium mt-3">No offer history yet</p>
          <p className="text-xs text-muted-foreground mt-1">Claim an offer to see its coupon and redemption status here.</p>
        </div>
      ) : (
        <section className="space-y-3">
          {claims.map((claim) => (
            <article key={claim.id} className="bg-card border border-border rounded-2xl p-4 shadow-xs">
              <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{claim.offerText}</p>
                  <p className="text-xs text-muted-foreground mt-1">{claim.merchantName}</p>
                </div>
                <span
                  className={cn(
                    'w-fit shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize',
                    claim.status === 'redeemed' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                  )}
                >
                  {claim.status}
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-secondary/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Coupon code</p>
                <p className="font-mono text-base xs:text-lg font-bold tracking-widest text-primary mt-1 break-all">{claim.couponCode}</p>
              </div>
              <div className="mt-3 grid grid-cols-1 xs:grid-cols-2 gap-2">
                <Metric label="Discount" value={`${claim.discountPercentage || 0}%`} />
                <Metric
                  label={claim.status === 'redeemed' ? 'Saved' : 'Potential save'}
                  value={formatDollars(getSavingsEstimate(claim))}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Claimed {formatDateTime(claim.claimedAt)}</span>
                <span className="xs:text-right">Redeemed {formatDateTime(claim.redeemedAt)}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-secondary/50 px-3 py-2">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold mt-0.5">{value}</p>
  </div>
);

export default Redeemed;
