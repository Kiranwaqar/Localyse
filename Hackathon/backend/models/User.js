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

userSchema.index({ emailVerificationToken: 1 }, { sparse: true, unique: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true, unique: true });

userSchema.index({ email: 1, role: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
