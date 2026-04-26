const express = require("express");
const {
  addTransaction,
  getRecommendations,
  getWallet,
  updateWallet,
  upload,
  uploadTransactions,
} = require("../controllers/walletController");

const router = express.Router();

router.get("/:userId", getWallet);
router.put("/:userId", updateWallet);
router.post("/:userId/transactions", addTransaction);
router.post("/:userId/transactions/upload", upload.single("transactionFile"), uploadTransactions);
router.get("/:userId/recommendations", getRecommendations);

module.exports = router;
