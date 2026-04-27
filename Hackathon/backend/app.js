const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const offerRoutes = require("./routes/offerRoutes");
const walletRoutes = require("./routes/walletRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "Localyse API",
    status: "running",
    endpoints: {
      health: "/api/health",
      users: "/api/users",
      auth: "POST /api/auth/google, /verify-email, /resend-verification",
      merchants: "/api/merchants",
      offers: "/api/offers",
      wallet: "/api/wallet",
      generateOffers: "POST /api/offers/generate",
    },
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "localyse-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/wallet", walletRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error.";

  console.error("API error:", message);

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  });
});

module.exports = app;
