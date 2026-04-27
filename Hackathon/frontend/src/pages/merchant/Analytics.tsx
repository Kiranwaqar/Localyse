import { useEffect, useMemo, useState } from 'react';
import { getOfferAnalytics } from '@/lib/api';
import { formatPkrInteger } from '@/lib/currency';
import { getSession } from '@/lib/auth';
import type { OfferAnalytics } from '@/lib/domain';

const formatMoney = (value: number) => formatPkrInteger(value);

const formatClaimTime = (minutes: number) => {
  if (!minutes) return 'No claims yet';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

const norm = (s: string | undefined | null) => String(s || '').toLowerCase().trim();

const matchesOfferSearch = (
  offer: OfferAnalytics['offers'][number],
  q: string
) => {
  if (!q) return true;
  const hay = [
    offer.id,
    offer.offerText,
    offer.merchantName,
    String(offer.claimCount),
    String(offer.expectedCustomerVolume),
    String(offer.revenueAttributed),
    offer.createdAt,
    offer.expiresAt,
  ]
    .map(norm)
    .join(' ');
  return q.split(/\s+/).every((word) => word.length === 0 || hay.includes(word));
};

const matchesExpiredSearch = (
  row: OfferAnalytics['expiredUnclaimed'][number],
  q: string
) => {
  if (!q) return true;
  const hay = [row.id, row.offerText, row.targetItem, row.aiReason, row.expiredAt].map(norm).join(' ');
  return q.split(/\s+/).every((word) => word.length === 0 || hay.includes(word));
};

const Analytics = () => {
  const session = getSession();
  const [analytics, setAnalytics] = useState<OfferAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getOfferAnalytics(session?._id)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [session?._id]);

  const summary = analytics?.summary;
  const query = search.trim().toLowerCase();
  const filteredOffers = useMemo(() => {
    if (!analytics?.offers) return [];
    return analytics.offers.filter((o) => matchesOfferSearch(o, query));
  }, [analytics?.offers, query]);
  const filteredExpired = useMemo(() => {
    if (!analytics?.expiredUnclaimed) return [];
    return analytics.expiredUnclaimed.filter((o) => matchesExpiredSearch(o, query));
  }, [analytics?.expiredUnclaimed, query]);

  const stats = [
    { label: 'Offers published', value: summary?.publishedCount.toString() || '0', icon: 'bi-broadcast' },
    { label: 'Offers claimed', value: summary?.claimedCount.toString() || '0', icon: 'bi-receipt' },
    { label: 'Claim rate', value: `${summary?.claimRate || 0}%`, icon: 'bi-percent' },
    { label: 'Avg time to claim', value: formatClaimTime(summary?.averageTimeToClaimMinutes || 0), icon: 'bi-stopwatch' },
    { label: 'Expired unclaimed', value: summary?.expiredUnclaimedCount.toString() || '0', icon: 'bi-hourglass-split' },
    { label: 'Revenue attributed', value: formatMoney(summary?.revenueAttributed || 0), icon: 'bi-cash-coin' },
  ];

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto p-3 xs:p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Insights</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Offer performance</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Claims, redemptions, timing, expired offers, and estimated revenue impact.
          </p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 min-w-0">
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
          <div className="grid md:grid-cols-2 gap-4 sm:gap-5 min-w-0">
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
              body={
                summary?.upliftIsComparable === false
                  ? 'Upload a finance sheet when generating offers so we can use your average PKR per customer as the baseline. Uplift compares actual paid on redemptions to that counterfactual.'
                  : `Actual paid on ${summary?.redeemCount ?? 0} redemptions: ${formatMoney(
                      summary?.revenueAttributed || 0
                    )}. Counterfactual: ${formatMoney(
                      summary?.counterfactualRevenue || 0
                    )} (${summary?.redeemCount ?? 0} × ~${formatMoney(
                      summary?.baselineAveragePerCustomer || 0
                    )} avg from your data). Reference: ~${formatMoney(
                      summary?.baselineDayRevenue || 0
                    )} mean day revenue.`
              }
            />

            <div className="md:col-span-2 space-y-3 min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold">Offer-level performance</h2>
                <span className="text-xs text-muted-foreground tabular-nums w-fit">
                  {query ? (
                    <>
                      {filteredOffers.length} of {analytics.offers.length} offers
                    </>
                  ) : (
                    <>{analytics.offers.length} offers</>
                  )}
                </span>
              </div>
              {analytics.offers.length > 0 && (
                <div className="relative">
                  <i className="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter by offer, merchant, claims, revenue, dates…"
                    className="w-full min-h-10 rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    aria-label="Filter analytics offers"
                  />
                </div>
              )}
              {filteredOffers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center rounded-2xl border border-dashed border-border">
                  No offers match &quot;{search.trim()}&quot;.
                </p>
              ) : (
                filteredOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="rounded-2xl border border-border p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3"
                  >
                    <div className="w-full min-w-0 sm:flex-1">
                      <p className="text-sm font-medium">{offer.offerText}</p>
                      <p className="text-xs text-muted-foreground mt-1">{offer.merchantName}</p>
                    </div>
                    <Metric label="Claims" value={offer.claimCount.toString()} />
                    <Metric label="Expected" value={offer.expectedCustomerVolume.toString()} />
                    <Metric label="Revenue" value={formatMoney(offer.revenueAttributed)} />
                  </div>
                ))
              )}
            </div>

            {analytics.expiredUnclaimed.length > 0 && (
              <div className="md:col-span-2 space-y-3 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h2 className="text-sm font-semibold">Expired unclaimed offers</h2>
                  {query && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {filteredExpired.length} of {analytics.expiredUnclaimed.length} shown
                    </span>
                  )}
                </div>
                {filteredExpired.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3 text-center rounded-2xl border border-dashed border-border">
                    No expired offers match this search.
                  </p>
                ) : (
                  filteredExpired.map((offer) => (
                    <div key={offer.id} className="rounded-2xl border border-warning/30 bg-warning-soft/20 p-4">
                      <p className="text-sm font-medium">{offer.offerText}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{offer.aiReason}</p>
                    </div>
                  ))
                )}
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
