const axios = require("axios");
const { formatPkr } = require("../utils/currency");

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const isConfigured = (key) => Boolean(key && String(key).trim() && !/^put_key/i.test(String(key)));

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const m = String(text || "").match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const SYSTEM = `You are Localyse's consumer wallet coach for Islamabad. You receive:
- Selected budget category and full wallet state (spent, remaining, % used, daily safe limit, financial state: overspending|at_risk|balanced|under_budget).
- All category rollups (brief).
- Recent transactions (amounts, categories, merchants) when provided.
- Shortlist of pre-ranked local offers (title, price PKR, savings, suitability) already filtered as "budget-appropriate" by rules.
- Optional live web context (Tavily) and weather.

Output ONE JSON object only (no markdown), keys:
- "walletSummary": 2–4 sentences interpreting their situation; cite PKR numbers only from input; be supportive and practical.
- "spendingTips": array of 2–4 short strings (actionable, category-aware).
- "offerInsights": array of { "offerId": "<must match an input offerId exactly>", "headline": "why this offer fits this wallet right now", "budgetAngle": "one line: price vs remaining or safe daily limit" } — include an insight for every offer in the input list when possible, in priority order.`;

const buildFallback = ({ categoryState, selectedCategory, usage, recommendations }) => {
  const tips = [
    `Daily safe amount for ${selectedCategory}: about ${formatPkr(categoryState.dailySafeLimit)} (spread over rest of month).`,
    categoryState.state === "overspending"
      ? "Favor the strongest discounts and smallest out-of-pocket hits until pace improves."
      : categoryState.state === "at_risk"
        ? "Keep each spend near or under your safe daily cap to avoid month-end stress."
        : `You have ${formatPkr(categoryState.remaining)} left in ${selectedCategory} this month—prioritize value, not just price.`,
  ];
  if (categoryState.budget <= 0) {
    tips.push(`Set a monthly ${selectedCategory} budget in your wallet to unlock better guidance.`);
  }
  return {
    source: "fallback",
    walletSummary: [categoryState.forecast, `Selected view: ${selectedCategory}.`].join(" "),
    spendingTips: tips,
    offerInsights: [],
  };
};

const runWalletRecommendationsAI = async (params) => {
  const {
    categoryState,
    selectedCategory,
    usage = [],
    recommendations = [],
    tavilyAnswer = "",
    weatherSummary = "",
    recentTransactions = [],
  } = params;

  const apiKey = process.env.GROQ_API_KEY;
  if (!isConfigured(apiKey) || !recommendations.length) {
    return buildFallback({ categoryState, selectedCategory, usage, recommendations });
  }

  const budgetSnapshot = {
    selectedCategory,
    state: categoryState.state,
    percentUsed: categoryState.percentUsed,
    budget: categoryState.budget,
    spent: categoryState.spent,
    remaining: categoryState.remaining,
    dailySafeLimit: categoryState.dailySafeLimit,
    spendingVelocity: categoryState.spendingVelocity,
    forecast: categoryState.forecast,
  };
  const categoryRollup = usage.map((u) => ({
    category: u.category,
    state: u.state,
    percentUsed: u.percentUsed,
    remaining: u.remaining,
  }));
  const offerShortlist = recommendations.slice(0, 8).map((r) => ({
    offerId: String(r.offerId || ""),
    title: r.title,
    price: r.price,
    original_price: r.original_price,
    savings: r.savings,
    suitability: r.suitability,
    urgency: r.urgency,
  }));

  const userPayload = {
    budgetSnapshot,
    categoryRollup,
    recentTransactions: recentTransactions.slice(0, 8),
    liveWebContext: String(tavilyAnswer || "").slice(0, 800),
    weather: String(weatherSummary || "").slice(0, 200),
    offers: offerShortlist,
  };

  try {
    const { data } = await axios.post(
      GROQ_CHAT_URL,
      {
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        temperature: 0.3,
        max_tokens: 2200,
        response_format: { type: "json_object" },
      },
      {
        timeout: 55000,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    const text = data?.choices?.[0]?.message?.content;
    const parsed = safeJsonParse(text);
    if (!parsed || typeof parsed !== "object") {
      return buildFallback({ categoryState, selectedCategory, usage, recommendations });
    }
    const validIds = new Set(offerShortlist.map((o) => o.offerId).filter(Boolean));
    const offerInsights = (Array.isArray(parsed.offerInsights) ? parsed.offerInsights : [])
      .filter((o) => o && validIds.has(String(o.offerId)))
      .map((o) => ({
        offerId: String(o.offerId),
        headline: String(o.headline || "").trim().slice(0, 500),
        budgetAngle: String(o.budgetAngle || "").trim().slice(0, 500),
      }));
    return {
      source: "groq",
      walletSummary: String(parsed.walletSummary || "").trim() || buildFallback({ categoryState, selectedCategory, usage, recommendations }).walletSummary,
      spendingTips: Array.isArray(parsed.spendingTips)
        ? parsed.spendingTips.map((s) => String(s).trim()).filter(Boolean).slice(0, 6)
        : [],
      offerInsights,
    };
  } catch (e) {
    console.warn("Wallet recommendations AI failed:", e.message);
    return buildFallback({ categoryState, selectedCategory, usage, recommendations });
  }
};

const mergeWalletRecommendations = (recommendations, ai) => {
  if (!recommendations?.length) {
    return {
      recommendations: [],
      aiAnalysis: {
        summary: ai?.walletSummary || "",
        tips: ai?.spendingTips || [],
        source: ai?.source || "fallback",
      },
    };
  }
  if (!ai || (ai.source === "fallback" && !(ai.offerInsights || []).length)) {
    return {
      recommendations,
      aiAnalysis: {
        summary: ai?.walletSummary || "",
        tips: ai?.spendingTips || [],
        source: ai?.source || "fallback",
      },
    };
  }
  const byId = new Map((ai.offerInsights || []).map((o) => [String(o.offerId), o]));
  const merged = recommendations.map((r) => {
    const ins = byId.get(String(r.offerId));
    if (!ins) {
      return { ...r, ai_insight: undefined, ai_budget_angle: undefined };
    }
    return {
      ...r,
      ai_insight: ins.headline,
      ai_budget_angle: ins.budgetAngle,
      reason: ins.headline || r.reason,
      explanation: [ins.budgetAngle, r.explanation].filter(Boolean).join(" · "),
    };
  });
  return {
    recommendations: merged,
    aiAnalysis: {
      summary: ai.walletSummary,
      tips: ai.spendingTips || [],
      source: ai.source,
    },
  };
};

module.exports = {
  runWalletRecommendationsAI,
  mergeWalletRecommendations,
};
