import { useEffect, useState } from 'react';
import { getOfferAnalytics } from '@/lib/api';
import { getSession } from '@/lib/auth';
import type { OfferAnalytics } from '@/lib/domain';

const formatMoney = (value: number) =>
  `$${Math.round(value || 0).toLocaleString()}`;

const formatClaimTime = (minutes: number) => {
  if (!minutes) return 'No claims yet';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

const Analytics = () => {
  const session = getSession();
  const [analytics, setAnalytics] = useState<OfferAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOfferAnalytics(session?._id)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [session?._id]);

  const summary = analytics?.summary;

  const stats = [
    { label: 'Offers published', value: summary?.publishedCount.toString() || '0', icon: 'bi-broadcast' },
    { label: 'Offers claimed', value: summary?.claimedCount.toString() || '0', icon: 'bi-receipt' },
    { label: 'Claim rate', value: `${summary?.claimRate || 0}%`, icon: 'bi-percent' },
    { label: 'Avg time to claim', value: formatClaimTime(summary?.averageTimeToClaimMinutes || 0), icon: 'bi-stopwatch' },
    { label: 'Expired unclaimed', value: summary?.expiredUnclaimedCount.toString() || '0', icon: 'bi-hourglass-split' },
    { label: 'Revenue attributed', value: formatMoney(summary?.revenueAttributed || 0), icon: 'bi-cash-coin' },
  ];

  return (
    <div className="w-full max-w-6xl p-3 xs:p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Insights</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Offer performance</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Claims, redemptions, timing, expired offers, and estimated revenue impact.
          </p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <i className={`bi ${s.icon} text-muted-foreground text-base`} />
            </div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl sm:text-3xl font-semibold mt-1.5 tracking-tight tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="bg-card border border-border rounded-2xl p-5 sm:p-7 shadow-xs">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading analytics from backend...</p>
        ) : !analytics || summary?.publishedCount === 0 ? (
          <div className="text-center py-10">
            <i className="bi bi-bar-chart text-3xl text-muted-foreground" />
            <p className="text-sm font-medium mt-3">No analytics yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Analytics will appear when offers are generated and customers start claiming them.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
            <InsightPanel
              icon="bi-trophy"
              title="Most redeemed offer"
              value={analytics.topOffer ? `${analytics.topOffer.claimCount} claims` : 'No claims yet'}
              body={analytics.topOffer?.offerText || 'No offer has been claimed yet.'}
            />
            <InsightPanel
              icon="bi-graph-up-arrow"
              title="Estimated revenue uplift"
              value={formatMoney(summary?.estimatedUplift || 0)}
              body={`Attributed revenue ${formatMoney(summary?.revenueAttributed || 0)} vs baseline day ${formatMoney(summary?.baselineDayRevenue || 0)}.`}
            />

            <div className="lg:col-span-2 space-y-3">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Offer-level performance</h2>
                <span className="text-xs text-muted-foreground">{analytics.offers.length} offers</span>
              </div>
              {analytics.offers.map((offer) => (
                <div key={offer.id} className="rounded-2xl border border-border p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                  <div className="w-full min-w-0 sm:flex-1">
                    <p className="text-sm font-medium">{offer.offerText}</p>
                    <p className="text-xs text-muted-foreground mt-1">{offer.merchantName}</p>
                  </div>
                  <Metric label="Claims" value={offer.claimCount.toString()} />
                  <Metric label="Expected" value={offer.expectedCustomerVolume.toString()} />
                  <Metric label="Revenue" value={formatMoney(offer.revenueAttributed)} />
                </div>
              ))}
            </div>

            {analytics.expiredUnclaimed.length > 0 && (
              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-sm font-semibold">Expired unclaimed offers</h2>
                {analytics.expiredUnclaimed.map((offer) => (
                  <div key={offer.id} className="rounded-2xl border border-warning/30 bg-warning-soft/20 p-4">
                    <p className="text-sm font-medium">{offer.offerText}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{offer.aiReason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

const InsightPanel = ({
  icon,
  title,
  value,
  body,
}: {
  icon: string;
  title: string;
  value: string;
  body: string;
}) => (
  <div className="rounded-2xl border border-border bg-secondary/30 p-5">
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <i className={`bi ${icon} text-muted-foreground`} />
    </div>
    <p className="text-xl font-semibold tracking-tight">{value}</p>
    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{body}</p>
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="w-full xs:w-auto min-w-[86px] rounded-xl bg-secondary/60 px-3 py-2 xs:text-right">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold tabular-nums mt-0.5">{value}</p>
  </div>
);

export default Analytics;
