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

module.exports = {
  getContextInsights,
};
