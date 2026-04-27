import { useEffect, useMemo, useState } from 'react';
import {
  getWallet,
  getWalletRecommendations,
  updateWallet,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import type {
  BudgetRecommendation,
  WalletCategory,
  WalletRecommendationsResponse,
  WalletResponse,
} from '@/lib/domain';
import { formatPkr } from '@/lib/currency';
import { toast } from 'sonner';

const categories: { id: WalletCategory; label: string; icon: string }[] = [
  { id: 'food', label: 'Food', icon: 'bi-egg-fried' },
  { id: 'transport', label: 'Transport', icon: 'bi-bus-front' },
  { id: 'shopping', label: 'Shopping', icon: 'bi-bag' },
  { id: 'entertainment', label: 'Entertainment', icon: 'bi-ticket-perforated' },
  { id: 'bills', label: 'Bills', icon: 'bi-receipt' },
  { id: 'savings', label: 'Savings', icon: 'bi-piggy-bank' },
];

const emptyBudgets = categories.reduce(
  (acc, category) => ({ ...acc, [category.id]: 0 }),
  {} as Record<WalletCategory, number>
);

const money = (value: number) => formatPkr(Number(value || 0));

const stateCopy: Record<string, { label: string; color: string }> = {
  overspending: { label: 'Overspending', color: 'text-destructive bg-destructive/10' },
  at_risk: { label: 'At risk', color: 'text-amber-700 bg-amber-100' },
  balanced: { label: 'Balanced', color: 'text-primary bg-primary/10' },
  under_budget: { label: 'Under budget', color: 'text-success bg-success/10' },
};

const RecommendationCard = ({ recommendation }: { recommendation: BudgetRecommendation }) => (
  <article className="rounded-2xl border border-border bg-card p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {recommendation.merchantName || 'Localyse pick'}
        </p>
        <h3 className="text-sm font-semibold mt-1">{recommendation.title}</h3>
        {recommendation.ai_insight && (
          <p className="text-[11px] font-semibold text-primary mt-1.5">
            <i className="bi bi-stars mr-1" />
            AI budget match
          </p>
        )}
      </div>
      <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold capitalize">
        {recommendation.suitability || recommendation.urgency}
      </span>
    </div>

    <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-secondary/70 p-2">
        <p className="text-[10px] text-muted-foreground">Pay</p>
        <p className="text-sm font-semibold">{money(recommendation.price)}</p>
      </div>
      <div className="rounded-xl bg-secondary/70 p-2">
        <p className="text-[10px] text-muted-foreground">Save</p>
        <p className="text-sm font-semibold">{recommendation.savings}</p>
      </div>
      <div className="rounded-xl bg-secondary/70 p-2">
        <p className="text-[10px] text-muted-foreground">Distance</p>
        <p className="text-sm font-semibold">{recommendation.distance}</p>
      </div>
    </div>

    <p className="text-xs text-muted-foreground leading-relaxed">{recommendation.reason}</p>
    <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
      <p className="text-xs font-semibold text-primary">{recommendation.impact}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{recommendation.simulation}</p>
    </div>
    <p className="text-[11px] text-muted-foreground">{recommendation.explanation}</p>
  </article>
);

const Wallet = () => {
  const session = getSession();
  const userId = session?._id || '';
  const [walletData, setWalletData] = useState<WalletResponse | null>(null);
  const [recommendations, setRecommendations] = useState<WalletRecommendationsResponse | null>(null);
  const [balance, setBalance] = useState('');
  const [budgets, setBudgets] = useState<Record<WalletCategory, number>>(emptyBudgets);
  const [selectedCategory, setSelectedCategory] = useState<WalletCategory>('food');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const topState = useMemo(() => {
    if (!walletData?.usage?.length) return undefined;
    const priority = ['overspending', 'at_risk', 'balanced', 'under_budget'];
    return [...walletData.usage].sort(
      (a, b) => priority.indexOf(a.state) - priority.indexOf(b.state)
    )[0];
  }, [walletData]);

  const selectedUsage = useMemo(
    () => walletData?.usage.find((item) => item.category === selectedCategory),
    [selectedCategory, walletData]
  );

  const loadWallet = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const data = await getWallet(userId);
      setWalletData(data);
      setBalance(String(data.wallet.balance || 0));
      setBudgets({ ...emptyBudgets, ...data.wallet.monthlyBudgets });
    } catch (err) {
      toast.error('Wallet unavailable', {
        description: err instanceof Error ? err.message : 'Could not load your wallet.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (!userId) return;

    const fetchRecommendations = async (coords?: GeolocationCoordinates) => {
      const data = await getWalletRecommendations(userId, {
        category: selectedCategory,
        lat: coords?.latitude,
        lng: coords?.longitude,
      });
      setRecommendations(data);
    };

    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => fetchRecommendations(position.coords),
          () => fetchRecommendations(),
          { timeout: 5000 }
        );
      } else {
        await fetchRecommendations();
      }
    } catch (err) {
      toast.error('Recommendations unavailable', {
        description: err instanceof Error ? err.message : 'Could not analyze offers right now.',
      });
    }
  };

  useEffect(() => {
    loadWallet();
  }, [userId]);

  useEffect(() => {
    loadRecommendations();
  }, [userId, selectedCategory]);

  const saveWallet = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      const data = await updateWallet(userId, {
        balance: Number(balance || 0),
        monthlyBudgets: budgets,
      });
      setWalletData(data);
      toast.success('Wallet updated', { description: 'Your PKR balance and budgets were saved.' });
      await loadRecommendations();
    } catch (err) {
      toast.error('Save failed', {
        description: err instanceof Error ? err.message : 'Could not save wallet.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-3 xs:px-4 sm:px-5 pt-4 sm:pt-5 space-y-5 pb-6">
      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Personal Wallet</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
          Your financial-aware city guide
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Track PKR budgets and see offers that explain their budget impact before you act.
        </p>
      </section>

      <section className="rounded-3xl bg-primary text-primary-foreground p-4 sm:p-5">
        <p className="text-xs opacity-80">Current balance</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <span className="text-2xl xs:text-3xl font-semibold break-all">{money(Number(balance || 0))}</span>
          {topState && (
            <span className="mb-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] capitalize">
              {stateCopy[topState.state]?.label || topState.state}
            </span>
          )}
        </div>
        {topState && <p className="text-xs opacity-80 mt-3">{topState.forecast}</p>}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Balance and monthly budgets</h2>
            <p className="text-xs text-muted-foreground mt-1">All amounts are in Pakistani Rupees (PKR).</p>
          </div>
          <button
            onClick={saveWallet}
            disabled={saving}
            className="w-full xs:w-auto rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Current balance</span>
          <input
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            type="number"
            min="0"
            className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
          {categories.map((category) => (
            <label key={category.id} className="block">
              <span className="text-xs font-medium text-muted-foreground">{category.label}</span>
              <input
                value={budgets[category.id]}
                onChange={(event) =>
                  setBudgets((current) => ({
                    ...current,
                    [category.id]: Number(event.target.value || 0),
                  }))
                }
                type="number"
                min="0"
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Budget tracking</h2>
        {loading && <p className="text-xs text-muted-foreground">Loading wallet...</p>}
        <div className="grid gap-3">
          {walletData?.usage.map((item) => (
            <article key={item.category} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <i className={`bi ${categories.find((cat) => cat.id === item.category)?.icon || 'bi-wallet2'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold capitalize">{item.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(item.spent)} spent of {money(item.budget)}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stateCopy[item.state]?.color}`}>
                  {stateCopy[item.state]?.label}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, item.percentUsed)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 xs:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Left {money(item.remaining)}</span>
                <span>Used {item.percentUsed}%</span>
                <span>Safe/day {money(item.dailySafeLimit)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Smart recommendations</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Budget rules pre-filter offers; Groq then explains fit using your limits, recent spend, Tavily, and weather.
            </p>
          </div>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value as WalletCategory)}
            className="h-9 w-full xs:w-auto rounded-xl border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {selectedUsage && (
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
            <div className="rounded-2xl bg-card border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Left</p>
              <p className="text-sm font-semibold mt-1">{money(selectedUsage.remaining)}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Safe/day</p>
              <p className="text-sm font-semibold mt-1">{money(selectedUsage.dailySafeLimit)}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">State</p>
              <p className="text-sm font-semibold mt-1">{stateCopy[selectedUsage.state]?.label}</p>
            </div>
          </div>
        )}

        {recommendations?.aiAnalysis?.summary ? (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">AI wallet read</p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                {recommendations.aiAnalysis.source === 'groq' ? 'Groq' : 'Guided rules'}
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{recommendations.aiAnalysis.summary}</p>
            {recommendations.aiAnalysis.tips && recommendations.aiAnalysis.tips.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                {recommendations.aiAnalysis.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {recommendations && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Advisor state</p>
            <p className="text-sm font-semibold mt-1">
              {stateCopy[recommendations.user_state]?.label} for {recommendations.category}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{recommendations.forecast}</p>
            {recommendations.context?.weather && (
              <p className="text-[11px] text-muted-foreground mt-2">Weather: {recommendations.context.weather}</p>
            )}
            {recommendations.context?.weatherActions && recommendations.context.weatherActions.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">What to do now</p>
                {recommendations.context.weatherActions.map((line) => (
                  <p key={line} className="text-xs text-foreground leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            )}

            {recommendations.context?.priceBenchmark?.answer &&
              !/unavailable|no direct answer/i.test(recommendations.context.priceBenchmark.answer) && (
                <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Reference price bands (web search, PKR)
                  </p>
                  <p className="text-xs text-foreground leading-relaxed mt-1.5">
                    {recommendations.context.priceBenchmark.answer}
                  </p>
                  {recommendations.context.priceBenchmark.signals && recommendations.context.priceBenchmark.signals.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                      {recommendations.context.priceBenchmark.signals.slice(0, 2).map((s, i) => (
                        <li key={`${i}-${s.slice(0, 24)}`}>{s.length > 120 ? `${s.slice(0, 117)}…` : s}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Cross-checks your category spend against typical Islamabad / Pakistan ranges from Tavily. Localyse
                    offer card prices are still merchant-specific.
                  </p>
                </div>
              )}

            {recommendations.context?.insights && recommendations.context.source === 'tavily' && (
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                Web context: {recommendations.context.insights}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-3">
          {recommendations?.recommendations.length ? (
            recommendations.recommendations.map((recommendation) => (
              <RecommendationCard key={`${recommendation.offerId}-${recommendation.title}`} recommendation={recommendation} />
            ))
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No suitable offers for this category right now. Add budget room or check another category.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Recent transactions</h2>
        <div className="mt-3 space-y-2">
          {walletData?.recentTransactions.length ? (
            walletData.recentTransactions.map((item) => (
              <div key={item._id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{item.merchant || item.description || 'Transaction'}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {item.source === 'offer_claim' ? 'Redeemed offer' : item.category} • {new Date(item.occurredAt).toLocaleDateString()}
                  </p>
                  {item.source === 'offer_claim' && (
                    <p className="text-[11px] text-muted-foreground">
                      {money(item.amount)} deducted from your {item.category} budget.
                    </p>
                  )}
                </div>
                <span className="font-semibold">-{money(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No transactions yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Wallet;
