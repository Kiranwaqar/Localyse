import { useEffect, useState } from 'react';
import { OfferCard } from '@/components/OfferCard';
import { Category, Offer } from '@/lib/domain';
import { getSession } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { claimOffer, getCustomerCouponClaims, getOffers } from '@/lib/api';

const filters: { id: Category | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'bi-grid' },
  { id: 'coffee', label: 'Coffee', icon: 'bi-cup-hot' },
  { id: 'food', label: 'Food', icon: 'bi-egg-fried' },
  { id: 'retail', label: 'Retail', icon: 'bi-bag' },
  { id: 'gym', label: 'Fitness', icon: 'bi-activity' },
];

const Home = () => {
  const session = getSession();
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [liveOffers, setLiveOffers] = useState<Offer[]>([]);
  const [insight, setInsight] = useState('Loading AI city context from Localyse...');
  const [loading, setLoading] = useState(true);
  const [claimedCount, setClaimedCount] = useState(0);
  const offers = filter === 'all' ? liveOffers : liveOffers.filter((o) => o.category === filter);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const [result, history] = await Promise.all([
          getOffers(),
          session?._id || session?.email
            ? getCustomerCouponClaims({ customerId: session?._id, customerEmail: session?.email })
            : Promise.resolve({ claims: [], summary: { totalClaims: 0, redeemedClaims: 0, pendingClaims: 0 } }),
        ]);
        const claimedOfferIds = new Set(history.claims.map((claim) => claim.offerId));
        const unclaimedOffers = result.filter((offer) => !claimedOfferIds.has(offer.id));

        setLiveOffers(unclaimedOffers);
        setClaimedCount(history.summary.totalClaims);
        setInsight(unclaimedOffers.length > 0 ? 'Showing live offers from MongoDB.' : 'No unclaimed live offers are available yet.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load live offers.';
        setInsight(message);
        toast.error('Could not load live offers', { description: message });
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, [session?._id, session?.email]);

  const onClaimOffer = async (offer: Offer) => {
    try {
      const result = await claimOffer(offer.id, {
        customerId: session?._id,
        customerName: session?.name,
        customerEmail: session?.email,
      });

      setLiveOffers((current) => current.filter((item) => item.id !== offer.id));
      setClaimedCount((count) => count + (result.alreadyClaimed ? 0 : 1));
      toast.success(`Offer claimed at ${offer.merchantName}`, {
        description: result.walletImpact
          ? `Coupon code: ${result.couponCode} · ${result.walletImpact.message}`
          : `Coupon code: ${result.couponCode}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not claim this offer.';
      toast.error('Claim failed', { description: message });
    }
  };

  return (
    <div className="px-3 xs:px-4 sm:px-5 pt-4 sm:pt-5 space-y-5 sm:space-y-6">
      {/* Greeting */}
      <section className="animate-fade-up">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Good afternoon</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
          Hello, {session?.name?.split(' ')[0] || 'there'}.
        </h1>
      </section>

      {/* AI insight banner */}
      <div className="bg-card border border-border rounded-2xl p-3.5 xs:p-4 flex items-start gap-3 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-warning-soft rounded-full -mr-10 -mt-10 opacity-70 pointer-events-none" />
        <div className="w-10 h-10 rounded-xl bg-lavender text-lavender-foreground flex items-center justify-center shrink-0 relative">
          <i className="bi bi-stars text-base" />
        </div>
        <div className="flex-1 min-w-0 relative">
          <p className="text-sm font-medium leading-snug">
            {loading ? 'Generating AI offers...' : `${offers.length} live offers match your context`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {insight}
          </p>
        </div>
        <i className="bi bi-chevron-right text-muted-foreground text-xs mt-1 relative" />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Live', value: liveOffers.length.toString(), icon: 'bi-broadcast' },
          { label: 'Claims', value: claimedCount.toString(), icon: 'bi-receipt' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3">
            <i className={`bi ${s.icon} text-muted-foreground text-sm`} />
            <p className="text-[15px] font-semibold mt-1.5 tracking-tight">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto -mx-3 xs:-mx-4 sm:-mx-5 px-3 xs:px-4 sm:px-5 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'whitespace-nowrap text-xs font-medium px-3.5 h-9 rounded-full border transition flex items-center gap-1.5',
              filter === f.id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-foreground border-border hover:border-foreground/30'
            )}
          >
            <i className={`bi ${f.icon} text-[12px]`} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">For you</h2>
          <span className="text-xs text-muted-foreground">{offers.length} live</span>
        </div>
        {offers.map((o) => (
          <OfferCard key={o.id} {...o} onClaim={() => onClaimOffer(o)} />
        ))}
        {!loading && offers.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <i className="bi bi-broadcast text-2xl text-muted-foreground" />
            <p className="text-sm font-medium mt-3">No live offers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Offers will appear here when real merchants publish or generate them.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
