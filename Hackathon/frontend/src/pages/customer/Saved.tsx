import { useEffect, useMemo, useState } from 'react';
import { OfferCard } from '@/components/OfferCard';
import { claimOffer, getCustomerCouponClaims, getCustomerFoodAnalysis, getMoodSuggestion, getOffers } from '@/lib/api';
import { getSession } from '@/lib/auth';
import type { Category, CouponClaim, FoodAnalysis, MoodSuggestion, Offer } from '@/lib/domain';
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
};

type MoodId = 'tired' | 'stressed' | 'happy' | 'hungry' | 'cozy' | 'focused';

const meatTerms = ['beef', 'chicken', 'mutton', 'lamb', 'meat', 'pepperoni', 'ham', 'bacon', 'turkey', 'fish', 'tuna'];
const vegetarianTerms = ['veg', 'veggie', 'vegetarian', 'vegan', 'plant', 'salad', 'paneer'];
const preferenceCategoryMap: Record<string, Category[]> = {
  coffee: ['coffee'],
  food: ['food'],
  vegetarian: ['food'],
  desserts: ['food'],
  retail: ['retail'],
  fitness: ['gym'],
};
const moodOptions: { id: MoodId; label: string; icon: string; description: string; keywords: string[] }[] = [
  {
    id: 'tired',
    label: 'Tired',
    icon: 'bi-moon-stars',
    description: 'Cool, minty, refreshing, or caffeine-friendly picks.',
    keywords: ['mint', 'margarita', 'mojito', 'cold', 'iced', 'coffee', 'tea', 'smoothie', 'juice', 'lemon', 'fresh'],
  },
  {
    id: 'stressed',
    label: 'Stressed',
    icon: 'bi-cloud-drizzle',
    description: 'Comfort food, desserts, and calming little treats.',
    keywords: ['chocolate', 'dessert', 'cake', 'brownie', 'comfort', 'tea', 'soup', 'warm', 'cookie', 'sweet'],
  },
  {
    id: 'happy',
    label: 'Happy',
    icon: 'bi-balloon-heart',
    description: 'Shareable, fun, bright offers for a good mood.',
    keywords: ['pizza', 'burger', 'combo', 'fries', 'share', 'party', 'family', 'sweet', 'shake', 'deal'],
  },
  {
    id: 'hungry',
    label: 'Hungry',
    icon: 'bi-egg-fried',
    description: 'Filling meals and proper food first.',
    keywords: ['meal', 'burger', 'sandwich', 'pizza', 'rice', 'wrap', 'pasta', 'biryani', 'platter', 'combo'],
  },
  {
    id: 'cozy',
    label: 'Cozy',
    icon: 'bi-cup-hot',
    description: 'Warm drinks, bakery bites, and soft comfort.',
    keywords: ['latte', 'coffee', 'tea', 'hot', 'croissant', 'bakery', 'cookie', 'soup', 'warm', 'cocoa'],
  },
  {
    id: 'focused',
    label: 'Focused',
    icon: 'bi-lightning-charge',
    description: 'Quick energy without slowing you down.',
    keywords: ['coffee', 'espresso', 'protein', 'smoothie', 'juice', 'energy', 'quick', 'wrap', 'salad', 'fresh'],
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

const getClaimText = (claim: CouponClaim) =>
  [claim.category, claim.offerText, claim.targetItem, claim.merchantName].map(normalize).join(' ');

const countBy = <T,>(items: T[], getKey: (item: T) => string | undefined) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const key = normalize(getKey(item));
    if (key) counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const hasAnyTerm = (text: string, terms: string[]) => terms.some((term) => text.includes(term));
const hasHistoryReason = (reasons: string[]) =>
  reasons.some((reason) => /claim|buy|purchase|time|discount|preference|price|usual|match/i.test(reason));
const hasMoodReason = (reasons: string[]) => reasons.some((reason) => reason.toLowerCase().includes('mood'));

const getPreferredCategories = (preferences: string[]) =>
  Array.from(
    new Set(
      preferences.flatMap((preference) => preferenceCategoryMap[normalize(preference)] || [])
    )
  );

const matchesPreferredCategory = (offer: Offer, preferredCategories: Category[]) =>
  preferredCategories.length === 0 || preferredCategories.includes(offer.category);

const getMoodBoost = (offer: Offer, moodId: MoodId | '') => {
  if (!moodId) return { score: 0, reasons: [] as string[] };

  const mood = moodOptions.find((option) => option.id === moodId);
  if (!mood) return { score: 0, reasons: [] as string[] };

  const offerText = getText(offer);
  const matchedKeywords = mood.keywords.filter((keyword) => offerText.includes(keyword));
  const categoryBoost =
    moodId === 'tired' && offer.category === 'coffee' ? 8 :
    moodId === 'hungry' && ['food', 'flash'].includes(offer.category) ? 8 :
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

const extractPrice = (text: string) => {
  const match = text.match(/(?:rs\.?|pkr|\$)\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
};

const isOldEnoughToCountAsIgnored = (impression: LocalImpression) =>
  Date.now() - new Date(impression.seenAt).getTime() > 30 * 60 * 1000;

const rankOffer = ({
  offer,
  preferences,
  purchases,
  claims,
  ignored,
}: {
  offer: Offer;
  preferences: string[];
  purchases: LocalPurchase[];
  claims: CouponClaim[];
  ignored: LocalImpression[];
}): RankedOffer => {
  let score = 0;
  const reasons: string[] = [];
  const offerText = getText(offer);
  const purchaseCategories = countBy(purchases, (purchase) => purchase.category);
  const purchaseItems = purchases.map((purchase) => normalize(purchase.item)).filter(Boolean);
  const averagePurchaseAmount = average(purchases.map((purchase) => Number(purchase.amount || 0)).filter((amount) => amount > 0));
  const offerPrice = extractPrice(offer.offerText);
  const claimedCategories = countBy(claims, (claim) => claim.category);
  const ignoredCategories = countBy(ignored.filter(isOldEnoughToCountAsIgnored), (impression) => impression.category);
  const claimedDiscounts = claims.map((claim) => Number(claim.discountPercentage || 0)).filter((discount) => discount > 0);
  const averageClaimedDiscount = average(claimedDiscounts);
  const currentBucket = getHourBucket();
  const claimedTimeBuckets = countBy(claims, (claim) => getHourBucket(claim.claimedAt));
  const mostlyVegetarian =
    claims.some((claim) => hasAnyTerm(getClaimText(claim), vegetarianTerms)) &&
    !claims.some((claim) => hasAnyTerm(getClaimText(claim), meatTerms));

  preferences.forEach((preference) => {
    const normalizedPreference = normalize(preference);
    if (normalizedPreference && offerText.includes(normalizedPreference)) {
      score += 12;
      reasons.push(`Matches ${preference}`);
    }
  });

  if (purchaseCategories[offer.category]) {
    score += purchaseCategories[offer.category] * 8;
    reasons.push(`You often buy ${offer.category}`);
  }

  if (purchaseItems.some((item) => item && offerText.includes(item))) {
    score += 10;
    reasons.push('Similar to your local purchase history');
  }

  if (averagePurchaseAmount > 0 && offerPrice > 0) {
    const distanceFromUsualSpend = Math.abs(offerPrice - averagePurchaseAmount) / averagePurchaseAmount;
    if (distanceFromUsualSpend <= 0.35) {
      score += 6;
      reasons.push('Fits your usual price range');
    } else if (offerPrice > averagePurchaseAmount * 1.8) {
      score -= 8;
      reasons.push('Above your usual price range');
    }
  }

  if (claimedCategories[offer.category]) {
    score += claimedCategories[offer.category] * 10;
    reasons.push(`You claim ${offer.category} deals`);
  }

  if (claimedTimeBuckets[currentBucket]) {
    score += claimedTimeBuckets[currentBucket] * 6;
    reasons.push(`Good for your ${currentBucket} pattern`);
  }

  if (averageClaimedDiscount > 0) {
    const discount = Number(offer.discountPercentage || 0);
    if (discount >= averageClaimedDiscount) {
      score += 8;
      reasons.push(`Discount fits your usual ${Math.round(averageClaimedDiscount)}%+ picks`);
    } else if (discount < Math.max(10, averageClaimedDiscount - 10)) {
      score -= 12;
      reasons.push('Lower than your usual discount threshold');
    }
  } else if ((offer.discountPercentage || 0) >= 20) {
    score += 4;
    reasons.push('Strong starter discount');
  }

  if (ignoredCategories[offer.category] && !claimedCategories[offer.category]) {
    score -= ignoredCategories[offer.category] * 7;
    reasons.push(`Less ${offer.category} because you skipped similar offers`);
  }

  if (mostlyVegetarian && hasAnyTerm(offerText, meatTerms)) {
    score -= 40;
    reasons.push('Hidden lower because your history avoids meat offers');
  }

  if (claims.length === 0 && purchases.length === 0 && preferences.length === 0) {
    score += offer.expectedCustomerVolume || 0;
    reasons.push('Popular nearby offer');
  }

  return {
    offer,
    score,
    reasons: reasons.slice(0, 3),
    suppressed: score < -20,
  };
};

const Saved = () => {
  const session = getSession();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [claims, setClaims] = useState<CouponClaim[]>([]);
  const [foodAnalysis, setFoodAnalysis] = useState<FoodAnalysis | null>(null);
  const [moodSuggestion, setMoodSuggestion] = useState<MoodSuggestion | null>(null);
  const [moodSuggestionLoading, setMoodSuggestionLoading] = useState(false);
  const [purchases, setPurchases] = useState<LocalPurchase[]>([]);
  const [ignored, setIgnored] = useState<LocalImpression[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodId | ''>('');
  const [loading, setLoading] = useState(true);
  const purchaseKey = getUserKey('localyse_purchase_history', session?._id, session?.email);
  const impressionKey = getUserKey('localyse_offer_impressions', session?._id, session?.email);
  const sessionPreferenceKey = (session?.preferences || []).join('|');

  const preferences = useMemo(
    () => [session?.category, ...(session?.preferences || [])].filter(Boolean) as string[],
    [session?.category, sessionPreferenceKey]
  );
  const preferredCategories = useMemo(() => getPreferredCategories(preferences), [preferences]);
  const categoryFilteredOffers = useMemo(
    () => offers.filter((offer) => matchesPreferredCategory(offer, preferredCategories)),
    [offers, preferredCategories]
  );

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const [liveOffers, claimHistory, analysis] = await Promise.all([
          getOffers(),
          session?._id || session?.email
            ? getCustomerCouponClaims({ customerId: session?._id, customerEmail: session?.email })
            : Promise.resolve({ claims: [], summary: { totalClaims: 0, redeemedClaims: 0, pendingClaims: 0 } }),
          session?._id || session?.email
            ? getCustomerFoodAnalysis({ customerId: session?._id, customerEmail: session?.email }).catch(() => null)
            : Promise.resolve(null),
        ]);

        setOffers(liveOffers);
        setClaims(claimHistory.claims);
        setFoodAnalysis(analysis);
        setPurchases(readLocalArray<LocalPurchase>(purchaseKey));
        setIgnored(readLocalArray<LocalImpression>(impressionKey));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load personalized offers.';
        toast.error('Could not load For you', { description: message });
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
  }, [impressionKey, purchaseKey, session?._id, session?.email]);

  useEffect(() => {
    if (categoryFilteredOffers.length === 0) return;

    const claimedOfferIds = new Set(claims.map((claim) => claim.offerId));
    const existingIds = new Set(ignored.map((impression) => impression.offerId));
    const nextImpressions = [
      ...ignored,
      ...categoryFilteredOffers
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
  }, [categoryFilteredOffers, claims, ignored, impressionKey]);

  const personalizedOffers = useMemo(() => {
    const claimedOfferIds = new Set(claims.map((claim) => claim.offerId));

    return [...categoryFilteredOffers]
      .filter((offer) => !claimedOfferIds.has(offer.id))
      .map((offer) =>
        rankOffer({
          offer,
          preferences,
          purchases,
          claims,
          ignored,
        })
      )
      .map((ranked) => {
        const moodBoost = getMoodBoost(ranked.offer, selectedMood);

        return {
          ...ranked,
          score: ranked.score + moodBoost.score,
          reasons: [...moodBoost.reasons, ...ranked.reasons].slice(0, 3),
        };
      })
      .filter((ranked) => !ranked.suppressed)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.offer.expectedCustomerVolume || 0) - (a.offer.expectedCustomerVolume || 0);
      });
  }, [categoryFilteredOffers, claims, ignored, preferences, purchases, selectedMood]);

  useEffect(() => {
    if (!selectedMood || personalizedOffers.length === 0) {
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
      offerIds: personalizedOffers.slice(0, 6).map((ranked) => ranked.offer.id),
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
  }, [personalizedOffers, selectedMood, session?._id, session?.email]);

  const selectedMoodMeta = moodOptions.find((mood) => mood.id === selectedMood);
  const moodPick = selectedMood
    ? personalizedOffers.find((ranked) => ranked.offer.id === moodSuggestion?.bestOfferId) || personalizedOffers[0]
    : null;
  const moodPickId = moodPick?.offer.id;
  const specialOffers = useMemo(() => {
    const meaningfulPicks = personalizedOffers.filter((ranked) => {
      if (selectedMood) return hasMoodReason(ranked.reasons) || ranked.score >= 12;
      return hasHistoryReason(ranked.reasons) || ranked.score >= 8;
    });
    const picks = meaningfulPicks.length > 0 ? meaningfulPicks : personalizedOffers.slice(0, 3);
    const moodPickIndex = moodPickId ? picks.findIndex((ranked) => ranked.offer.id === moodPickId) : -1;

    if (moodPickIndex <= 0) return picks.slice(0, 6);

    return [picks[moodPickIndex], ...picks.filter((_, index) => index !== moodPickIndex)].slice(0, 6);
  }, [moodPickId, personalizedOffers, selectedMood]);

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
          Filtered by your account preferences, then ranked by purchase history, claims, time patterns, and mood.
        </p>
      </section>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-lavender text-lavender-foreground flex items-center justify-center">
            <i className="bi bi-stars" />
          </div>
          <div>
            <p className="text-sm font-semibold">Hyperpersonalized feed</p>
            <p className="text-xs text-muted-foreground mt-1">
              {preferredCategories.length > 0
                ? `Showing ${preferredCategories.join(', ')} offers from your saved preferences${personalizationSummary.length > 0 ? ` · ${personalizationSummary.join(' · ')}` : ''}`
                : personalizationSummary.length > 0
                ? personalizationSummary.join(' · ')
                : 'Learning from your local purchases, claims, ignored offers, and profile preferences.'}
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
              Pick a mood and Localyse will turn it into a tiny food adventure.
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
              <i className="bi bi-cup-straw text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-[#b35f88] font-semibold">AI food analysis</p>
              <h2 className="mt-1 text-lg font-semibold leading-tight">Your sweet food mood</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{foodAnalysis.sweetSummary}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs">
            <FoodStat label="Favorite" value={foodAnalysis.tasteProfile.favoriteCategory} />
            <FoodStat label="Best time" value={foodAnalysis.tasteProfile.preferredTime} />
            <FoodStat label="Deal comfort" value={`${foodAnalysis.tasteProfile.averageClaimedDiscount || 0}% off`} />
            <FoodStat label="Claims learned" value={foodAnalysis.tasteProfile.totalClaims.toString()} />
          </div>

          <div className="mt-4 rounded-2xl bg-white/75 p-4 ring-1 ring-[#f5c7dc]">
            <p className="text-xs font-semibold text-[#b35f88]">AI says</p>
            <p className="mt-1 text-sm text-foreground leading-relaxed">{foodAnalysis.aiSuggestion}</p>
          </div>

          {foodAnalysis.recommendations.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Recommended next bites</p>
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
      ) : specialOffers.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 xs:p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <i className="bi bi-stars text-xl text-muted-foreground" />
          </div>
          <p className="font-medium">No special offers yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {preferredCategories.length > 0
              ? 'No live offers match your saved account preferences yet.'
              : 'Pick a mood or claim a few offers so Localyse can learn your taste.'}
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Special offers for you</p>
            <h2 className="text-lg font-semibold tracking-tight">
              {selectedMoodMeta ? `${selectedMoodMeta.label} picks` : 'Analyzed picks'}
            </h2>
          </div>
          {specialOffers.map(({ offer, score, reasons }) => {
            const isMoodPick = Boolean(selectedMood && offer.id === moodPickId);
            const fromMoodMatch = Boolean(selectedMood && (isMoodPick || hasMoodReason(reasons)));
            const fromHistory = hasHistoryReason(reasons);

            return (
              <div key={offer.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold text-primary">
                    Match {Math.max(0, Math.round(score))}
                  </span>
                  {fromMoodMatch && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fde7f3] px-2.5 py-1 text-[10px] font-semibold text-[#b35f88]">
                      <i className="bi bi-magic" />
                      Mood pick
                    </span>
                  )}
                  {fromHistory && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                      <i className="bi bi-clock-history" />
                      Based on your history
                    </span>
                  )}
                  {(reasons.length > 0 ? reasons : ['Best available fit']).map((reason) => (
                    <span key={reason} className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground">
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
    </div>
  );
};

const FoodStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-[#f5c7dc]">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 font-semibold capitalize text-foreground">{value}</p>
  </div>
);

export default Saved;
