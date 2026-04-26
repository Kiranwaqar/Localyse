const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD"],
      default: "USD",
    },
    merchant: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["food", "transport", "shopping", "entertainment", "bills", "savings"],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "upload", "offer_claim"],
      default: "manual",
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      index: true,
    },
    offerClaim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfferClaim",
      unique: true,
      sparse: true,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    upload: {
      fileName: String,
      rowNumber: Number,
    },
    raw: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, occurredAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
