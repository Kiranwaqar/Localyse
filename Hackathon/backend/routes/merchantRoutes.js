const express = require("express");
const {
  createMerchant,
  getMerchants,
  loginMerchant,
  signupMerchant,
  updateMerchant,
} = require("../controllers/merchantController");

const router = express.Router();

router.route("/").get(getMerchants).post(createMerchant);
router.post("/signup", signupMerchant);
router.post("/login", loginMerchant);
router.put("/:id", updateMerchant);

module.exports = router;
