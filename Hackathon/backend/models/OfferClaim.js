const mongoose = require("mongoose");

const offerClaimSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    merchantName: {
      type: String,
      required: true,
      trim: true,
    },
    merchantEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
      index: true,
    },
    offerText: {
      type: String,
      required: true,
      trim: true,
    },
    targetItem: {
      type: String,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    category: {
      type: String,
      lowercase: true,
      trim: true,
    },
    offerExpiresAt: Date,
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    couponCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["claimed", "redeemed"],
      default: "claimed",
      index: true,
    },
    estimatedRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    notifications: {
      merchant: mongoose.Schema.Types.Mixed,
      customer: mongoose.Schema.Types.Mixed,
    },
    customerInfo: mongoose.Schema.Types.Mixed,
    merchantInfo: mongoose.Schema.Types.Mixed,
    offerDetails: mongoose.Schema.Types.Mixed,
    claimedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    redeemedAt: Date,
  },
  { timestamps: true }
);

offerClaimSchema.index({ merchant: 1, claimedAt: -1 });
offerClaimSchema.index({ offer: 1, customer: 1 }, { unique: true, sparse: true });
offerClaimSchema.index({ offer: 1, customerEmail: 1 }, { unique: true });

module.exports = mongoose.model("OfferClaim", offerClaimSchema);
