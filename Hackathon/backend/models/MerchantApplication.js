const mongoose = require("mongoose");

const merchantApplicationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedAt: { type: Date },
    /** Email of reviewer (platform owner). */
    reviewedBy: { type: String, trim: true },
    /** One-time links in the admin “new request” email (cleared after approve/reject). */
    emailApproveToken: { type: String, select: true, index: true, sparse: true },
    emailRejectToken: { type: String, select: true, index: true, sparse: true },
  },
  { timestamps: true }
);

merchantApplicationSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("MerchantApplication", merchantApplicationSchema);
