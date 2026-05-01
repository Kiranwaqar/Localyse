const mongoose = require("mongoose");
const { normalizeMerchantName } = require("../utils/normalizeMerchantName");

const locationSchema = new mongoose.Schema(  {
    lat: {
      type: Number,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      min: -180,
      max: 180,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const businessRulesSchema = new mongoose.Schema(
  {
    peakHours: {
      type: [String],
      default: [],
    },
    weatherTriggers: {
      type: [String],
      default: [],
    },
    discountRange: {
      min: {
        type: Number,
        default: 10,
        min: 0,
        max: 100,
      },
      max: {
        type: Number,
        default: 25,
        min: 0,
        max: 100,
      },
    },
  },
  { _id: false }
);

const merchantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    /** Lowercased, trimmed; used to enforce one business name per platform (see unique index). */
    nameNormalized: {
      type: String,
      trim: true,
      select: false,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleSub: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    /** When set, this merchant shares identity (password / Google account) with the linked User wallet. */
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    category: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    location: locationSchema,
    businessRules: {
      type: businessRulesSchema,
      default: () => ({}),
    },
    emailVerified: {
      type: Boolean,
    },
    emailVerificationToken: {
      type: String,
      select: false,
      sparse: true,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
      sparse: true,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

merchantSchema.pre("validate", function merchantNameNormalized(next) {
  if (this.name) {
    this.nameNormalized = normalizeMerchantName(this.name);
  }
  next();
});

merchantSchema.index({ category: 1 });
merchantSchema.index({ nameNormalized: 1 }, { unique: true, sparse: true });
merchantSchema.index({ linkedUserId: 1 }, { unique: true, sparse: true });
merchantSchema.index({ emailVerificationToken: 1 }, { sparse: true, unique: true });
merchantSchema.index({ passwordResetToken: 1 }, { sparse: true, unique: true });

module.exports = mongoose.model("Merchant", merchantSchema);
