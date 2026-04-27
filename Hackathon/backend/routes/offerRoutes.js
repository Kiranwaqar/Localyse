const express = require("express");
const multer = require("multer");
const {
  claimOffer,
  deleteOffer,
  generateOffers,
  getCustomerClaims,
  getCustomerFoodAnalysis,
  getMoodSuggestion,
  getMerchantClaims,
  getOfferAnalytics,
  getForYouOffers,
  getOffers,
  redeemClaim,
} = require("../controllers/offerController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (allowedTypes.includes(file.mimetype) || /\.(csv|xls|xlsx)$/i.test(file.originalname)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only CSV, XLS, and XLSX files are allowed for offer generation."));
  },
});

router.get("/", getOffers);
router.get("/for-you", getForYouOffers);
router.get("/analytics", getOfferAnalytics);
router.get("/food-analysis/customer", getCustomerFoodAnalysis);
router.get("/claims/customer", getCustomerClaims);
router.get("/claims", getMerchantClaims);
router.post("/mood-suggestion", getMoodSuggestion);
router.patch("/claims/:claimId/redeem", redeemClaim);
router.post("/:id/claim", claimOffer);
router.delete("/:id", deleteOffer);
router.post(
  "/generate",
  upload.fields([
    { name: "financeFile", maxCount: 1 },
    { name: "inventoryFile", maxCount: 1 },
    { name: "marginFile", maxCount: 1 },
  ]),
  generateOffers
);

module.exports = router;
