const express = require("express");
const {
  googleAuth,
  verifyEmailToken,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/google", googleAuth);
router.post("/verify-email", verifyEmailToken);
router.post("/resend-verification", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
