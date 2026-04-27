const mongoose = require("mongoose");

const categoryBudgetSchema = new mongoose.Schema(
  {
    food: { type: Number, default: 0, min: 0 },
    transport: { type: Number, default: 0, min: 0 },
    shopping: { type: Number, default: 0, min: 0 },
    entertainment: { type: Number, default: 0, min: 0 },
    bills: { type: Number, default: 0, min: 0 },
    savings: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["PKR", "USD"],
      default: "PKR",
    },
    monthlyBudgets: {
      type: categoryBudgetSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
