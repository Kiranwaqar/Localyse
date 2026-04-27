const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Merchant = require("../models/Merchant");
const { assertSignupEmailAllowed } = require("../utils/signupEmailPolicy");
const { isMerchantSignupAllowed } = require("../utils/merchantSignupGate");
const { createEmailVerificationSecret } = require("../utils/emailVerificationToken");
const { getPublicAppUrl } = require("../utils/appUrl");
const { sendSignupVerificationEmail, hasSmtpConfig } = require("../services/emailService");

const createMerchant = async (req, res, next) => {
  try {
    const { name, email, password, category, location, businessRules } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: "name and category are required." });
    }

    const existingMerchant = email ? await Merchant.findOne({ email }) : null;
    if (existingMerchant) {
      return res.status(409).json({ message: "A merchant with this email already exists." });
    }

    if (email) {
      const gate = await isMerchantSignupAllowed(email);
      if (!gate.ok) {
        return res.status(403).json({ message: gate.message });
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    const merchant = await Merchant.create({
      name,
      email,
      password: hashedPassword,
      category,
      location,
      businessRules,
    });

    return res.status(201).json(merchant);
  } catch (error) {
    return next(error);
  }
};

const signupMerchant = async (req, res, next) => {
  try {
    const { name, email, password, category, location, businessRules } = req.body;

    if (!name || !email || !password || !category) {
      return res.status(400).json({ message: "name, email, password, and category are required." });
    }

    const emailCheck = assertSignupEmailAllowed(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ message: emailCheck.message });
    }
    const normalizedEmail = emailCheck.email;

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        message: "This email is already used for a customer account. Use a different email for your business.",
      });
    }

    const existingMerchant = await Merchant.findOne({ email: normalizedEmail });
    if (existingMerchant) {
      return res.status(409).json({ message: "A merchant with this email already exists." });
    }

    const approval = await isMerchantSignupAllowed(normalizedEmail);
    if (!approval.ok) {
      return res.status(403).json({ message: approval.message });
    }

    const { token: verifyToken, expiresAt } = createEmailVerificationSecret();
    const hashedPassword = await bcrypt.hash(password, 10);
    const merchant = await Merchant.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      category,
      authProvider: "local",
      emailVerified: false,
      emailVerificationToken: verifyToken,
      emailVerificationExpires: expiresAt,
      location,
      businessRules,
    });

    const appUrl = getPublicAppUrl();
    const verifyPath = `/verify-email?${new URLSearchParams({ token: verifyToken, role: "merchant" }).toString()}`;
    const verifyUrl = `${appUrl}${verifyPath}`;

    const emailResult = await sendSignupVerificationEmail({
      to: normalizedEmail,
      name: merchant.name,
      verifyUrl,
      roleLabel: "merchant",
    });

    const basePayload = {
      _id: merchant._id,
      name: merchant.name,
      email: merchant.email,
      role: "merchant",
      emailVerified: false,
      requiresEmailVerification: true,
      category: merchant.category,
      location: merchant.location,
      message:
        "We sent a verification link to your email. Open it to finish setting up your business account, then sign in here.",
    };

    if (process.env.NODE_ENV === "development" && !emailResult?.sent) {
      basePayload.devVerificationPath = verifyPath;
      if (!hasSmtpConfig()) {
        basePayload.message =
          "SMTP is not configured. In development, use the local link below; add SMTP in production to send real emails.";
      }
    }

    return res.status(201).json(basePayload);
  } catch (error) {
    return next(error);
  }
};

const loginMerchant = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const merchant = await Merchant.findOne({ email: normalizedEmail }).select("+password");

    if (!merchant) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!merchant.password) {
      return res.status(401).json({ message: "This business uses Google sign-in. Use “Continue with Google” instead." });
    }

    const passwordMatches = await bcrypt.compare(password, merchant.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (merchant.authProvider === "local" && merchant.emailVerified === false) {
      return res.status(403).json({
        message: "Check your email and verify your address before signing in. You can resend the link from the sign-in page.",
        emailVerified: false,
      });
    }

    return res.json({
      _id: merchant._id,
      name: merchant.name,
      email: merchant.email,
      role: "merchant",
      emailVerified: merchant.emailVerified !== false,
      category: merchant.category,
      location: merchant.location,
    });
  } catch (error) {
    return next(error);
  }
};

const getMerchants = async (_req, res, next) => {
  try {
    const merchants = await Merchant.find().select("-password").sort({ createdAt: -1 });
    return res.json(merchants);
  } catch (error) {
    return next(error);
  }
};

const updateMerchant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, category, location, businessRules } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid merchant id." });
    }

    if (!name || !email || !category) {
      return res.status(400).json({ message: "name, email, and category are required." });
    }

    const existingMerchant = await Merchant.findOne({ email, _id: { $ne: id } });
    if (existingMerchant) {
      return res.status(409).json({ message: "A merchant with this email already exists." });
    }

    const merchant = await Merchant.findByIdAndUpdate(
      id,
      {
        name,
        email,
        category,
        location,
        ...(businessRules ? { businessRules } : {}),
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!merchant) {
      return res.status(404).json({ message: "Merchant not found." });
    }

    return res.json({
      _id: merchant._id,
      name: merchant.name,
      email: merchant.email,
      role: "merchant",
      category: merchant.category,
      location: merchant.location,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createMerchant,
  signupMerchant,
  loginMerchant,
  getMerchants,
  updateMerchant,
};
