const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    merchantName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    offerText: {
      type: String,
      required: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    targetItem: {
      type: String,
      trim: true,
    },
    reasonWhyNow: {
      type: String,
      required: true,
      trim: true,
    },
    claimCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    claims: [
      {
        customerId: String,
        customerName: String,
        customerEmail: String,
        couponCode: String,
        claimedAt: {
          type: Date,
          default: Date.now,
        },
        estimatedRevenue: {
          type: Number,
          default: 0,
        },
        notifications: {
          merchant: mongoose.Schema.Types.Mixed,
          customer: mongoose.Schema.Types.Mixed,
        },
        redeemedAt: Date,
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
    },
    metadata: {
      inputLocation: String,
      inputWeather: String,
      inputTime: String,
      goal: String,
      maxDiscount: Number,
      activeForHours: Number,
      expectedCustomerVolume: Number,
      expectedBusinessImpact: String,
      aiSuggestion: String,
      financeInsights: mongoose.Schema.Types.Mixed,
      marginInsights: mongoose.Schema.Types.Mixed,
      inventoryInsights: mongoose.Schema.Types.Mixed,
      uploadedFiles: mongoose.Schema.Types.Mixed,
      tavilyAnswer: String,
      source: {
        type: String,
        default: "localyse-engine",
      },
    },
  },
  { timestamps: true }
);

offerSchema.index({ expiresAt: 1 });
offerSchema.index({ merchant: 1, createdAt: -1 });
offerSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model("Offer", offerSchema);
