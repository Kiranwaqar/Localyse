import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSession } from '@/lib/auth';
import { deleteOffer, getOffers } from '@/lib/api';
import type { Offer } from '@/lib/domain';
import { toast } from 'sonner';
import { formatPkr } from '@/lib/currency';

const money = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? formatPkr(value) : 'Price unavailable';

const Dashboard = () => {
  const session = getSession();
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);

  useEffect(() => {
    getOffers()
      .then((offers) => {
        const merchantOffers = session?._id
          ? offers.filter((offer) => !offer.merchantId || offer.merchantId === session._id)
          : offers;

        setActiveOffers(merchantOffers);
      })
      .catch(() => setActiveOffers([]))
      .finally(() => setLoading(false));
  }, [session?._id]);

  const expectedCustomers = activeOffers.reduce(
    (sum, offer) => sum + (offer.expectedCustomerVolume || 0),
    0
  );
  const stats = [
    { icon: 'bi-broadcast', label: 'Live offers', value: activeOffers.length.toString() },
    { icon: 'bi-people', label: 'Expected customers', value: expectedCustomers.toString() },
    { icon: 'bi-shop', label: 'Storefront', value: session?.name || 'Not set' },
  ];

  const onDeleteOffer = async (offerId: string) => {
    if (!session?._id) {
      toast.error('Please sign in again before deleting an offer.');
      return;
    }

    setDeletingOfferId(offerId);

    try {
      await deleteOffer(offerId, session._id);
      setActiveOffers((offers) => offers.filter((offer) => offer.id !== offerId));
      toast.success('Offer deleted from MongoDB.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete this offer.';
      toast.error('Delete failed', { description: message });
    } finally {
      setDeletingOfferId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto p-3 xs:p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Dashboard</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
            Welcome back, {session?.name?.split(' ')[0] || 'there'}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Here's what's happening at your storefront today.</p>
        </div>
        <Link
          to="/merchant/create"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl min-h-11 px-5 py-2 text-sm font-medium hover:bg-[hsl(var(--primary-hover))] transition active:scale-[0.99]"
        >
          <i className="bi bi-plus-lg" /> New AI offer
        </Link>
      </header>

      {/* AI insight */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-lavender-soft rounded-full -mr-16 -mt-16 opacity-60 pointer-events-none" />
        <div className="w-11 h-11 rounded-xl bg-lavender text-lavender-foreground flex items-center justify-center shrink-0 relative">
          <i className="bi bi-stars text-lg" />
        </div>
        <div className="flex-1 min-w-0 relative">
          <p className="text-[10px] uppercase tracking-wider text-lavender mb-1 font-semibold">AI insight</p>
          <p className="text-base sm:text-lg font-semibold tracking-tight">
            {activeOffers.length > 0 ? 'AI offers are live from MongoDB.' : 'No live offers yet.'}
          </p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Generate offers after adding real merchants so this dashboard reflects production data only.
          </p>
        </div>
        <button className="text-xs font-medium text-primary items-center gap-1 shrink-0 hidden sm:inline-flex relative">
          Activate <i className="bi bi-arrow-up-right" />
        </button>
      </div>

      {/* Stats grid */}
      <section className="grid sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <i className={`bi ${s.icon} text-muted-foreground text-base`} />
            </div>
            <p className="text-xl sm:text-2xl font-semibold tracking-tight tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Active offers */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight">Active offers</h2>
          <Link to="/merchant/analytics" className="text-xs text-primary font-medium inline-flex items-center gap-1">
            View all <i className="bi bi-arrow-right text-[10px]" />
          </Link>
        </div>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {loading ? (
            <div className="p-5 text-sm text-muted-foreground">Loading offers from MongoDB...</div>
          ) : activeOffers.length === 0 ? (
            <div className="p-8 text-center">
              <i className="bi bi-broadcast text-2xl text-muted-foreground" />
              <p className="text-sm font-medium mt-3">No active offers</p>
              <p className="text-xs text-muted-foreground mt-1">Create real merchants and generate offers to populate this list.</p>
            </div>
          ) : (
            activeOffers.map((offer) => (
              <div key={offer.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                <div className="w-full min-w-0 sm:flex-1">
                  <p className="text-sm font-medium">{offer.offerText}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{offer.merchantName}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-secondary px-2 py-1 text-muted-foreground">
                      Actual price: <span className="font-semibold text-foreground">{money(offer.originalPrice)}</span>
                    </span>
                    <span className="rounded-full bg-success-soft px-2 py-1 text-success">
                      Offer price: <span className="font-semibold">{money(offer.offerPrice)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1.5 bg-success-soft text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Live
                  </span>
                  <button
                    onClick={() => onDeleteOffer(offer.id)}
                    disabled={deletingOfferId === offer.id}
                    className="h-8 px-3 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive hover:text-destructive-foreground transition disabled:opacity-60"
                  >
                    {deletingOfferId === offer.id ? (
                      <span className="inline-flex items-center gap-1">
                        <i className="bi bi-arrow-repeat animate-spin" /> Deleting
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <i className="bi bi-trash3" /> Delete
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
