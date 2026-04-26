const CATEGORIES = ["food", "transport", "shopping", "entertainment", "bills", "savings"];

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const toBudgetCategory = (category) => {
  const normalized = normalizeText(category);
  if (CATEGORIES.includes(normalized)) return normalized;
  if (["coffee", "restaurant", "cafe", "grocery"].includes(normalized)) return "food";
  if (["retail", "flash", "market"].includes(normalized)) return "shopping";
  if (["gym", "fitness"].includes(normalized)) return "entertainment";
  return "food";
};

const categoryKeywords = {
  food: ["restaurant", "cafe", "coffee", "food", "grocery", "meal", "lunch", "dinner", "bakery", "pizza", "burger"],
  transport: ["uber", "careem", "taxi", "fuel", "petrol", "bus", "metro", "transport", "parking"],
  shopping: ["shop", "store", "mall", "retail", "clothes", "fashion", "electronics", "market"],
  entertainment: ["movie", "cinema", "netflix", "game", "concert", "event", "fun", "entertainment"],
  bills: ["bill", "electric", "gas", "water", "internet", "phone", "rent", "utility"],
  savings: ["saving", "investment", "deposit", "fund", "transfer to savings"],
};

const categorizeTransaction = ({ description = "", merchant = "" }) => {
  const text = normalizeText(`${description} ${merchant}`);

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }

  return "shopping";
};

const getMonthBounds = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

const getRemainingDaysInMonth = (date = new Date()) => {
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return Math.max(1, endOfMonth.getDate() - date.getDate() + 1);
};

const getElapsedDaysInMonth = (date = new Date()) => Math.max(1, date.getDate());

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const calculateBudgetUsage = (wallet, transactions, date = new Date()) => {
  const budgets = wallet?.monthlyBudgets || {};
  const daysRemaining = getRemainingDaysInMonth(date);
  const elapsedDays = getElapsedDaysInMonth(date);

  return CATEGORIES.map((category) => {
    const budget = Number(budgets[category] || 0);
    const spent = transactions
      .filter((transaction) => transaction.category === category)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const remaining = Math.max(0, budget - spent);
    const percentUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    const dailySafeLimit = daysRemaining > 0 ? remaining / daysRemaining : remaining;
    const spendingVelocity = spent / elapsedDays;
    const state = detectFinancialState({ budget, spent, daysRemaining, elapsedDays });
    const forecast = forecastOverrun({ category, budget, spent, spendingVelocity });

    return {
      category,
      budget: roundMoney(budget),
      spent: roundMoney(spent),
      remaining: roundMoney(remaining),
      percentUsed,
      dailySafeLimit: roundMoney(dailySafeLimit),
      spendingVelocity: roundMoney(spendingVelocity),
      state,
      forecast,
    };
  });
};

const detectFinancialState = ({ budget, spent, elapsedDays, daysRemaining }) => {
  if (budget <= 0) return "balanced";

  const totalDays = elapsedDays + daysRemaining - 1;
  const expectedUsage = elapsedDays / totalDays;
  const actualUsage = spent / budget;

  if (actualUsage >= 1 || actualUsage > expectedUsage + 0.25) return "overspending";
  if (actualUsage > expectedUsage + 0.1) return "at_risk";
  if (actualUsage < expectedUsage - 0.2) return "under_budget";
  return "balanced";
};

const forecastOverrun = ({ category, budget, spent, spendingVelocity }) => {
  if (budget <= 0) return `No ${category} budget set yet.`;
  if (spent >= budget) return `You have already exceeded your ${category} budget.`;
  if (spendingVelocity <= 0) return `No current ${category} spending pace detected.`;

  const daysUntilExceeded = Math.floor((budget - spent) / spendingVelocity);
  if (daysUntilExceeded <= 0) return `You may exceed your ${category} budget today.`;

  return `At your current pace, you may exceed your ${category} budget in ${daysUntilExceeded} days.`;
};

const estimateOfferOriginalPrice = (offer) => {
  const target = normalizeText(offer.targetItem);
  const marginProducts = offer.metadata?.marginInsights?.products || [];
  const matchingProduct = marginProducts.find((product) => {
    const productName = normalizeText(product.product);
    return productName.includes(target) || target.includes(productName);
  });
  const sellPrice = Number(matchingProduct?.sellPrice || 0);
  const averagePerCustomer = Number(offer.metadata?.financeInsights?.averagePerCustomer || 0);

  return Math.max(sellPrice, averagePerCustomer, 1);
};

const getOfferPricing = (offer) => {
  const originalPrice = estimateOfferOriginalPrice(offer);
  const discountRate = Math.max(0, Math.min(100, Number(offer.discountPercentage || 0))) / 100;
  const savings = originalPrice * discountRate;
  const price = Math.max(0, originalPrice - savings);

  return {
    originalPrice: roundMoney(originalPrice),
    price: roundMoney(price),
    savings: roundMoney(savings),
  };
};

const distanceMeters = (from, to) => {
  if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) return null;

  const earthRadius = 6371000;
  const lat1 = (Number(from.lat) * Math.PI) / 180;
  const lat2 = (Number(to.lat) * Math.PI) / 180;
  const deltaLat = ((Number(to.lat) - Number(from.lat)) * Math.PI) / 180;
  const deltaLng = ((Number(to.lng) - Number(from.lng)) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getDayPart = (date = new Date()) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "dinner";
  return "late night";
};

const simulateOfferImpact = (offer, categoryState) => {
  const pricing = getOfferPricing(offer);
  const remainingAfterOffer = categoryState.remaining - pricing.price;
  const overBy = Math.max(0, Math.abs(remainingAfterOffer));

  if (remainingAfterOffer >= 0) {
    return {
      impact: "Keeps you within budget",
      simulation: `If you take this offer, you will remain within budget with $${roundMoney(remainingAfterOffer)} left for ${categoryState.category}.`,
      overBy: 0,
    };
  }

  return {
    impact: `May exceed budget by $${roundMoney(overBy)}`,
    simulation: `If you take this offer, your ${categoryState.category} budget may go over by $${roundMoney(overBy)}.`,
    overBy: roundMoney(overBy),
  };
};

const getStateRecommendationRules = (state) => {
  const normalizedState = normalizeText(state);
  if (normalizedState === "overspending") return "Prioritize low-cost, high-discount, value bundles.";
  if (normalizedState === "at_risk") return "Suggest optimized deals that reduce spending rate.";
  if (normalizedState === "under_budget") return "Unlock premium or experience-based offers.";
  return "Show best-value deals that preserve budget health.";
};

const getSuitability = ({ categoryState, pricing, discount }) => {
  if (!categoryState || categoryState.budget <= 0) {
    return {
      suitable: false,
      label: "No budget set",
      reason: "Set a budget for this category before taking offers from it.",
    };
  }

  if (pricing.price > categoryState.remaining) {
    return {
      suitable: false,
      label: "Over budget",
      reason: `This costs $${pricing.price}, but you only have $${categoryState.remaining} left in ${categoryState.category}.`,
    };
  }

  if (categoryState.state === "overspending") {
    const fitsDailyLimit = pricing.price <= categoryState.dailySafeLimit;
    const isStrongDiscount = discount >= 25;

    return {
      suitable: fitsDailyLimit && isStrongDiscount,
      label: fitsDailyLimit && isStrongDiscount ? "Emergency value pick" : "Too risky right now",
      reason: fitsDailyLimit && isStrongDiscount
        ? `Fits your $${categoryState.dailySafeLimit} daily safe limit and gives a strong ${discount}% discount.`
        : `Because ${categoryState.category} is overspending, only low-cost offers under $${categoryState.dailySafeLimit} with 25%+ off are recommended.`,
    };
  }

  if (categoryState.state === "at_risk") {
    const suitable = pricing.price <= Math.max(categoryState.dailySafeLimit, categoryState.remaining * 0.35);

    return {
      suitable,
      label: suitable ? "Safe budget pick" : "Would slow your recovery",
      reason: suitable
        ? `Keeps spending close to your safe pace with $${categoryState.remaining} left.`
        : `This is affordable, but too large for your current safe pace in ${categoryState.category}.`,
    };
  }

  if (categoryState.state === "under_budget") {
    return {
      suitable: true,
      label: "Unlocked by spare budget",
      reason: `You have $${categoryState.remaining} left, so this category can support a better-value experience.`,
    };
  }

  return {
    suitable: true,
    label: "Budget fit",
    reason: `Fits within your $${categoryState.remaining} remaining ${categoryState.category} budget.`,
  };
};

const rankOffersForBudgetState = ({
  offers,
  budgetStates,
  selectedCategory,
  userLocation,
  weatherSummary,
  now = new Date(),
  preferences = [],
}) => {
  const dayPart = getDayPart(now);
  const targetCategory = selectedCategory ? toBudgetCategory(selectedCategory) : undefined;

  return offers
    .map((offer) => {
      const category = toBudgetCategory(offer.category || "food");
      if (targetCategory && category !== targetCategory) return null;

      const categoryState = budgetStates.find((state) => state.category === category) ||
        budgetStates.find((state) => state.category === "food") ||
        budgetStates[0];
      const pricing = getOfferPricing(offer);
      const merchantLocation = offer.merchant?.location;
      const distance = distanceMeters(userLocation, merchantLocation);
      const simulation = simulateOfferImpact(offer, categoryState);
      const discount = Number(offer.discountPercentage || 0);
      const suitability = getSuitability({ categoryState, pricing, discount });
      if (!suitability.suitable) return null;

      let score = 0;

      score += Math.max(0, categoryState.remaining - pricing.price);
      score += pricing.price <= categoryState.dailySafeLimit ? 25 : 0;
      if (categoryState.state === "overspending") score += discount * 2 - pricing.price;
      if (categoryState.state === "at_risk") score += discount + (pricing.price <= categoryState.dailySafeLimit ? 30 : -20);
      if (categoryState.state === "balanced") score += discount + pricing.savings;
      if (categoryState.state === "under_budget") score += pricing.originalPrice + discount;
      if (distance !== null) score += Math.max(0, 30 - distance / 100);
      if (preferences.map(normalizeText).includes(category)) score += 15;
      if (normalizeText(offer.offerText).includes(dayPart)) score += 10;
      if (weatherSummary && /rain/i.test(weatherSummary) && /delivery|warm|soup|tea/i.test(offer.offerText)) score += 8;
      if (weatherSummary && /hot|heat|sun/i.test(weatherSummary) && /cold|iced|juice|smoothie|mint/i.test(offer.offerText)) score += 8;

      return {
        score,
        categoryState,
        pricing,
        simulation,
        suitability,
        distance,
        offer,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ offer, categoryState, pricing, simulation, suitability, distance }) => ({
      title: offer.offerText,
      offerId: offer._id,
      merchantName: offer.merchantName,
      category: categoryState.category,
      price: pricing.price,
      original_price: pricing.originalPrice,
      distance: distance === null ? "unknown" : `${roundMoney(distance / 1000)} km`,
      suitability: suitability.label,
      reason: `${getStateRecommendationRules(categoryState.state)} ${suitability.reason}`,
      impact: simulation.impact,
      simulation: simulation.simulation,
      savings: `$${pricing.savings}`,
      urgency: categoryState.state === "overspending" ? "high" : categoryState.state === "at_risk" ? "medium" : "low",
      explanation: `Shown because your ${categoryState.category} budget has $${categoryState.remaining} left, is ${categoryState.percentUsed}% used, and your safe daily limit is $${categoryState.dailySafeLimit}.`,
    }));
};

module.exports = {
  CATEGORIES,
  toBudgetCategory,
  categorizeTransaction,
  getMonthBounds,
  calculateBudgetUsage,
  detectFinancialState,
  forecastOverrun,
  getOfferPricing,
  rankOffersForBudgetState,
  simulateOfferImpact,
};
