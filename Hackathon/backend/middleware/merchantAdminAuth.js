/**
 * Secures merchant-approval admin routes. Set MERCHANT_ADMIN_KEY in production.
 * Send header: X-Merchant-Admin-Key: <key>
 */
const requireMerchantAdminKey = (req, res, next) => {
  const key = String(process.env.MERCHANT_ADMIN_KEY || "").trim();
  if (!key) {
    return res.status(503).json({
      message:
        "Merchant admin actions are not configured. Set MERCHANT_ADMIN_KEY in the server environment.",
    });
  }
  const provided = String(req.get("X-Merchant-Admin-Key") || req.query.key || "").trim();
  if (provided !== key) {
    return res.status(401).json({ message: "Invalid or missing admin key." });
  }
  return next();
};

module.exports = { requireMerchantAdminKey };
