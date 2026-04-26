const Merchant = require("../models/Merchant");
const Offer = require("../models/Offer");
const OfferClaim = require("../models/OfferClaim");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const mongoose = require("mongoose");
const { summarizeUploadedData } = require("../services/dataInsightService");
const { sendBudgetAlignedOfferEmail, sendCouponNotifications } = require("../services/emailService");
const { getContextInsights } = require("../services/tavilyService");
const { getWeatherContext } = require("../services/weatherService");
const {
  calculateBudgetUsage,
  getMonthBounds,
  getOfferPricing,
  toBudgetCategory,
} = require("../services/budgetIntelligenceService");

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const moodProfiles = {
  tired: {
    label: "Tired",
    intent: "restore energy without feeling heavy",
    keywords: ["coffee", "tea", "cold", "iced", "smoothie", "juice", "fresh", "protein", "energy"],
    impact: "It should give them a light energy lift and make the next part of the day feel easier.",
  },
  stressed: {
    label: "Stressed",
    intent: "feel comforted and calmer",
    keywords: ["dessert", "cake", "brownie", "sweet", "tea", "soup", "warm", "cookie", "comfort"],
    impact: "It should feel like a small comfort break and help them slow down for a moment.",
  },
  happy: {
    label: "Happy",
    intent: "keep the mood fun and shareable",
    keywords: ["pizza", "burger", "combo", "fries", "share", "family", "shake", "deal"],
    impact: "It should keep the mood playful and make the offer feel like a small celebration.",
  },
  hungry: {
    label: "Hungry",
    intent: "feel full and satisfied",
    keywords: ["meal", "burger", "sandwich", "pizza", "rice", "wrap", "pasta", "biryani", "platter", "combo"],
    impact: "It should satisfy hunger first, then make the deal feel practical rather than impulsive.",
  },
  cozy: {
    label: "Cozy",
    intent: "feel warm, relaxed, and settled",
    keywords: ["latte", "coffee", "tea", "hot", "croissant", "bakery", "cookie", "soup", "warm", "cocoa"],
    impact: "It should make the moment feel softer and more relaxed.",
  },
  focused: {
    label: "Focused",
    intent: "stay clear-headed and productive",
    keywords: ["coffee", "espresso", "protein", "smoothie", "juice", "energy", "quick", "wrap", "salad", "fresh"],
    impact: "It should support focus with quick energy while avoiding a slow, heavy choice.",
  },
};

const getOfferSearchText = (offer) =>
  [
    offer.category,
    offer.offerText,
    offer.reasonWhyNow,
    offer.targetItem,
    offer.metadata?.aiSuggestion,
    offer.metadata?.expectedBusinessImpact,
  ]
    .map(normalizeText)
    .join(" ");

const scoreOfferForMood = (offer, mood) => {
  const text = getOfferSearchText(offer);
  const matchedKeywords = mood.keywords.filter((keyword) => text.includes(keyword));
  const categoryBoost =
    mood.label === "Tired" && offer.category === "coffee" ? 8 :
    mood.label === "Hungry" && ["food", "flash"].includes(offer.category) ? 8 :
    mood.label === "Cozy" && offer.category === "coffee" ? 8 :
    mood.label === "Focused" && ["coffee", "gym"].includes(offer.category) ? 8 :
    0;

  return matchedKeywords.length * 10 + categoryBoost + Number(offer.discountPercentage || 0) / 5;
};

const summarizeOfferForMood = (offer) =>
  `${offer.merchantName}: ${offer.offerText}${offer.targetItem ? ` (${offer.targetItem})` : ""}`;

const generateCouponCode = (merchantName = "LOC") => {
  const prefix = String(merchantName)
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase() || "LOC";
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
};

const getDayPart = (time) => {
  const [hourPart] = String(time || "").split(":");
  const hour = Number.parseInt(hourPart, 10);

  if (Number.isNaN(hour)) {
    return "anytime";
  }

  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "late-night";
};

const formatMoney = (value) => Math.round(value || 0).toLocaleString();

const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`;

const average = (values) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const listNames = (items) =>
  (items || [])
    .map((item) => item.name || item.product)
    .filter(Boolean)
    .slice(0, 5)
    .join(", ") || "none detected";

const buildQuery = ({
  merchant,
  category,
  goal,
  location,
  time,
  weather,
  safeDiscountCeiling,
  activeForHours,
  insights,
}) =>
  [
    "Localyse AI: make one profit-safe customer offer.",
    `Goal:${goal}. Shop:${merchant.name}/${category}.`,
    `Ctx:${location}, ${time}, ${weather}.`,
    `Cap:${safeDiscountCeiling}%, ${activeForHours}h.`,
    `Finance rows:${insights.finance.rowsParsed}, rev:${formatMoney(insights.finance.totalRevenue)}, cost:${formatMoney(insights.finance.totalCosts)}, margin:${formatPercent(insights.finance.profitMargin)}, weak:${listNames(insights.finance.underperformingProducts)}.`,
    `Margin rows:${insights.margins.rowsParsed}, avg margin:${formatPercent(insights.margins.averageMargin)}, safest:${listNames(insights.margins.safestProducts)}.`,
    `Inventory rows:${insights.inventory.rowsParsed}, AI priority:${listNames(insights.inventory.priorityActionItems)}, overstock:${listNames(insights.inventory.overstockedItems)}, expiring:${listNames(insights.inventory.expiringSoon)}.`,
    "Suggest item, discount, first-come customer cap, reasoning, impact.",
  ].join(" ");

const goalCopy = {
  traffic: "bring more walk-ins today",
  clear: "move priority inventory quickly",
  margin: "push high-margin products safely",
  newcust: "welcome first-time customers",
};

const findMarginForItem = (margins, itemName) => {
  const normalizedItem = normalizeText(itemName);
  return (margins.products || []).find((item) => {
    const normalizedProduct = normalizeText(item.product);
    return normalizedProduct === normalizedItem ||
      normalizedProduct.includes(normalizedItem) ||
      normalizedItem.includes(normalizedProduct);
  });
};

const chooseFocusItem = (insights, category, goal) => {
  const safeMarginProduct = insights.margins.safestProducts?.[0]?.product;
  if (goal === "margin" && safeMarginProduct) {
    return safeMarginProduct;
  }

  const priority = insights.inventory.priorityActionItems?.[0]?.name;
  const expiring = insights.inventory.expiringSoon?.[0]?.name;
  const overstocked = insights.inventory.overstockedItems?.[0]?.name;
  const slowMoving = insights.inventory.slowMovingInventory?.[0]?.name;
  const underperforming = insights.finance.underperformingProducts?.[0]?.product;
  return priority || expiring || overstocked || slowMoving || underperforming || safeMarginProduct || category;
};

const getSafeDiscount = ({ maxDiscount, profitMargin, productMargin, goal, hasInventoryPressure }) => {
  const marginPercent = Math.max(0, Math.round((profitMargin || 0) * 100));
  const productMaxDiscount = productMargin?.maxSafeDiscount
    ? Math.round(productMargin.maxSafeDiscount * 100)
    : maxDiscount;
  const marginCap = marginPercent > 0 ? Math.max(5, marginPercent - 5) : maxDiscount;
  const goalBoost = goal === "clear" && hasInventoryPressure ? 5 : 0;
  return Math.max(5, Math.min(maxDiscount, productMaxDiscount, marginCap + goalBoost));
};

const calculateDiscountCeiling = ({ profitMargin, productMargin, goal, hasInventoryPressure }) => {
  if (productMargin?.maxSafeDiscount) {
    const productCap = Math.round(productMargin.maxSafeDiscount * 100);
    const conservativeCap = goal === "clear" && hasInventoryPressure ? productCap : productCap - 5;
    return Math.max(5, Math.min(35, conservativeCap));
  }

  const marginPercent = Math.round((profitMargin || 0) * 100);

  if (marginPercent > 10) {
    const protectedMarginDiscount = Math.max(5, marginPercent - 5);
    const inventoryBoost = goal === "clear" && hasInventoryPressure ? 5 : 0;
    return Math.min(35, protectedMarginDiscount + inventoryBoost);
  }

  return goal === "traffic" ? 10 : 8;
};

const chooseActiveWindow = ({ goal, hasInventoryPressure }) => {
  if (goal === "clear" && hasInventoryPressure) return 6;
  if (goal === "traffic") return 3;
  if (goal === "margin") return 5;
  return 4;
};

const estimateCustomerVolume = ({ goal, activeForHours, hasInventoryPressure }) => {
  const goalBase = {
    clear: 27,
    traffic: 34,
    margin: 22,
    newcust: 30,
  };
  const base = goalBase[goal] || 24;
  return base + Number(activeForHours) * 2 + (hasInventoryPressure ? 6 : 0);
};

const estimateRevenuePerClaim = (offer) => {
  const averagePerCustomer = Number(offer.metadata?.financeInsights?.averagePerCustomer || 0);
  const marginProduct = (offer.metadata?.marginInsights?.products || []).find((product) =>
    normalizeText(product.product).includes(normalizeText(offer.targetItem)) ||
    normalizeText(offer.targetItem).includes(normalizeText(product.product))
  );
  const sellPrice = Number(marginProduct?.sellPrice || 0);

  return Math.max(averagePerCustomer, sellPrice, 1);
};

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const recordWalletImpactForClaim = async ({ claimRecord, offer, customerId, amount }) => {
  if (!customerId || !claimRecord?._id) return null;

  const category = toBudgetCategory(offer.category);
  const walletAmount = roundMoney(amount);

  if (walletAmount <= 0) return null;

  const existingTransaction = await Transaction.findOne({ offerClaim: claimRecord._id });

  if (existingTransaction) {
    return {
      amount: existingTransaction.amount,
      currency: "USD",
      category: existingTransaction.category,
      transactionId: existingTransaction._id,
      alreadyRecorded: true,
      message: `$${roundMoney(existingTransaction.amount)} was already deducted from the customer's ${existingTransaction.category} budget.`,
    };
  }

  const transaction = await Transaction.create({
    user: customerId,
    amount: walletAmount,
    currency: "USD",
    merchant: offer.merchantName,
    description: `Redeemed offer: ${offer.targetItem || offer.offerText}`,
    category,
    source: "offer_claim",
    offer: offer._id,
    offerClaim: claimRecord._id,
    occurredAt: claimRecord.redeemedAt || new Date(),
    raw: {
      couponCode: claimRecord.couponCode,
      offerText: offer.offerText,
      discountPercentage: offer.discountPercentage,
    },
  });

  const wallet = await Wallet.findOne({ user: customerId });
  if (wallet) {
    wallet.balance = Math.max(0, roundMoney(Number(wallet.balance || 0) - walletAmount));
    await wallet.save();
  }

  return {
    amount: walletAmount,
    currency: "USD",
    category,
    transactionId: transaction._id,
    alreadyRecorded: false,
    message: `$${walletAmount} deducted from the customer's ${category} budget.`,
  };
};

const notifyBudgetAlignedCustomers = async (offer) => {
  const category = toBudgetCategory(offer.category);
  const pricing = getOfferPricing(offer);
  const { start, end } = getMonthBounds();
  const users = await User.find({ role: "customer", email: { $exists: true, $ne: "" } })
    .select("name email preferences location")
    .lean();

  const results = await Promise.allSettled(
    users.map(async (user) => {
      const wallet = await Wallet.findOne({ user: user._id }).lean();
      if (!wallet) return { skipped: true, reason: "no_wallet", user: user.email };

      const transactions = await Transaction.find({
        user: user._id,
        occurredAt: { $gte: start, $lt: end },
      }).lean();
      const categoryState = calculateBudgetUsage(wallet, transactions).find((state) => state.category === category);

      if (!categoryState || categoryState.budget <= 0) {
        return { skipped: true, reason: "no_category_budget", user: user.email };
      }

      if (pricing.price > categoryState.remaining) {
        return { skipped: true, reason: "over_remaining_budget", user: user.email };
      }

      if (categoryState.state === "overspending" && (pricing.price > categoryState.dailySafeLimit || Number(offer.discountPercentage || 0) < 25)) {
        return { skipped: true, reason: "not_safe_for_overspending", user: user.email };
      }

      if (categoryState.state === "at_risk" && pricing.price > Math.max(categoryState.dailySafeLimit, categoryState.remaining * 0.35)) {
        return { skipped: true, reason: "not_safe_for_at_risk", user: user.email };
      }

      const result = await sendBudgetAlignedOfferEmail({
        customerEmail: user.email,
        customerName: user.name,
        merchantName: offer.merchantName,
        offerText: offer.offerText,
        category,
        price: pricing.price,
        originalPrice: pricing.originalPrice,
        savings: pricing.savings,
        remainingBudget: categoryState.remaining,
        reason: `Taking it would leave about $${roundMoney(categoryState.remaining - pricing.price)} in your ${category} budget.`,
      });

      return { user: user.email, result };
    })
  );

  const sent = results.filter((result) => result.status === "fulfilled" && result.value?.result?.sent).length;
  const skipped = results.length - sent;
  console.log(`Budget-aligned offer email check complete for ${offer._id}: ${sent} sent, ${skipped} skipped.`);
};

const getExpiredUnclaimedReason = (offer) => {
  const goal = normalizeText(offer.metadata?.goal);
  const discount = Number(offer.discountPercentage || 0);
  const expectedCustomers = Number(offer.metadata?.expectedCustomerVolume || 0);
  const finance = offer.metadata?.financeInsights || {};
  const inventory = offer.metadata?.inventoryInsights || {};
  const targetItem = offer.targetItem || "this product";

  if (discount < 10) {
    return `AI reason: the discount may have been too low to create urgency for ${targetItem}.`;
  }

  if (goal === "traffic" && finance.slowDays?.length > 0) {
    const slowDay = finance.slowDays[0];
    return `AI reason: timing may not have matched the strongest slow-day opportunity (${slowDay.day || slowDay.date || "detected slow period"}).`;
  }

  if (goal === "clear" && inventory.priorityActionItems?.length > 0) {
    return `AI reason: product choice may need stronger clearance messaging or a smaller first-come cap for ${targetItem}.`;
  }

  if (expectedCustomers > 40) {
    return "AI reason: the first-come customer cap may have been too ambitious for the active offer window.";
  }

  return "AI reason: likely mismatch between product, timing, and customer intent. Try a clearer headline or different daypart.";
};

const buildCustomerOfferText = ({ goal, merchantName, focusItem, discountPercentage, expectedCustomerVolume }) => {
  const templates = {
    clear: [
      `Stock-clearance special: ${discountPercentage}% off ${focusItem} at ${merchantName}`,
      `Help us clear today's fresh ${focusItem}: save ${discountPercentage}%`,
      `Limited clearance deal: ${discountPercentage}% off ${focusItem}`,
    ],
    traffic: [
      `Slow-hour pick-me-up: ${discountPercentage}% off ${focusItem} at ${merchantName}`,
      `Drop by today for ${discountPercentage}% off ${focusItem}`,
      `Beat the quiet hours: ${discountPercentage}% off ${focusItem}`,
    ],
    margin: [
      `Customer-favorite special: ${discountPercentage}% off premium ${focusItem}`,
      `Treat yourself: ${discountPercentage}% off ${focusItem} at ${merchantName}`,
      `Featured deal today: ${discountPercentage}% off ${focusItem}`,
    ],
    newcust: [
      `First visit treat: ${discountPercentage}% off ${focusItem} at ${merchantName}`,
      `New here? Try ${focusItem} for ${discountPercentage}% off`,
      `Welcome offer: ${discountPercentage}% off ${focusItem}`,
    ],
  };
  const options = templates[goal] || templates.traffic;
  const selected = options[expectedCustomerVolume % options.length];
  return `${selected}. First ${expectedCustomerVolume} customers only.`;
};

const buildAiSuggestion = ({ contextInsights, copy, expectedCustomerVolume, expectedBusinessImpact }) => {
  const answer = String(contextInsights.answer || "").replace(/\s+/g, " ").trim();
  const localDecision = `Recommended offer: ${copy.offerText} ${expectedBusinessImpact}`;

  if (contextInsights.source === "tavily" && answer && !answer.includes("No direct answer")) {
    const aiContext = answer.length > 120 ? `${answer.slice(0, 117)}...` : answer;
    return `${localDecision} AI context: ${aiContext}`;
  }

  return localDecision;
};

const buildOfferCopy = ({
  merchant,
  category,
  goal,
  maxDiscount,
  location,
  dayPart,
  weather,
  contextInsights,
  insights,
}) => {
  const selectedCategory = normalizeText(category);
  const goalPhrase = goalCopy[goal] || "match current customer intent";
  const focusItem = chooseFocusItem(insights, selectedCategory, goal);
  const productMargin = findMarginForItem(insights.margins, focusItem);
  const hasInventoryPressure =
    insights.inventory.priorityActionItems.length > 0 ||
    insights.inventory.overstockedItems.length > 0 ||
    insights.inventory.expiringSoon.length > 0;
  const discountPercentage = getSafeDiscount({
    maxDiscount,
    profitMargin: insights.finance.profitMargin,
    productMargin,
    goal,
    hasInventoryPressure,
  });
  const sourcePhrase =
    contextInsights.source === "tavily"
      ? "live city signals"
      : "Localyse city signals";
  const reasonByGoal = {
    clear: `${focusItem} is a clearance candidate from your inventory sheet, so the offer is designed to move stock without crossing the safe discount limit.`,
    traffic: `Sales data points to traffic-building opportunities, so this offer is short and urgency-driven for ${dayPart} walk-ins.`,
    margin: `${focusItem} has strong product margin room, so this offer can feel attractive while protecting profitability.`,
    newcust: `This is framed as a low-friction first-visit offer to bring new customers into ${merchant.name}.`,
  };
  const offerText = buildCustomerOfferText({
    goal,
    merchantName: merchant.name,
    focusItem,
    discountPercentage,
    expectedCustomerVolume: Math.max(5, Math.round((discountPercentage / 100) * 100)),
  }).replace(/ First \d+ customers only\.$/, ".");

  return {
    discountPercentage,
    targetItem: focusItem,
    offerText,
    reasonWhyNow: `${reasonByGoal[goal] || `${sourcePhrase} suggest ${dayPart} demand around ${location}; ${weather} conditions and the goal to ${goalPhrase} make this offer timely.`} ${sourcePhrase} and product margin data support this timing.`,
  };
};

const generateOffers = async (req, res, next) => {
  try {
    const merchantId = String(req.body.merchantId || "").trim();
    const goal = normalizeText(req.body.goal);
    const uploadedInsights = summarizeUploadedData(req.files);
    const currentTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (!merchantId || !goal) {
      return res.status(400).json({
        message: "merchantId and goal are required.",
      });
    }

    if (!req.files?.financeFile?.[0] || !req.files?.inventoryFile?.[0] || !req.files?.marginFile?.[0]) {
      return res.status(400).json({
        message: "Finance, inventory, and product margin sheets are required for AI offer generation.",
      });
    }

    const merchant = await Merchant.findById(merchantId).lean();

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found." });
    }

    const category = normalizeText(merchant.category);
    const location = Number.isFinite(Number(merchant.location?.lat)) && Number.isFinite(Number(merchant.location?.lng))
      ? `${merchant.location.lat},${merchant.location.lng}`
      : merchant.location?.address || merchant.name;
    const hasInventoryPressure =
      uploadedInsights.inventory.priorityActionItems.length > 0 ||
      uploadedInsights.inventory.overstockedItems.length > 0 ||
      uploadedInsights.inventory.expiringSoon.length > 0;
    const focusItem = chooseFocusItem(uploadedInsights, category, goal);
    const productMargin = findMarginForItem(uploadedInsights.margins, focusItem);
    const safeDiscountCeiling = calculateDiscountCeiling({
      profitMargin: uploadedInsights.finance.profitMargin,
      productMargin,
      goal,
      hasInventoryPressure,
    });
    const activeForHours = chooseActiveWindow({ goal, hasInventoryPressure });
    const weatherContext = await getWeatherContext(location);
    const contextQuery = buildQuery({
      merchant,
      category,
      goal,
      location,
      time: currentTime,
      weather: weatherContext.summary,
      safeDiscountCeiling,
      activeForHours,
      insights: uploadedInsights,
    });
    const contextInsights = await getContextInsights(contextQuery);
    const dayPart = getDayPart(currentTime);
    const copy = buildOfferCopy({
      merchant,
      category,
      goal,
      maxDiscount: safeDiscountCeiling,
      location,
      dayPart,
      weather: weatherContext.summary,
      contextInsights,
      insights: uploadedInsights,
    });
    const expectedCustomerVolume = estimateCustomerVolume({
      goal,
      activeForHours,
      hasInventoryPressure,
    });
    const protectedMargin = productMargin?.margin ||
      uploadedInsights.margins.averageMargin ||
      uploadedInsights.finance.profitMargin;
    const expectedBusinessImpact =
      goal === "clear"
        ? `Expected to reduce pressure on ${copy.targetItem} inventory while protecting an estimated ${formatPercent(protectedMargin)} product margin.`
        : `Expected to attract about ${expectedCustomerVolume} customers during the ${activeForHours}-hour offer window.`;
    const finalOfferText = buildCustomerOfferText({
      goal,
      merchantName: merchant.name,
      focusItem: copy.targetItem,
      discountPercentage: copy.discountPercentage,
      expectedCustomerVolume,
    });
    const finalCopy = { ...copy, offerText: finalOfferText };
    const aiSuggestion = buildAiSuggestion({
      contextInsights,
      copy: finalCopy,
      expectedCustomerVolume,
      expectedBusinessImpact,
    });
    const storedOffer = await Offer.create({
      merchant: merchant._id,
      merchantName: merchant.name,
      category,
      ...finalCopy,
      expiresAt: new Date(Date.now() + activeForHours * 60 * 60 * 1000),
      metadata: {
        inputLocation: location,
        inputAddress: merchant.location?.address,
        inputWeather: weatherContext.summary,
        inputTime: currentTime,
        goal,
        maxDiscount: safeDiscountCeiling,
        activeForHours,
        expectedCustomerVolume,
        expectedBusinessImpact,
        aiSuggestion,
        financeInsights: uploadedInsights.finance,
        marginInsights: uploadedInsights.margins,
        inventoryInsights: uploadedInsights.inventory,
        uploadedFiles: uploadedInsights.files,
        tavilyAnswer: contextInsights.answer,
      },
    });

    notifyBudgetAlignedCustomers(storedOffer).catch((error) => {
      console.error("Budget-aligned offer email check failed:", error.message);
    });

    return res.status(201).json({
      context: {
        source: contextInsights.source,
        answer: contextInsights.answer,
        signals: contextInsights.signals,
      },
      count: 1,
      offers: [storedOffer],
    });
  } catch (error) {
    return next(error);
  }
};

const getOffers = async (_req, res, next) => {
  try {
    const offers = await Offer.find({ expiresAt: { $gt: new Date() } })
      .populate("merchant", "name email location category")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json(offers);
  } catch (error) {
    return next(error);
  }
};

const claimOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { customerId, customerName, customerEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid offer id." });
    }

    const offer = await Offer.findById(id).populate("merchant", "name email");

    if (!offer) {
      return res.status(404).json({ message: "Offer not found." });
    }

    if (offer.expiresAt <= new Date()) {
      return res.status(410).json({ message: "This offer has expired." });
    }

    const customer = mongoose.Types.ObjectId.isValid(customerId)
      ? await User.findById(customerId).select("name email").lean()
      : null;
    const resolvedCustomerName = customer?.name || customerName;
    const resolvedCustomerEmail = customer?.email || customerEmail;
    const normalizedCustomerEmail = normalizeText(resolvedCustomerEmail);

    if (!resolvedCustomerName || !normalizedCustomerEmail) {
      return res.status(400).json({ message: "Customer name and email are required to claim this offer." });
    }

    const merchantId = offer.merchant?._id || offer.merchant;
    const duplicateFilters = [{ customerEmail: normalizedCustomerEmail }];

    if (customer?._id) {
      duplicateFilters.push({ customer: customer._id });
    }

    const existingClaimRecord = await OfferClaim.findOne({
      offer: offer._id,
      $or: duplicateFilters,
    }).lean();

    if (existingClaimRecord) {
      const claimCount = await OfferClaim.countDocuments({ offer: offer._id });
      await Offer.updateOne({ _id: offer._id }, { $set: { claimCount } });

      return res.json({
        message: "Offer already claimed.",
        offerId: offer._id,
        claimCount,
        couponCode: existingClaimRecord.couponCode,
        estimatedRevenue: existingClaimRecord.estimatedRevenue,
        alreadyClaimed: true,
      });
    }

    const legacyClaim = (offer.claims || []).find((claim) => {
      if (customerId && claim.customerId === customerId) return true;
      return normalizedCustomerEmail && normalizeText(claim.customerEmail) === normalizedCustomerEmail;
    });
    const estimatedRevenue = legacyClaim?.estimatedRevenue || estimateRevenuePerClaim(offer);
    const couponCode = legacyClaim?.couponCode || generateCouponCode(offer.merchantName);
    const pendingNotifications = legacyClaim?.notifications || { customer: { sent: false, reason: "queued" } };
    const claimDate = legacyClaim?.claimedAt || new Date();
    const customerInfo = {
      id: customer?._id,
      name: legacyClaim?.customerName || resolvedCustomerName,
      email: normalizedCustomerEmail,
    };
    const merchantInfo = {
      id: merchantId,
      name: offer.merchantName,
      email: offer.merchant?.email,
    };
    const offerDetails = {
      id: offer._id,
      text: offer.offerText,
      targetItem: offer.targetItem,
      discountPercentage: offer.discountPercentage,
      category: offer.category,
      expiresAt: offer.expiresAt,
      reasonWhyNow: offer.reasonWhyNow,
    };

    const claimRecord = await OfferClaim.findOneAndUpdate(
      {
        offer: offer._id,
        customerEmail: normalizedCustomerEmail,
      },
      {
        $setOnInsert: {
          merchant: merchantId,
          merchantName: offer.merchantName,
          merchantEmail: offer.merchant?.email,
          offer: offer._id,
          offerText: offer.offerText,
          targetItem: offer.targetItem,
          discountPercentage: offer.discountPercentage,
          category: offer.category,
          offerExpiresAt: offer.expiresAt,
          customer: customer?._id,
          customerName: customerInfo.name,
          customerEmail: normalizedCustomerEmail,
          couponCode,
          status: legacyClaim?.redeemedAt ? "redeemed" : "claimed",
          estimatedRevenue,
          notifications: pendingNotifications,
          customerInfo,
          merchantInfo,
          offerDetails,
          claimedAt: claimDate,
          redeemedAt: legacyClaim?.redeemedAt,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const claimCount = await OfferClaim.countDocuments({ offer: offer._id });
    await Offer.updateOne({ _id: offer._id }, { $set: { claimCount } });

    sendCouponNotifications({
      customerEmail: resolvedCustomerEmail,
      merchantName: offer.merchantName,
      offerText: offer.offerText,
      couponCode: claimRecord.couponCode,
    })
      .then(async (notifications) => {
        await OfferClaim.updateOne({ _id: claimRecord._id }, { $set: { notifications } });
      })
      .catch(async (error) => {
        const notifications = {
          customer: {
            sent: false,
            reason: "send_failed",
            message: error.message,
          },
        };

        console.error("Coupon email failed:", error.message);
        await OfferClaim.updateOne({ _id: claimRecord._id }, { $set: { notifications } });
      });

    return res.json({
      message: "Offer claimed successfully.",
      offerId: offer._id,
      claimCount,
      couponCode: claimRecord.couponCode,
      estimatedRevenue: claimRecord.estimatedRevenue,
      notifications: pendingNotifications,
      alreadyClaimed: false,
    });

  } catch (error) {
    return next(error);
  }
};

const syncLegacyClaimsForMerchant = async (merchantId) => {
  const offers = await Offer.find({
    merchant: merchantId,
    "claims.0": { $exists: true },
  })
    .populate("merchant", "name email")
    .select("merchant merchantName offerText targetItem discountPercentage category expiresAt claims")
    .lean();

  const operations = offers.flatMap((offer) =>
    (offer.claims || [])
      .filter((claim) => claim.couponCode && claim.customerEmail)
      .map((claim) => {
        const customerObjectId = mongoose.Types.ObjectId.isValid(claim.customerId)
          ? new mongoose.Types.ObjectId(claim.customerId)
          : undefined;

        return {
          updateOne: {
            filter: {
              offer: offer._id,
              customerEmail: normalizeText(claim.customerEmail),
            },
            update: {
              $setOnInsert: {
                merchant: offer.merchant?._id || offer.merchant,
                merchantName: offer.merchantName,
                merchantEmail: offer.merchant?.email,
                offer: offer._id,
                offerText: offer.offerText,
                targetItem: offer.targetItem,
                discountPercentage: offer.discountPercentage,
                category: offer.category,
                offerExpiresAt: offer.expiresAt,
                customer: customerObjectId,
                customerName: claim.customerName || "Customer",
                customerEmail: normalizeText(claim.customerEmail),
                couponCode: claim.couponCode,
                status: claim.redeemedAt ? "redeemed" : "claimed",
                estimatedRevenue: claim.estimatedRevenue || 0,
                notifications: claim.notifications,
                customerInfo: {
                  id: customerObjectId,
                  name: claim.customerName || "Customer",
                  email: normalizeText(claim.customerEmail),
                },
                merchantInfo: {
                  id: offer.merchant?._id || offer.merchant,
                  name: offer.merchantName,
                  email: offer.merchant?.email,
                },
                offerDetails: {
                  id: offer._id,
                  text: offer.offerText,
                  targetItem: offer.targetItem,
                  discountPercentage: offer.discountPercentage,
                  category: offer.category,
                  expiresAt: offer.expiresAt,
                },
                claimedAt: claim.claimedAt || new Date(),
                redeemedAt: claim.redeemedAt,
              },
            },
            upsert: true,
          },
        };
      })
  );

  if (operations.length > 0) {
    try {
      await OfferClaim.bulkWrite(operations, { ordered: false });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }
};

const getOfferAnalytics = async (req, res, next) => {
  try {
    const merchantId = String(req.query.merchantId || "").trim();
    const query = {};

    if (merchantId) {
      if (!mongoose.Types.ObjectId.isValid(merchantId)) {
        return res.status(400).json({ message: "Valid merchantId is required." });
      }

      query.merchant = merchantId;
    }

    const offers = await Offer.find(query).sort({ createdAt: -1 }).lean();
    const now = new Date();
    const publishedCount = offers.length;
    const claimedCount = offers.reduce((sum, offer) => sum + (offer.claimCount || 0), 0);
    const claimRate = publishedCount > 0 ? Math.round((claimedCount / publishedCount) * 100) : 0;
    const topOffer =
      [...offers].sort((a, b) => (b.claimCount || 0) - (a.claimCount || 0))[0] || null;
    const topClaimedOffer = topOffer && topOffer.claimCount > 0 ? topOffer : null;
    const claimDelays = offers.flatMap((offer) =>
      (offer.claims || []).map((claim) =>
        Math.max(0, new Date(claim.claimedAt).getTime() - new Date(offer.createdAt).getTime())
      )
    );
    const averageTimeToClaimMinutes = Math.round(average(claimDelays) / 60000);
    const expiredUnclaimed = offers
      .filter((offer) => offer.expiresAt && new Date(offer.expiresAt) <= now && (offer.claimCount || 0) === 0)
      .map((offer) => ({
        id: offer._id,
        offerText: offer.offerText,
        targetItem: offer.targetItem,
        expiredAt: offer.expiresAt,
        aiReason: getExpiredUnclaimedReason(offer),
      }));
    const revenueAttributed = offers.reduce((sum, offer) => {
      const claimRevenue = (offer.claims || []).reduce(
        (claimSum, claim) => claimSum + Number(claim.estimatedRevenue || estimateRevenuePerClaim(offer)),
        0
      );

      return sum + claimRevenue;
    }, 0);
    const baselineValues = offers
      .map((offer) => {
        const finance = offer.metadata?.financeInsights || {};
        const rows = Number(finance.rowsParsed || 0);
        return rows > 0 ? Number(finance.totalRevenue || 0) / rows : 0;
      })
      .filter((value) => value > 0);
    const baselineDayRevenue = average(baselineValues);

    return res.json({
      summary: {
        publishedCount,
        claimedCount,
        claimRate,
        averageTimeToClaimMinutes,
        expiredUnclaimedCount: expiredUnclaimed.length,
        revenueAttributed: Math.round(revenueAttributed),
        baselineDayRevenue: Math.round(baselineDayRevenue),
        estimatedUplift: Math.round(revenueAttributed - baselineDayRevenue),
      },
      topOffer: topClaimedOffer
        ? {
            id: topClaimedOffer._id,
            offerText: topClaimedOffer.offerText,
            claimCount: topClaimedOffer.claimCount || 0,
            targetItem: topClaimedOffer.targetItem,
          }
        : null,
      expiredUnclaimed,
      offers: offers.map((offer) => ({
        id: offer._id,
        offerText: offer.offerText,
        merchantName: offer.merchantName,
        claimCount: offer.claimCount || 0,
        expectedCustomerVolume: offer.metadata?.expectedCustomerVolume || 0,
        revenueAttributed: Math.round(
          (offer.claims || []).reduce(
            (sum, claim) => sum + Number(claim.estimatedRevenue || estimateRevenuePerClaim(offer)),
            0
          )
        ),
        createdAt: offer.createdAt,
        expiresAt: offer.expiresAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const getMerchantClaims = async (req, res, next) => {
  try {
    const merchantId = String(req.query.merchantId || "").trim();

    if (!mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({ message: "Valid merchantId is required." });
    }

    await syncLegacyClaimsForMerchant(merchantId);

    const claimRecords = await OfferClaim.find({ merchant: merchantId })
      .sort({ claimedAt: -1 })
      .lean();

    const claims = claimRecords.map((claim) => ({
      id: String(claim._id),
      merchantId: String(claim.merchant),
      merchantName: claim.merchantName,
      merchantEmail: claim.merchantEmail,
      offerId: String(claim.offer),
      offerText: claim.offerText,
      targetItem: claim.targetItem,
      discountPercentage: claim.discountPercentage,
      category: claim.category,
      customerId: claim.customer ? String(claim.customer) : undefined,
      customerName: claim.customerName || "Customer",
      customerEmail: claim.customerEmail || "No email saved",
      couponCode: claim.couponCode,
      status: claim.status,
      estimatedRevenue: claim.estimatedRevenue || 0,
      claimedAt: claim.claimedAt,
      redeemedAt: claim.redeemedAt || null,
      expiresAt: claim.offerExpiresAt,
    }));

    return res.json({
      summary: {
        totalClaims: claims.length,
        redeemedClaims: claims.filter((claim) => claim.status === "redeemed").length,
        pendingClaims: claims.filter((claim) => claim.status !== "redeemed").length,
      },
      claims,
    });
  } catch (error) {
    return next(error);
  }
};

const getCustomerClaims = async (req, res, next) => {
  try {
    const customerId = String(req.query.customerId || "").trim();
    const customerEmail = normalizeText(req.query.customerEmail);
    const filters = [];

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ message: "Valid customerId is required." });
      }

      filters.push({ customer: customerId });
    }

    if (customerEmail) {
      filters.push({ customerEmail });
    }

    if (filters.length === 0) {
      return res.status(400).json({ message: "customerId or customerEmail is required." });
    }

    const claimRecords = await OfferClaim.find({ $or: filters })
      .sort({ claimedAt: -1 })
      .lean();

    const claims = claimRecords.map((claim) => ({
      id: String(claim._id),
      merchantId: String(claim.merchant),
      merchantName: claim.merchantName,
      merchantEmail: claim.merchantEmail,
      offerId: String(claim.offer),
      offerText: claim.offerText,
      targetItem: claim.targetItem,
      discountPercentage: claim.discountPercentage,
      category: claim.category,
      customerId: claim.customer ? String(claim.customer) : undefined,
      customerName: claim.customerName || "Customer",
      customerEmail: claim.customerEmail || "No email saved",
      couponCode: claim.couponCode,
      status: claim.status,
      estimatedRevenue: claim.estimatedRevenue || 0,
      claimedAt: claim.claimedAt,
      redeemedAt: claim.redeemedAt || null,
      expiresAt: claim.offerExpiresAt,
    }));

    return res.json({
      summary: {
        totalClaims: claims.length,
        redeemedClaims: claims.filter((claim) => claim.status === "redeemed").length,
        pendingClaims: claims.filter((claim) => claim.status !== "redeemed").length,
      },
      claims,
    });
  } catch (error) {
    return next(error);
  }
};

const getCustomerFoodAnalysis = async (req, res, next) => {
  try {
    const customerId = String(req.query.customerId || "").trim();
    const customerEmail = normalizeText(req.query.customerEmail);
    const filters = [];

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({ message: "Valid customerId is required." });
      }

      filters.push({ customer: customerId });
    }

    if (customerEmail) {
      filters.push({ customerEmail });
    }

    if (filters.length === 0) {
      return res.status(400).json({ message: "customerId or customerEmail is required." });
    }

    const [customer, claims, liveOffers] = await Promise.all([
      customerId && mongoose.Types.ObjectId.isValid(customerId)
        ? User.findById(customerId).select("name email preferences").lean()
        : User.findOne({ email: customerEmail }).select("name email preferences").lean(),
      OfferClaim.find({ $or: filters }).sort({ claimedAt: -1 }).lean(),
      Offer.find({ expiresAt: { $gt: new Date() } })
        .populate("merchant", "name location category")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const categoryCounts = claims.reduce((counts, claim) => {
      const category = normalizeText(claim.category || "other");
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
    const merchantCounts = claims.reduce((counts, claim) => {
      const merchant = String(claim.merchantName || "").trim();
      if (merchant) counts[merchant] = (counts[merchant] || 0) + 1;
      return counts;
    }, {});
    const claimedDiscounts = claims
      .map((claim) => Number(claim.discountPercentage || 0))
      .filter((discount) => discount > 0);
    const timeCounts = claims.reduce((counts, claim) => {
      const bucket = getDayPart(new Date(claim.claimedAt || Date.now()).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }));
      counts[bucket] = (counts[bucket] || 0) + 1;
      return counts;
    }, {});
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "food";
    const topMerchant = Object.entries(merchantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "local spots";
    const topTime = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "anytime";
    const averageDiscount = Math.round(average(claimedDiscounts));
    const preferences = customer?.preferences || [];
    const claimedTexts = claims
      .slice(0, 8)
      .map((claim) => `${claim.offerText} at ${claim.merchantName}`)
      .join("; ");
    const liveOfferTexts = liveOffers
      .slice(0, 8)
      .map((offer) => `${offer.offerText} at ${offer.merchantName}`)
      .join("; ");

    const query = [
      "Localyse customer food analysis for Islamabad.",
      `Customer:${customer?.name || "customer"}. Preferences:${preferences.join(", ") || "none"}.`,
      `Claimed/redeemed categories:${JSON.stringify(categoryCounts)}. Favorite merchant:${topMerchant}.`,
      `Time pattern:${topTime}. Avg claimed discount:${averageDiscount || 0}%.`,
      `Claim history:${claimedTexts || "none yet"}. Live offers:${liveOfferTexts || "none"}.`,
      "Generate sweet concise food recommendations, avoid categories they ignore, suggest best time and offer style.",
    ].join(" ");
    const ai = await getContextInsights(query);
    const recommendations = liveOffers
      .filter((offer) => normalizeText(offer.category) === topCategory || preferences.includes(offer.category))
      .slice(0, 3)
      .map((offer) => ({
        offerId: offer._id,
        merchantName: offer.merchantName,
        offerText: offer.offerText,
        reason: `Matches your ${topCategory} pattern${averageDiscount ? ` and ${averageDiscount}% discount comfort zone` : ""}.`,
      }));

    if (recommendations.length === 0) {
      recommendations.push({
        offerId: null,
        merchantName: topMerchant,
        offerText: `Look for ${topCategory} offers around ${topTime}.`,
        reason: "This is based on your claim and preference history.",
      });
    }

    return res.json({
      tasteProfile: {
        favoriteCategory: topCategory,
        favoriteMerchant: topMerchant,
        preferredTime: topTime,
        averageClaimedDiscount: averageDiscount || 0,
        totalClaims: claims.length,
        redeemedClaims: claims.filter((claim) => claim.status === "redeemed").length,
        preferences,
      },
      sweetSummary:
        claims.length > 0
          ? `You feel like a ${topTime} ${topCategory} explorer who likes ${averageDiscount || "good"}% deals.`
          : "Your food personality is just starting to bloom. Claim a few offers and Localyse will learn your taste.",
      aiSuggestion: ai.answer,
      signals: ai.signals,
      source: ai.source,
      recommendations,
    });
  } catch (error) {
    return next(error);
  }
};

const getMoodSuggestion = async (req, res, next) => {
  try {
    const moodId = normalizeText(req.body.mood);
    const customerId = String(req.body.customerId || "").trim();
    const customerEmail = normalizeText(req.body.customerEmail);
    const offerIds = Array.isArray(req.body.offerIds)
      ? req.body.offerIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).slice(0, 12)
      : [];
    const mood = moodProfiles[moodId];

    if (!mood) {
      return res.status(400).json({ message: "Valid mood is required." });
    }

    const [customer, claims, offers] = await Promise.all([
      customerId && mongoose.Types.ObjectId.isValid(customerId)
        ? User.findById(customerId).select("name email preferences").lean()
        : customerEmail
          ? User.findOne({ email: customerEmail }).select("name email preferences").lean()
          : null,
      customerId || customerEmail
        ? OfferClaim.find({
            $or: [
              ...(customerId && mongoose.Types.ObjectId.isValid(customerId) ? [{ customer: customerId }] : []),
              ...(customerEmail ? [{ customerEmail }] : []),
            ],
          })
            .sort({ claimedAt: -1 })
            .limit(8)
            .lean()
        : [],
      Offer.find({
        expiresAt: { $gt: new Date() },
        ...(offerIds.length > 0 ? { _id: { $in: offerIds } } : {}),
      })
        .populate("merchant", "name location category")
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
    ]);

    if (offers.length === 0) {
      return res.json({
        mood: moodId,
        bestOfferId: null,
        suggestion: `No live offer is available for your ${mood.label.toLowerCase()} mood yet.`,
        moodImpact: "Check again after merchants publish fresh offers.",
        source: "local",
        signals: [],
      });
    }

    const bestOffer = [...offers].sort((a, b) => scoreOfferForMood(b, mood) - scoreOfferForMood(a, mood))[0];
    const preferences = customer?.preferences || [];
    const claimSummary = claims
      .slice(0, 5)
      .map((claim) => `${claim.category}: ${claim.offerText}`)
      .join("; ");
    const offerSummary = offers.map(summarizeOfferForMood).join("; ");
    const ai = await getContextInsights(
      [
        "Localyse AI mood recommendation.",
        `Customer:${customer?.name || "customer"}. Current mood:${mood.label}. Intent:${mood.intent}.`,
        `Preferences:${preferences.join(", ") || "none"}. Recent claimed offers:${claimSummary || "none"}.`,
        `Live offer choices:${offerSummary}.`,
        `Recommend one offer and explain in one sentence how it may affect the customer's ${mood.label.toLowerCase()} mood.`,
      ].join(" ")
    );

    return res.json({
      mood: moodId,
      bestOfferId: String(bestOffer._id),
      merchantName: bestOffer.merchantName,
      offerText: bestOffer.offerText,
      suggestion: `Choose ${bestOffer.offerText} at ${bestOffer.merchantName}. ${ai.answer}`,
      moodImpact: mood.impact,
      source: ai.source,
      signals: ai.signals,
    });
  } catch (error) {
    return next(error);
  }
};

const redeemClaim = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const merchantId = String(req.body.merchantId || "").trim();

    if (!mongoose.Types.ObjectId.isValid(claimId)) {
      return res.status(400).json({ message: "Invalid claim id." });
    }

    if (!mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({ message: "Valid merchantId is required." });
    }

    const claim = await OfferClaim.findOne({
      _id: claimId,
      merchant: merchantId,
    });

    if (!claim) {
      return res.status(404).json({ message: "Coupon claim not found for this merchant." });
    }

    const wasRedeemed = claim.status === "redeemed" || Boolean(claim.redeemedAt);
    let walletImpact = null;

    if (!wasRedeemed) {
      claim.status = "redeemed";
      claim.redeemedAt = new Date();
      await claim.save();

      await Offer.updateOne(
        { _id: claim.offer, "claims.couponCode": claim.couponCode },
        {
          $set: {
            "claims.$.redeemedAt": claim.redeemedAt,
          },
        }
      );
    }

    const offer = await Offer.findById(claim.offer);
    const customerId = claim.customer || (claim.customerEmail
      ? (await User.findOne({ email: claim.customerEmail }).select("_id").lean())?._id
      : null);

    if (offer && customerId) {
      const pricing = getOfferPricing(offer);
      walletImpact = await recordWalletImpactForClaim({
        claimRecord: claim,
        offer,
        customerId,
        amount: pricing.price || claim.estimatedRevenue,
      });
    }

    return res.json({
      message: wasRedeemed ? "Coupon already redeemed." : "Coupon marked as redeemed.",
      claimId,
      redeemedAt: claim.redeemedAt,
      walletImpact,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = String(req.body.merchantId || req.query.merchantId || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid offer id." });
    }

    if (!mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({ message: "Valid merchantId is required." });
    }

    const deletedOffer = await Offer.findOneAndDelete({
      _id: id,
      merchant: merchantId,
    });

    if (!deletedOffer) {
      return res.status(404).json({ message: "Offer not found for this merchant." });
    }

    return res.json({ message: "Offer deleted successfully.", offerId: id });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  generateOffers,
  getOffers,
  claimOffer,
  getOfferAnalytics,
  getMerchantClaims,
  getCustomerClaims,
  getCustomerFoodAnalysis,
  getMoodSuggestion,
  redeemClaim,
  deleteOffer,
};
