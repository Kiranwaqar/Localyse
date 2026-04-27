const MerchantApplication = require("../models/MerchantApplication");

const normalizeEmail = (value) => String(value || "").toLowerCase().trim();

const getOwnerEmail = () =>
  String(process.env.MERCHANT_ADMIN_EMAIL || "shamaiemshabbir3@gmail.com")
    .toLowerCase()
    .trim();

/**
 * New merchant signups (email+password or Google) require a prior "approved" application,
 * except the platform owner email and when MERCHANT_APPROVAL_BYPASS=true (dev only).
 */
const isMerchantSignupAllowed = async (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { ok: false, code: "invalid_email", message: "A valid business email is required." };
  }

  if (process.env.MERCHANT_APPROVAL_BYPASS === "true") {
    return { ok: true };
  }

  if (normalized === getOwnerEmail()) {
    return { ok: true };
  }

  const app = await MerchantApplication.findOne({ email: normalized }).lean();
  if (app && app.status === "approved") {
    return { ok: true };
  }

  return {
    ok: false,
    code: "approval_required",
    message:
      "Merchant accounts are invite-only. Submit a request and wait for approval from Localyse before signing up with this email (including Google).",
  };
};

module.exports = {
  isMerchantSignupAllowed,
  normalizeEmail,
  getOwnerEmail,
};
