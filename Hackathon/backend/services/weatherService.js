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

module.exports = {
  getWeatherContext,
};
