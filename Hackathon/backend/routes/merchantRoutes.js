const express = require("express");
const {
  createMerchant,
  getMerchants,
  loginMerchant,
  signupMerchant,
  updateMerchant,
} = require("../controllers/merchantController");
const {
  submitApplication,
  listApplications,
  approveApplication,
  rejectApplication,
  emailApproveByToken,
  emailRejectByToken,
} = require("../controllers/merchantApplicationController");
const { requireMerchantAdminKey } = require("../middleware/merchantAdminAuth");

const router = express.Router();

router.get("/review/email/approve", emailApproveByToken);
router.get("/review/email/reject", emailRejectByToken);
router.post("/apply", submitApplication);
router.get("/applications", requireMerchantAdminKey, listApplications);
router.post("/applications/:id/approve", requireMerchantAdminKey, approveApplication);
router.post("/applications/:id/reject", requireMerchantAdminKey, rejectApplication);

router.route("/").get(getMerchants).post(createMerchant);
router.post("/signup", signupMerchant);
router.post("/login", loginMerchant);
router.put("/:id", updateMerchant);

module.exports = router;
