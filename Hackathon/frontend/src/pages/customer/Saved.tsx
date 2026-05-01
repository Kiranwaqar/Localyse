import { useEffect, useMemo, useState } from 'react';
import { OfferCard } from '@/components/OfferCard';
import {
  claimOffer,
  getCustomerCouponClaims,
  getCustomerFoodAnalysis,
  getForYouOffers,
  getMoodSuggestion,
  getOffers,
} from '@/lib/api';
import { getSession } from '@/lib/auth';
import { useCustomerNotifications } from '@/contexts/CustomerNotificationsContext';
import type { CouponClaim, FoodAnalysis, MoodSuggestion, Offer } from '@/lib/domain';
import { toast } from 'sonner';

const normalize = (value?: string) => String(value || '').trim().toLowerCase();

type LocalPurchase = {
  category?: string;
  merchantName?: string;
  item?: string;
  amount?: number;
  purchasedAt?: string;
};

type LocalImpression = {
  offerId: string;
  category: string;
  offerText: string;
  discountPercentage?: number;
  seenAt: string;
};

type RankedOffer = {
  offer: Offer;
  score: number;
  reasons: string[];
  suppressed: boolean;
  /** True when this row is a mood-only extra, not an AI history match. */
  moodOnly?: boolean;
};

type MoodId = 'tired' | 'stressed' | 'happy' | 'hungry' | 'cozy' | 'focused';

const moodOptions: { id: MoodId; label: string; icon: string; description: string; keywords: string[] }[] = [
  {
    id: 'tired',
    label: 'Tired',
    icon: 'bi-moon-stars',
    description: 'Easy wins: quick pickup, refreshers, and light energy.',
    keywords: ['coffee', 'tea', 'cold', 'iced', 'smoothie', 'juice', 'fresh', 'quick', 'express', 'pickup', 'grab'],
  },
  {
    id: 'stressed',
    label: 'Stressed',
    icon: 'bi-cloud-drizzle',
    description: 'Calm, low-friction offers — treats, self-care, or a simple save.',
    keywords: ['comfort', 'sweet', 'tea', 'warm', 'spa', 'lounge', 'bundle', 'save', 'deal', 'cookie', 'dessert'],
  },
  {
    id: 'happy',
    label: 'Happy',
    icon: 'bi-balloon-heart',
    description: 'Bright, social, or celebratory deals worth sharing.',
    keywords: ['share', 'party', 'family', 'combo', 'deal', 'friends', 'class', 'studio', 'membership', 'bogo'],
  },
  {
    id: 'hungry',
    label: 'Eager',
    icon: 'bi-bag-heart',
    description: 'Substantial offers: meals, hauls, class packs, or big-value retail.',
    keywords: [
      'meal',
      'burger',
      'sandwich',
      'pizza',
      'platter',
      'combo',
      'haul',
      'stock',
      'retail',
      'sale',
      'membership',
      'class pack',
      'session pack',
      'biryani',
    ],
  },
  {
    id: 'cozy',
    label: 'Cozy',
    icon: 'bi-cup-hot',
    description: 'Slow, warm, linger-friendly spots and soft saves.',
    keywords: ['latte', 'coffee', 'tea', 'hot', 'bakery', 'warm', 'soup', 'cocoa', 'browse', 'lounge'],
  },
  {
    id: 'focused',
    label: 'Focused',
    icon: 'bi-lightning-charge',
    description: 'Fast, efficient picks that keep you on track.',
    keywords: ['coffee', 'espresso', 'protein', 'energy', 'quick', 'express', 'gym', 'class', 'session', 'pass'],
  },
];

const getUserKey = (base: string, userId?: string, email?: string) => `${base}:${userId || email || 'guest'}`;

const readLocalArray = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalArray = <T,>(key: string, value: T[]) => {
  localStorage.setItem(key, JSON.stringify(value.slice(-250)));
};

const getHourBucket = (dateValue?: string) => {
  const hour = dateValue ? new Date(dateValue).getHours() : new Date().getHours();

  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'late night';
};

const getText = (offer: Offer) =>
  [
    offer.category,
    offer.offerText,
    offer.reasonWhyNow,
    offer.targetItem,
    offer.aiSuggestion,
    offer.expectedBusinessImpact,
  ]
    .map(normalize)
    .join(' ');

const countBy = <T,>(items: T[], getKey: (item: T) => string | undefined) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const key = normalize(getKey(item));
    if (key) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const hasHistoryReason = (reasons: string[]) =>
  reasons.some((reason) => /claim|buy|purchase|time|discount|preference|price|usual|match/i.test(reason));

const getMoodBoost = (offer: Offer, moodId: MoodId | '') => {
  if (!moodId) return { score: 0, reasons: [] as string[] };

  const mood = moodOptions.find((option) => option.id === moodId);
  if (!mood) return { score: 0, reasons: [] as string[] };

  const offerText = getText(offer);
  const matchedKeywords = mood.keywords.filter((keyword) => offerText.includes(keyword));
  const categoryBoost =
    moodId === 'tired' && offer.category === 'coffee' ? 8 :
    moodId === 'hungry' && ['food', 'flash', 'retail'].includes(offer.category) ? 8 :
    moodId === 'cozy' && offer.category === 'coffee' ? 8 :
    moodId === 'focused' && ['coffee', 'gym'].includes(offer.category) ? 8 :
    0;

  return {
    score: matchedKeywords.length * 9 + categoryBoost,
    reasons: matchedKeywords.length
      ? [`Mood match: ${matchedKeywords.slice(0, 2).join(', ')}`]
      : categoryBoost
        ? [`${mood.label} mood pick`]
        : [],
  };
};

const Saved = () => {
  const session = getSession();
  const { push: pushNotification } = useCustomerNotifications();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [claims, setClaims] = useState<CouponClaim[]>([]);
  const [foodAnalysis, setFoodAnalysis] = useState<FoodAnalysis | null>(null);
  const [moodSuggestion, setMoodSuggestion] = useState<MoodSuggestion | null>(null);
  const [moodSuggestionLoading, setMoodSuggestionLoading] = useState(false);
  const [purchases, setPurchases] = useState<LocalPurchase[]>([]);
  const [ignored, setIgnored] = useState<LocalImpression[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodId | ''>('');
  const [loading, setLoading] = useState(true);
  const [forYouInfo, setForYouInfo] = useState<{ message?: string; filterSource?: string; tavilyUsed?: boolean }>({});
  const [allLiveOffers, setAllLiveOffers] = useState<Offer[]>([]);
  const purchaseKey = getUserKey('localyse_purchase_history', session?._id, session?.email);
  const impressionKey = getUserKey('localyse_offer_impressions', session?._id, session?.email);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        setLoading(true);
        if (!session?._id && !session?.email) {
          setOffers([]);
          setAllLiveOffers([]);
          setClaims([]);
          setForYouInfo({
            message: 'Sign in to see offers personalized from your coupon claim history.',
            filterSource: 'none',
          });
          setFoodAnalysis(null);
          return;
        }

        const [claimHistory, forYou, analysis, liveAll] = await Promise.all([
          getCustomerCouponClaims({ customerId: session?._id, customerEmail: session?.email }),
          getForYouOffers({ customerId: session?._id, customerEmail: session?.email }),
          getCustomerFoodAnalysis({ customerId: session?._id, customerEmail: session?.email }).catch(() => null),
          getOffers().catch(() => []),
        ]);

        setClaims(claimHistory.claims);
        setOffers(forYou.offers);
        setAllLiveOffers(liveAll);
        setForYouInfo({
          message: forYou.message,
          filterSource: forYou.filterSource,
          tavilyUsed: forYou.tavilyUsed,
        });
        setFoodAnalysis(analysis);
        setPurchases(readLocalArray<LocalPurchase>(purchaseKey));
        setIgnored(readLocalArray<LocalImpression>(impressionKey));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load personalized offers.';
        toast.error('Could not load For you', { description: message });
        setOffers([]);
        setAllLiveOffers([]);
        setForYouInfo({});
      } finally {
        setLoading(false);
      }
    };

    void loadFeed();
  }, [impressionKey, purchaseKey, session?._id, session?.email]);

  useEffect(() => {
    if (offers.length === 0) return;

    const claimedOfferIds = new Set(claims.map((claim) => claim.offerId));
    const existingIds = new Set(ignored.map((impression) => impression.offerId));
    const nextImpressions = [
      ...ignored,
      ...offers
        .filter((offer) => !claimedOfferIds.has(offer.id) && !existingIds.has(offer.id))
        .map((offer) => ({
          offerId: offer.id,
          category: offer.category,
          offerText: offer.offerText,
          discountPercentage: offer.discountPercentage,
          seenAt: new Date().toISOString(),
        })),
    ];

    if (nextImpressions.length !== ignored.length) {
      setIgnored(nextImpressions);
      writeLocalArray(impressionKey, nextImpressions);
    }
  }, [offers, claims, ignored, impressionKey]);

  /** Claim-history + personalization — mood does not change these scores. */
  const personalizedOffers = useMemo(() => {
    const claimedOfferIds = new Set(claims.map((claim) => claim.offerId));

    return offers
      .filter((offer) => !claimedOfferIds.has(offer.id))
      .map((offer) => {
        const base = Number(offer.forYouScore ?? 0);
        const baseReasons: string[] = [];
        if (offer.forYouReason) baseReasons.push(offer.forYouReason);
        if (forYouInfo?.filterSource === 'groq') baseReasons.push('AI-matched from your claim history');
        else if (forYouInfo?.filterSource === 'heuristic') baseReasons.push('Matched to your claim history (rules)');
        return {
          offer,
          score: base,
          reasons: baseReasons.filter(Boolean).slice(0, 4),
          suppressed: false,
        } as RankedOffer;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.offer.expectedCustomerVolume || 0) - (a.offer.expectedCustomerVolume || 0);
      });
  }, [offers, claims, forYouInfo?.filterSource]);

  /** When a mood is selected: extra live offers scored by mood only (not in history list). */
  const moodExtraOffers = useMemo((): RankedOffer[] => {
    if (!selectedMood) return [];
    const claimedOfferIds = new Set(claims.map((claim) => claim.offerId));
    const historyIds = new Set(offers.map((o) => o.id));
    return allLiveOffers
      .filter((offer) => !claimedOfferIds.has(offer.id) && !historyIds.has(offer.id))
      .map((offer) => {
        const moodBoost = getMoodBoost(offer, selectedMood);
        return {
          offer,
          score: moodBoost.score,
          reasons: [...moodBoost.reasons, 'Extra pick for your mood (live offers)'],
          suppressed: false,
          moodOnly: true,
        } as RankedOffer;
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.offer.expectedCustomerVolume || 0) - (a.offer.expectedCustomerVolume || 0);
      })
      .slice(0, 5);
  }, [selectedMood, allLiveOffers, offers, claims]);

  const moodSuggestionPoolIds = useMemo(() => {
    const ids: string[] = [];
    for (const r of personalizedOffers.slice(0, 6)) ids.push(r.offer.id);
    for (const r of moodExtraOffers.slice(0, 6)) {
      if (!ids.includes(r.offer.id)) ids.push(r.offer.id);
    }
    return ids.slice(0, 12);
  }, [personalizedOffers, moodExtraOffers]);

  useEffect(() => {
    if (!selectedMood || moodSuggestionPoolIds.length === 0) {
      setMoodSuggestion(null);
      setMoodSuggestionLoading(false);
      return;
    }

    let active = true;
    setMoodSuggestionLoading(true);

    getMoodSuggestion({
      mood: selectedMood,
      customerId: session?._id,
      customerEmail: session?.email,
      offerIds: moodSuggestionPoolIds,
    })
      .then((suggestion) => {
        if (active) setMoodSuggestion(suggestion);
      })
      .catch(() => {
        if (active) setMoodSuggestion(null);
      })
      .finally(() => {
        if (active) setMoodSuggestionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [moodSuggestionPoolIds, selectedMood, session?._id, session?.email]);

  const selectedMoodMeta = moodOptions.find((mood) => mood.id === selectedMood);
  const allRankedForMoodPick = useMemo(
    () => [...personalizedOffers, ...moodExtraOffers],
    [personalizedOffers, moodExtraOffers]
  );
  const moodPick = selectedMood
    ? allRankedForMoodPick.find((ranked) => ranked.offer.id === moodSuggestion?.bestOfferId) ||
      personalizedOffers[0] ||
      moodExtraOffers[0] ||
      null
    : null;
  const moodPickId = moodPick?.offer.id;
  const specialOffers = useMemo(() => {
    const meaningfulPicks = personalizedOffers.filter((ranked) => {
      return hasHistoryReason(ranked.reasons) || ranked.score >= 8;
    });
    const picks = meaningfulPicks.length > 0 ? meaningfulPicks : personalizedOffers.slice(0, 3);
    const moodPickIndex = moodPickId ? picks.findIndex((ranked) => ranked.offer.id === moodPickId) : -1;

    if (moodPickIndex <= 0) return picks.slice(0, 6);

    return [picks[moodPickIndex], ...picks.filter((_, index) => index !== moodPickIndex)].slice(0, 6);
  }, [moodPickId, personalizedOffers]);

  const personalizationSummary = useMemo(() => {
    const claimedCategories = Object.entries(countBy(claims, (claim) => claim.category))
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);
    const purchaseCategories = Object.entries(countBy(purchases, (purchase) => purchase.category))
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);
    const averageSpend = Math.round(
      average(purchases.map((purchase) => Number(purchase.amount || 0)).filter((amount) => amount > 0))
    );
    const averageDiscount = Math.round(
      average(claims.map((claim) => Number(claim.discountPercentage || 0)).filter((discount) => discount > 0))
    );
    const topTime = Object.entries(countBy(claims, (claim) => getHourBucket(claim.claimedAt))).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    return [
      claimedCategories[0] ? `claims: ${claimedCategories[0]}` : null,
      purchaseCategories[0] ? `buys: ${purchaseCategories[0]}` : null,
      averageSpend ? `usual spend Rs ${averageSpend}` : null,
      averageDiscount ? `likes ${averageDiscount}%+ off` : null,
      topTime ? `${topTime} pattern` : null,
    ].filter(Boolean);
  }, [claims, purchases]);

  const onClaimOffer = async (offer: Offer) => {
    try {
      const result = await claimOffer(offer.id, {
        customerId: session?._id,
        customerName: session?.name,
        customerEmail: session?.email,
      });

      const purchaseRecord: LocalPurchase = {
        category: offer.category,
        merchantName: offer.merchantName,
        item: offer.targetItem || offer.offerText,
        amount: result.estimatedRevenue,
        purchasedAt: new Date().toISOString(),
      };
      const nextPurchases = [...purchases, purchaseRecord];

      writeLocalArray(purchaseKey, nextPurchases);
      setPurchases(nextPurchases);
      setOffers((current) => current.filter((item) => item.id !== offer.id));
      setAllLiveOffers((current) => current.filter((item) => item.id !== offer.id));
      setClaims((current) => [
        {
          id: `local-${offer.id}`,
          merchantId: offer.merchantId || '',
          merchantName: offer.merchantName,
          offerId: offer.id,
          offerText: offer.offerText,
          targetItem: offer.targetItem,
          discountPercentage: offer.discountPercentage,
          category: offer.category,
          customerId: session?._id,
          customerName: session?.name || 'Customer',
          customerEmail: session?.email || '',
          couponCode: result.couponCode,
          status: 'claimed',
          estimatedRevenue: result.estimatedRevenue,
          claimedAt: new Date().toISOString(),
          redeemedAt: null,
          expiresAt: new Date(Date.now() + offer.expiresInMinutes * 60000).toISOString(),
        },
        ...current,
      ]);
      if (!result.alreadyClaimed) {
        pushNotification({
          title: 'Offer claimed',
          body: `${offer.merchantName} — coupon ${result.couponCode}. Open your wallet to use it.`,
          href: '/app/wallet',
        });
      }
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
    <div className="px-3 xs:px-4 sm:px-5 pt-4 sm:pt-5 space-y-5">
      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Personalized picks</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">For you</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Offers here reflect what you&apos;ve claimed. When you choose a mood, we also surface extra nearby offers that fit
          that vibe alongside your personalized list.
        </p>
      </section>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-lavender text-lavender-foreground flex items-center justify-center">
            <i className="bi bi-stars" />
          </div>
          <div>
            <p className="text-sm font-semibold">Claim-history feed</p>
            <p className="text-xs text-muted-foreground mt-1">
              {forYouInfo?.filterSource === 'groq' && 'Offers are ranked with AI based on past claims and local context. '}
              {forYouInfo?.filterSource === 'heuristic' && 'Offers are ranked with rules tuned to past claims until full personalization is available. '}
              {forYouInfo?.filterSource === 'none' && (forYouInfo?.message || 'Sign in and claim offers to unlock this feed. ')}
              {personalizationSummary.length > 0 ? personalizationSummary.join(' · ') : 'Your preference signals come from real claims, not just profile settings.'}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-[#f5c7dc] bg-gradient-to-br from-[#fff4fb] via-white to-[#f4efff] p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffd6e9] text-[#b35f88]">
            <i className="bi bi-magic text-xl" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#b35f88] font-semibold">Mood quest</p>
            <h2 className="mt-1 text-lg font-semibold leading-tight">How are you feeling?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a mood and Localyse will shape nearby offers to match — based on what you actually like to claim.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 xs:grid-cols-3 gap-2">
          {moodOptions.map((mood) => (
            <button
              key={mood.id}
              onClick={() => setSelectedMood((current) => (current === mood.id ? '' : mood.id))}
              className={
                'rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition ' +
                (selectedMood === mood.id
                  ? 'border-[#b35f88] bg-[#fde7f3] text-[#b35f88]'
                  : 'border-border bg-white/75 text-foreground hover:border-[#f5c7dc]')
              }
            >
              <i className={`bi ${mood.icon} block text-lg mb-1`} />
              {mood.label}
            </button>
          ))}
        </div>

        {selectedMoodMeta && (
          <div className="mt-4 rounded-2xl bg-white/75 p-4 ring-1 ring-[#f5c7dc]">
            <p className="text-sm font-semibold text-[#b35f88]">{selectedMoodMeta.label} mode unlocked</p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedMoodMeta.description}</p>
            {moodPick ? (
              <div className="mt-3 rounded-xl bg-secondary/50 p-3">
                <p className="text-xs font-semibold">{moodPick.offer.merchantName}</p>
                <p className="mt-1 text-sm font-medium leading-snug">{moodPick.offer.offerText}</p>
                <p className="mt-1 text-[11px] text-[#b35f88]">
                  {moodPick.reasons[0] || 'Best match for your current vibe'}
                </p>
                <div className="mt-3 rounded-xl bg-white/80 p-3">
                  <p className="text-[11px] font-semibold text-[#b35f88]">AI mood suggestion</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground">
                    {moodSuggestionLoading
                      ? 'Asking Localyse AI to compare your current offers...'
                      : moodSuggestion?.suggestion || `This looks like the best ${selectedMoodMeta.label.toLowerCase()} pick from your filtered offers.`}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {moodSuggestion?.moodImpact || selectedMoodMeta.description}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No unclaimed offer matches this mood yet, but new offers can unlock one.
              </p>
            )}
          </div>
        )}
      </section>

      {foodAnalysis && (
        <section className="overflow-hidden rounded-3xl border border-[#f5c7dc] bg-[#fff4fb] p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffd6e9] text-[#b35f88]">
              <i className="bi bi-sliders text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-[#b35f88] font-semibold">Preference snapshot</p>
              <h2 className="mt-1 text-lg font-semibold leading-tight">Your local deal style</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{foodAnalysis.sweetSummary}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs">
            <PreferenceStat label="Top category" value={foodAnalysis.tasteProfile.favoriteCategory} />
            <PreferenceStat label="Peak time" value={foodAnalysis.tasteProfile.preferredTime} />
            <PreferenceStat label="Deal comfort" value={`${foodAnalysis.tasteProfile.averageClaimedDiscount || 0}% off`} />
            <PreferenceStat label="Claims so far" value={foodAnalysis.tasteProfile.totalClaims.toString()} />
          </div>

          <div className="mt-4 rounded-2xl bg-white/75 p-4 ring-1 ring-[#f5c7dc]">
            <p className="text-xs font-semibold text-[#b35f88]">AI says</p>
            <p className="mt-1 text-sm text-foreground leading-relaxed">{foodAnalysis.aiSuggestion}</p>
          </div>

          {foodAnalysis.recommendations.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Suggested next picks</p>
              {foodAnalysis.recommendations.map((recommendation) => (
                <div key={`${recommendation.merchantName}-${recommendation.offerText}`} className="rounded-2xl bg-white/70 p-3">
                  <p className="text-sm font-semibold">{recommendation.merchantName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{recommendation.offerText}</p>
                  <p className="mt-1 text-[11px] text-[#b35f88]">{recommendation.reason}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
          Loading personalized offers...
        </div>
      ) : (
        <>
          {specialOffers.length > 0 && (
            <section className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">From your claim history</p>
                <h2 className="text-lg font-semibold tracking-tight">AI-matched picks</h2>
              </div>
              {specialOffers.map(({ offer, score, reasons }) => {
                const isMoodPick = Boolean(selectedMood && offer.id === moodPickId);
                const fromHistory = hasHistoryReason(reasons);

                return (
                  <div key={offer.id} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 px-1">
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold text-primary">
                        Match {Math.max(0, Math.round(score))}
                      </span>
                      {isMoodPick && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fde7f3] px-2.5 py-1 text-[10px] font-semibold text-[#b35f88]">
                          <i className="bi bi-magic" />
                          Top mood pick
                        </span>
                      )}
                      {fromHistory && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                          <i className="bi bi-clock-history" />
                          Based on your history
                        </span>
                      )}
                      {(reasons.length > 0 ? reasons : ['Best available fit']).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                    <OfferCard {...offer} onClaim={() => onClaimOffer(offer)} />
                  </div>
                );
              })}
            </section>
          )}

          {selectedMood && moodExtraOffers.length > 0 && (
            <section className="space-y-3 mt-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Added for your mood</p>
                <h2 className="text-lg font-semibold tracking-tight">
                  {selectedMoodMeta ? `More ${selectedMoodMeta.label} ideas` : 'Mood picks'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Extra live offers scored for this mood (not in your history-based list above).
                </p>
              </div>
              {moodExtraOffers.map(({ offer, score, reasons, moodOnly }) => {
                const isMoodPick = Boolean(offer.id === moodPickId);

                return (
                  <div key={`mood-${offer.id}`} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 px-1">
                      <span className="rounded-full bg-[#fde7f3] px-2.5 py-1 text-[10px] font-semibold text-[#b35f88]">
                        Mood {Math.max(0, Math.round(score))}
                      </span>
                      {moodOnly && (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                          Not in history set
                        </span>
                      )}
                      {isMoodPick && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fde7f3] px-2.5 py-1 text-[10px] font-semibold text-[#b35f88]">
                          <i className="bi bi-magic" />
                          Top mood pick
                        </span>
                      )}
                      {reasons
                        .filter((r) => !r.includes('Extra pick for your mood'))
                        .map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground"
                          >
                            {reason}
                          </span>
                        ))}
                    </div>
                    <OfferCard {...offer} onClaim={() => onClaimOffer(offer)} />
                  </div>
                );
              })}
            </section>
          )}

          {!loading &&
            specialOffers.length === 0 &&
            (!selectedMood || moodExtraOffers.length === 0) && (
              <div className="bg-card border border-border rounded-2xl p-6 xs:p-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                  <i className="bi bi-stars text-xl text-muted-foreground" />
                </div>
                <p className="font-medium">No offers to show yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {forYouInfo?.message ||
                    (claims.length === 0
                      ? 'Claim a few offers on Home first—then For you shows deals aligned with that history.'
                      : selectedMood
                        ? 'No extra mood matches beyond your list, or turn off the mood to see only history picks.'
                        : 'Nothing in the live pool matches your patterns yet. Check back soon.')}
                </p>
              </div>
            )}
        </>
      )}
    </div>
  );
};

const PreferenceStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-[#f5c7dc]">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 font-semibold capitalize text-foreground">{value}</p>
  </div>
);

export default Saved;
