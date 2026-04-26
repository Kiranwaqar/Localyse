const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true }
);

merchantSchema.index({ category: 1 });

module.exports = mongoose.model("Merchant", merchantSchema);
