const axios = require("axios");

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const isConfigured = (key) => Boolean(key && String(key).trim() && !/^put_key/i.test(String(key)));

const normalize = (value) => String(value || "").trim().toLowerCase();

const truncate = (text, max) => {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
};

const buildClaimSummary = (claims) => {
  const categories = {};
  const merchants = {};
  const discounts = [];
  const recentTexts = [];

  claims.slice(0, 25).forEach((c) => {
    const cat = normalize(c.category) || "other";
    categories[cat] = (categories[cat] || 0) + 1;
    const m = String(c.merchantName || "").trim();
    if (m) merchants[m] = (merchants[m] || 0) + 1;
    const d = Number(c.discountPercentage || 0);
    if (d > 0) discounts.push(d);
    if (recentTexts.length < 10) {
      recentTexts.push(
        truncate(`${c.offerText || ""} @ ${c.merchantName || ""} (${c.targetItem || ""})`.trim(), 140)
      );
    }
  });

  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));
  const topMerchants = Object.entries(merchants)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  const avgDiscount =
    discounts.length > 0 ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length) : 0;

  return {
    totalClaims: claims.length,
    topCategories,
    topMerchants,
    averageClaimedDiscount: avgDiscount,
    recentClaimSnippets: recentTexts,
  };
};

const compactOffers = (offers) =>
  offers.map((o) => ({
    id: String(o._id),
    category: normalize(o.category) || "other",
    merchantName: truncate(o.merchantName, 80),
    offerText: truncate(o.offerText, 120),
    targetItem: truncate(o.targetItem || "", 60),
    discountPercentage: Number(o.discountPercentage || 0),
  }));

const SYSTEM_FOR_YOU = `You are Localyse "For You" matching for Islamabad.

You receive:
- A summary of this customer's COUPON CLAIM HISTORY (categories, merchants, recent offer text).
- Optional live web/demand context (Tavily one-liner).
- A list of LIVE offers (each has an "id" field).

Task: Return ONLY valid JSON:
{
  "matches": [
    { "offerId": "<exact id from input>", "fitScore": <integer 0-100>, "reason": "<one short sentence tying this offer to their claim patterns>" }
  ]
}

Rules:
- Include ONLY offers that clearly align with their *claimed* behavior: category fit, merchant affinity, similar product/price/discount style, or strong thematic match to past claims.
- Omit offers that are unrelated to their history (do not pad with weak fits).
- fitScore >= 55 only for offers you include; leave weak offers out entirely.
- If nothing fits well, return "matches": [].
- Never invent offer ids — only use ids from the input list.
- Keep reasons specific and tied to claim history (not generic).`;

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

const runForYouGroqMatch = async ({ customerName, claimSummary, offersCompact, tavilyAnswer }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!isConfigured(apiKey)) {
    return { source: "skipped", matches: [] };
  }

  const userPayload = {
    customerName: customerName || "customer",
    claimHistory: claimSummary,
    liveWebContext: tavilyAnswer ? truncate(tavilyAnswer, 500) : "",
    liveOffers: offersCompact,
  };

  try {
    const { data } = await axios.post(
      GROQ_CHAT_URL,
      {
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_FOR_YOU },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        temperature: 0.25,
        max_tokens: 2500,
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
    const raw = Array.isArray(parsed?.matches) ? parsed.matches : [];
    const validIds = new Set(offersCompact.map((o) => o.id));
    const matches = raw
      .filter((m) => m && validIds.has(String(m.offerId)) && Number(m.fitScore) >= 50)
      .map((m) => ({
        offerId: String(m.offerId),
        fitScore: Math.min(100, Math.max(0, Math.round(Number(m.fitScore) || 0))),
        reason: truncate(String(m.reason || "Aligns with your claim history."), 220),
      }))
      .sort((a, b) => b.fitScore - a.fitScore);

    return { source: "groq", matches };
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message || "groq error";
    console.warn("For You Groq match failed:", msg);
    return { source: "error", matches: [], error: msg };
  }
};

const claimWordSet = (claims) => {
  const words = new Set();
  claims.slice(0, 20).forEach((c) => {
    const blob = `${c.offerText || ""} ${c.targetItem || ""} ${c.merchantName || ""}`.toLowerCase();
    blob
      .split(/\W+/)
      .filter((w) => w.length >= 4 && !["with", "from", "your", "this", "that", "off", "for"].includes(w))
      .forEach((w) => words.add(w));
  });
  return words;
};

/**
 * Rule-based fallback when Groq is unavailable or returns nothing.
 */
const heuristicForYouMatch = (claims, offers) => {
  if (!claims.length || !offers.length) return [];

  const catCounts = claims.reduce((acc, c) => {
    const k = normalize(c.category) || "other";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const merchantCounts = claims.reduce((acc, c) => {
    const m = String(c.merchantName || "").trim().toLowerCase();
    if (m) acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const topMerchants = Object.entries(merchantCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);

  const words = claimWordSet(claims);
  const avgD = (() => {
    const ds = claims.map((c) => Number(c.discountPercentage || 0)).filter((d) => d > 0);
    return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : 0;
  })();

  const rows = offers.map((offer) => {
    const cat = normalize(offer.category) || "other";
    let score = 0;
    const reasons = [];

    if (topCats.length && topCats.includes(cat)) {
      score += 38;
      reasons.push(`You often claim ${cat} deals`);
    }

    const mn = String(offer.merchantName || "").toLowerCase();
    if (topMerchants.some((tm) => mn.includes(tm) || tm.includes(mn.slice(0, 6)))) {
      score += 32;
      reasons.push("Same merchant family as your history");
    }

    const blob = `${offer.offerText || ""} ${offer.targetItem || ""}`.toLowerCase();
    let hits = 0;
    words.forEach((w) => {
      if (blob.includes(w)) hits += 1;
    });
    if (hits > 0) {
      const hScore = Math.min(28, hits * 6);
      score += hScore;
      reasons.push(`Similar items to past claims (${hits} signals)`);
    }

    const od = Number(offer.discountPercentage || 0);
    if (avgD > 0 && od >= avgD - 3) {
      score += 12;
      reasons.push(`Discount style like your ~${Math.round(avgD)}% claims`);
    }

    const reason = reasons[0] || (hits > 0 ? "Keyword overlap with your claimed offers" : "Category or merchant pattern match");

    return {
      offerId: String(offer._id),
      fitScore: Math.min(100, score),
      reason: truncate(reason, 200),
    };
  });

  return rows
    .filter((r) => r.fitScore >= 48)
    .sort((a, b) => b.fitScore - a.fitScore);
};

module.exports = {
  buildClaimSummary,
  compactOffers,
  runForYouGroqMatch,
  heuristicForYouMatch,
};
