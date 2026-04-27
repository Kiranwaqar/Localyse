const axios = require("axios");

const getWeatherContext = async (location) => {
  if (!location) {
    return {
      summary: "Weather unavailable because location was not provided.",
      source: "fallback",
    };
  }

  try {
    const response = await axios.get(
      `https://wttr.in/${encodeURIComponent(location)}?format=j1`,
      { timeout: 8000 }
    );
    const current = response.data?.current_condition?.[0];

    if (!current) {
      throw new Error("Weather response did not include current conditions.");
    }

    const description = current.weatherDesc?.[0]?.value || "unknown conditions";

    return {
      summary: `${description}, ${current.temp_C}C, feels like ${current.FeelsLikeC}C, humidity ${current.humidity}%.`,
      temperatureC: Number(current.temp_C),
      feelsLikeC: Number(current.FeelsLikeC),
      humidity: Number(current.humidity),
      source: "wttr",
    };
  } catch (error) {
    return {
      summary: `Weather unavailable for ${location}.`,
      source: "fallback",
      error: error.message,
    };
  }
};

/**
 * 1–2 short, budget-aware “what to do” lines for the wallet advisor (Islamabad / local spending).
 * @param { { summary?: string; temperatureC?: number; feelsLikeC?: number; source?: string } } ctx
 * @returns { string[] }
 */
const getWeatherActionLines = (ctx) => {
  if (!ctx || ctx.source === "fallback" && /unavailable/i.test(String(ctx.summary || ""))) {
    return [
      "Add or enable location in your profile so we can tailor weather tips to you.",
    ];
  }

  const s = String(ctx.summary || "").toLowerCase();
  const feels = Number(ctx.feelsLikeC);
  const temp = Number(ctx.temperatureC);
  const t = Number.isFinite(feels) ? feels : temp;
  const out = [];

  if (/rain|drizzle|shower|thunder|storm|downpour|precipitation/.test(s)) {
    out.push(
      "Wet out: use delivery or short indoor runs so transport and time costs don’t blow your day budget."
    );
  } else if (/snow|sleet|frost|ice|blizzard|freezing/.test(s)) {
    out.push("Cold and slick: plan one warm stop (meal or drink) and keep the tab inside your food safe limit.");
  }

  if (Number.isFinite(t) && t >= 30) {
    out.push("Heat: favor cold drinks and lighter bites; you’ll feel better staying near your per-meal cap.");
  } else if (Number.isFinite(t) && t <= 12) {
    out.push("Chilly: hot meals and drinks match the weather—still align each spend with your category remaining.");
  }

  if (out.length === 0) {
    out.push(
      "Mild conditions: no weather curveballs—use your safe daily amount as usual when picking treats."
    );
    out.push("Group nearby errands in one trip to keep transport spend predictable.");
  }

  return out.slice(0, 2);
};

module.exports = {
  getWeatherContext,
  getWeatherActionLines,
};
