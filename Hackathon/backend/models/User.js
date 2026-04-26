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
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["customer", "merchant"],
      default: "customer",
      required: true,
    },
    location: locationSchema,
    preferences: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, role: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
