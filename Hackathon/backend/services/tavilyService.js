const axios = require("axios");

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

const isConfiguredApiKey = (apiKey) => Boolean(apiKey && apiKey !== "PUT_KEY_HERE");
const fitTavilyQuery = (query) => {
  const normalized = String(query || "").replace(/\s+/g, " ").trim();
  return normalized.length > 390 ? `${normalized.slice(0, 387)}...` : normalized;
};

const buildFallbackInsights = (query, reason) => ({
  query,
  answer:
    "Live web intelligence is unavailable, so Localyse is using safe local context: nearby demand, weather, time of day, and stated preferences.",
  signals: [
    "Preference and category alignment are prioritized.",
    "Weather-sensitive offers are boosted when relevant.",
    "Short expiry windows create urgency for nearby merchants.",
  ],
  results: [],
  source: "fallback",
  error: reason,
});

const getContextInsights = async (query) => {
  const apiKey = process.env.TAVILY_API_KEY;
  const tavilyQuery = fitTavilyQuery(query);

  if (!isConfiguredApiKey(apiKey)) {
    return buildFallbackInsights(tavilyQuery, "TAVILY_API_KEY is not configured.");
  }

  try {
    const response = await axios.post(
      TAVILY_SEARCH_URL,
      {
        query: tavilyQuery,
        topic: "general",
        search_depth: "advanced",
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    return {
      query: tavilyQuery,
      answer: response.data?.answer || "No direct answer returned by Tavily.",
      signals: (response.data?.results || [])
        .slice(0, 5)
        .map((result) => result.title || result.content)
        .filter(Boolean),
      results: response.data?.results || [],
      source: "tavily",
    };
  } catch (error) {
    const responseError =
      typeof error.response?.data === "string"
        ? error.response.data
        : error.response?.data?.message || error.response?.data?.detail;
    const message = responseError || error.message || "Unknown Tavily error.";
    console.warn("Tavily request failed. Using fallback context:", message);
    return buildFallbackInsights(query, message);
  }
};

const truncateAtWord = (text, maxLen) => {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  return lastSpace > 20 ? slice.slice(0, lastSpace) : slice;
};

const firstSentence = (text) => {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const match = t.match(/^(.+?[.!?])(\s|$)/);
  if (match) return match[1].trim();
  return t;
};

const goalOpeners = {
  clear: "Right now, locals care about: ",
  traffic: "Perfect timing—",
  margin: "Why this feels special: ",
  newcust: "Welcome-worthy moment: ",
};

const cleanTavilyAnswer = (answer) =>
  String(answer || "")
    .replace(/\s+/g, " ")
    .replace(/^(The search (results|suggest)|According to|Based on (the )?search)[^.]*\./i, "")
    .trim();

const buildCustomerCharmFromInsights = ({
  answer,
  signals = [],
  source,
  focusItem,
  merchantName,
  goal,
}) => {
  const item = String(focusItem || "this deal").replace(/\s+/g, " ").trim();
  const shop = String(merchantName || "us").replace(/\s+/g, " ").trim();
  const fallbackLine = `Your ${item} treat at ${shop}—picked for what neighbors want today.`;
  const fallbackSub = "We matched timing to local mood, weather, and your shop’s goals.";

  if (source !== "tavily") {
    return { charmLine: fallbackLine, charmSubtext: fallbackSub };
  }

  const a = cleanTavilyAnswer(answer);
  if (!a || /no direct answer/i.test(a) || a.length < 12) {
    return { charmLine: fallbackLine, charmSubtext: fallbackSub };
  }

  const opener = goalOpeners[goal] || goalOpeners.traffic;
  const sentence = firstSentence(a);
  const core = truncateAtWord(sentence, 110);
  const charmLine = truncateAtWord(`${opener}${core}`, 200);

  const fromSignals = (Array.isArray(signals) ? signals : [])
    .map((s) => String(s).replace(/\s+/g, " ").trim())
    .filter((s) => s && s.length > 8 && s.length < 200)
    .slice(0, 2)
    .map((s) => (s.length > 72 ? `${s.slice(0, 69)}…` : s));

  const rest = sentence && a.length > sentence.length ? a.slice(sentence.length).replace(/^[\s,;.]+/, "").trim() : "";
  let charmSubtext =
    fromSignals.length > 0
      ? fromSignals.join(" · ")
      : rest.length > 24
        ? truncateAtWord(rest, 100)
        : "Skip the FOMO—this window lines up with what’s happening nearby.";

  return {
    charmLine,
    charmSubtext: charmSubtext || fallbackSub,
  };
};

const categoryPriceQueryParts = {
  food:
    "restaurant meal cafe fast food dhaba average price per person typical cost range rupees",
  transport:
    "ride-hailing app local taxi short trip from-to typical fare per km in rupees",
  shopping:
    "clothing bazaar retail average purchase price range typical in rupees",
  entertainment:
    "cinema ticket leisure outing typical cost range rupees per person",
  bills:
    "monthly mobile data broadband electricity unit typical bill size rupees urban Pakistan",
  savings:
    "typical small savings or minimum balance expectations rupees (brief)",
};

/**
 * Web search (Tavily) for realistic PKR price ranges / benchmarks for a wallet category.
 * Used in wallet "advisor" to cross-check what locals pay vs offer prices.
 * @param {{ category: string; city?: string }} params
 */
const getPriceBenchmarkInsight = async ({ category, city = "Islamabad" }) => {
  const c = String(category || "food").toLowerCase();
  const part = categoryPriceQueryParts[c] || categoryPriceQueryParts.food;
  const query = [
    city,
    "Pakistan",
    "PKR rupees",
    "current or recent typical",
    part,
    "Give approximate numeric price ranges in PKR only, one short paragraph, no financial advice beyond typical costs.",
  ].join(" ");
  return getContextInsights(query);
};

module.exports = {
  getContextInsights,
  getPriceBenchmarkInsight,
  buildCustomerCharmFromInsights,
};
