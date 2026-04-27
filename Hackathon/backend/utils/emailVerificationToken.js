const crypto = require("crypto");

const TOKEN_BYTES = 32;
const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

const createEmailVerificationSecret = () => {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS);
  return { token, expiresAt };
};

module.exports = {
  createEmailVerificationSecret,
};
