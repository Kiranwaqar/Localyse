export type Category = 'coffee' | 'food' | 'retail' | 'gym' | 'flash';

export interface Offer {
  id: string;
  merchantId?: string;
  merchantName: string;
  category: Category;
  distanceMeters: number;
  offerText: string;
  reasonWhyNow: string;
  expiresInMinutes: number;
  sector: string;
  discountPercentage?: number;
  originalPrice?: number;
  offerPrice?: number;
  targetItem?: string;
  expectedCustomerVolume?: number;
  expectedBusinessImpact?: string;
  aiSuggestion?: string;
  /** Short Tavily-style hook shown on the coupon (customer-facing). */
  charmLine?: string;
  /** Extra sparkle line from search signals or follow-on context. */
  charmSubtext?: string;
  /** "For you" feed: AI+history fit score (backend). */
  forYouScore?: number;
  /** "For you" feed: one-line reason from Groq/heuristic. */
  forYouReason?: string;
  claimCount?: number;
  claimed?: boolean;
  couponCode?: string;
  merchantAddress?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export interface OfferAnalytics {
  summary: {
    publishedCount: number;
    claimedCount: number;
    claimRate: number;
    averageTimeToClaimMinutes: number;
    expiredUnclaimedCount: number;
    /** Sum of post-discount amounts for redeemed offers (redeemAmount, or from offer at read time). */
    revenueAttributed: number;
    /** Mean daily revenue from upload (total ÷ day rows), reference only. */
    baselineDayRevenue: number;
    /** (Actual paid on redemptions) − (redeemCount × average $/customer from finance) when comparable. */
    estimatedUplift: number;
    /** Redeemed offers counted for revenue. */
    redeemCount?: number;
    /** redeemCount × baseline average $/customer from your finance upload. */
    counterfactualRevenue?: number;
    /** AOV-style baseline from upload (average $ per customer). */
    baselineAveragePerCustomer?: number;
    /** False when no finance AOV to compare. */
    upliftIsComparable?: boolean;
  };
  topOffer: {
    id: string;
    offerText: string;
    claimCount: number;
    targetItem?: string;
  } | null;
  expiredUnclaimed: {
    id: string;
    offerText: string;
    targetItem?: string;
    expiredAt: string;
    aiReason: string;
  }[];
  offers: {
    id: string;
    offerText: string;
    merchantName: string;
    claimCount: number;
    expectedCustomerVolume: number;
    revenueAttributed: number;
    createdAt: string;
    expiresAt: string;
  }[];
}

export interface CouponClaim {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantEmail?: string;
  offerId: string;
  offerText: string;
  targetItem?: string;
  discountPercentage?: number;
  category: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  couponCode: string;
  status: 'claimed' | 'redeemed';
  estimatedRevenue: number;
  claimedAt: string;
  redeemedAt?: string | null;
  expiresAt: string;
}

export interface CouponClaimsResponse {
  summary: {
    totalClaims: number;
    redeemedClaims: number;
    pendingClaims: number;
  };
  claims: CouponClaim[];
}

export interface FoodAnalysis {
  tasteProfile: {
    favoriteCategory: string;
    favoriteMerchant: string;
    preferredTime: string;
    averageClaimedDiscount: number;
    totalClaims: number;
    redeemedClaims: number;
    preferences: string[];
  };
  sweetSummary: string;
  aiSuggestion: string;
  signals: string[];
  source: string;
  recommendations: {
    offerId?: string | null;
    merchantName: string;
    offerText: string;
    reason: string;
  }[];
}

export interface MoodSuggestion {
  mood: string;
  bestOfferId: string | null;
  merchantName?: string;
  offerText?: string;
  suggestion: string;
  moodImpact: string;
  source: string;
  signals: string[];
}

export type WalletCategory = 'food' | 'transport' | 'shopping' | 'entertainment' | 'bills' | 'savings';

export type FinancialState = 'overspending' | 'at_risk' | 'balanced' | 'under_budget';

export interface WalletBudgetUsage {
  category: WalletCategory;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  dailySafeLimit: number;
  spendingVelocity: number;
  state: FinancialState;
  forecast: string;
}

export interface WalletTransaction {
  _id: string;
  amount: number;
  currency: 'PKR';
  merchant?: string;
  description?: string;
  category: WalletCategory;
  source: 'manual' | 'upload' | 'offer_claim';
  occurredAt: string;
}

export interface WalletResponse {
  wallet: {
    id: string;
    user: string;
    balance: number;
    currency: 'PKR';
    monthlyBudgets: Record<WalletCategory, number>;
  };
  usage: WalletBudgetUsage[];
  recentTransactions: WalletTransaction[];
  importedCount?: number;
}

export interface BudgetRecommendation {
  title: string;
  offerId?: string;
  merchantName?: string;
  category: WalletCategory;
  price: number;
  original_price: number;
  distance: string;
  suitability?: string;
  reason: string;
  impact: string;
  simulation: string;
  savings: string;
  urgency: 'low' | 'medium' | 'high';
  explanation: string;
  /** Set when Groq enriches the card (headline + budget angle). */
  ai_insight?: string;
  ai_budget_angle?: string;
}

export interface WalletRecommendationsResponse {
  user_state: FinancialState;
  category: WalletCategory;
  budget_used: number;
  daily_safe_limit: number;
  forecast: string;
  recommendations: BudgetRecommendation[];
  /** Groq (or rules fallback): narrative + tips; per-card text may also be merged into recommendations. */
  aiAnalysis?: {
    summary: string;
    tips: string[];
    source: string;
  };
  usage: WalletBudgetUsage[];
  context?: {
    currency: 'PKR';
    weather?: string;
    /** 1–2 short what-to-do lines derived from current conditions. */
    weatherActions?: string[];
    /** Tavily: typical PKR ranges for the selected category (reference vs offer prices). */
    priceBenchmark?: {
      answer: string;
      query?: string;
      signals: string[];
      source: string;
    };
    insights?: string;
    signals?: string[];
    source?: string;
  };
}

export const categoryMeta: Record<Category, { icon: string; label: string }> = {
  coffee: { icon: 'bi-cup-hot', label: 'Coffee' },
  food: { icon: 'bi-egg-fried', label: 'Food' },
  retail: { icon: 'bi-bag', label: 'Retail' },
  gym: { icon: 'bi-activity', label: 'Fitness' },
  flash: { icon: 'bi-lightning-charge', label: 'Other' },
};
