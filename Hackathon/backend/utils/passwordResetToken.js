const crypto = require("crypto");

const TOKEN_BYTES = 32;
const RESET_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const createPasswordResetSecret = () => {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  return { token, expiresAt };
};

module.exports = {
  createPasswordResetSecret,
};
