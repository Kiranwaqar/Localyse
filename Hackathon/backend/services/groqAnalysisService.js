const axios = require("axios");

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const isConfigured = (key) => Boolean(key && String(key).trim() && !/^put_key/i.test(String(key)));

const buildFallback = (reason) => ({
  source: "fallback",
  reasonWhyNowAugment: "",
  aiNarrative: "",
  riskCheck: "",
  dataHighlights: [],
  error: reason,
});

const SYSTEM = `You are Localyse's merchant intelligence layer. You receive:
1) Aggregated spreadsheet metrics (finance, inventory, margins) and analytical rollups (concentration, spreads).
2) Live web context from Tavily (answer + signal titles).
3) Weather and daypart.

Respond with ONE JSON object only (no markdown), keys:
- "reasonWhyNowAugment": 1–3 sentences tying spreadsheet signals to Tavily/weather; must be safe and profit-aware; no invented numbers not in input.
- "aiNarrative": 2–4 sentences for merchant-facing "AI synthesis" combining data + context; concise.
- "riskCheck": one short sentence on what to watch (margin, stock, or timing).
- "dataHighlights": array of 2–4 ultra-short bullet strings citing real metrics from input (e.g. top-3 revenue share, margin spread).`;

const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

/**
 * Combines Tavily web context + spreadsheet rollups via Groq (OpenAI-compatible API).
 * When GROQ_API_KEY is missing, returns a no-op fallback so the offer path still works (Tavily + heuristics only).
 */
const runPipelineAnalysis = async ({
  merchantName,
  category,
  goal,
  focusItem,
  weather,
  dayPart,
  safeDiscountCeiling,
  activeForHours,
  location,
  analyticalHighlights,
  financeSlice,
  marginsSlice,
  inventorySlice,
  tavily,
}) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!isConfigured(apiKey)) {
    return buildFallback("GROQ_API_KEY is not configured.");
  }

  const userPayload = {
    merchantName,
    category,
    goal,
    focusItem,
    weather,
    dayPart,
    safeDiscountCeiling,
    activeForHours,
    location,
    analyticalHighlights,
    finance: financeSlice,
    margins: marginsSlice,
    inventory: inventorySlice,
    tavily: {
      answer: tavily?.answer,
      signals: (tavily?.signals || []).slice(0, 6),
      source: tavily?.source,
    },
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
        temperature: 0.35,
        max_tokens: 900,
        response_format: { type: "json_object" },
      },
      {
        timeout: 45000,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const text = data?.choices?.[0]?.message?.content;
    const parsed = safeJsonParse(text);
    if (!parsed || typeof parsed !== "object") {
      return buildFallback("Groq returned non-JSON output.");
    }

    return {
      source: "groq",
      reasonWhyNowAugment: String(parsed.reasonWhyNowAugment || "").trim(),
      aiNarrative: String(parsed.aiNarrative || "").trim(),
      riskCheck: String(parsed.riskCheck || "").trim(),
      dataHighlights: Array.isArray(parsed.dataHighlights)
        ? parsed.dataHighlights.map((s) => String(s).trim()).filter(Boolean).slice(0, 6)
        : [],
    };
  } catch (error) {
    const msg =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      "Unknown Groq error.";
    console.warn("Groq pipeline failed:", msg);
    return buildFallback(msg);
  }
};

module.exports = {
  runPipelineAnalysis,
};
