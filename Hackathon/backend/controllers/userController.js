const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Merchant = require("../models/Merchant");
const { assertSignupEmailAllowed } = require("../utils/signupEmailPolicy");
const { createEmailVerificationSecret } = require("../utils/emailVerificationToken");
const { getPublicAppUrl } = require("../utils/appUrl");
const { sendSignupVerificationEmail, hasSmtpConfig } = require("../services/emailService");

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = "customer", location, preferences } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required." });
    }

    if (role !== "customer") {
      return res.status(400).json({ message: "Use /api/merchants/signup for merchant accounts." });
    }

    const emailCheck = assertSignupEmailAllowed(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ message: emailCheck.message });
    }
    const normalizedEmail = emailCheck.email;

    const merchantAtEmail = await Merchant.findOne({ email: normalizedEmail }).select("+password");

    if (merchantAtEmail?.linkedUserId) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const standaloneMerchant = merchantAtEmail && !merchantAtEmail.linkedUserId ? merchantAtEmail : null;

    if (standaloneMerchant) {
      if (!standaloneMerchant.password) {
        return res.status(409).json({
          message:
            "This email already has a merchant profile that signs in with Google. Use Continue with Google to open your wallet on the same email.",
        });
      }

      const match = await bcrypt.compare(password, standaloneMerchant.password);
      if (!match) {
        return res.status(403).json({
          message: "Enter the same password as your merchant account to attach your wallet to this email.",
        });
      }

      let verifyToken;
      let expiresAt;
      const inheritedVerified = standaloneMerchant.emailVerified === true;

      if (!inheritedVerified) {
        const secret = createEmailVerificationSecret();
        verifyToken = secret.token;
        expiresAt = secret.expiresAt;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "customer",
        authProvider: "local",
        emailVerified: inheritedVerified,
        ...(verifyToken ? { emailVerificationToken: verifyToken, emailVerificationExpires: expiresAt } : {}),
        location,
        preferences: Array.isArray(preferences) ? preferences : [],
      });

      await Merchant.updateOne({ _id: standaloneMerchant._id }, { $set: { linkedUserId: user._id } });

      if (inheritedVerified) {
        return res.status(201).json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: true,
          location: user.location,
          preferences: user.preferences,
          message: "Wallet created and linked to your merchant profile.",
        });
      }

      const appUrl = getPublicAppUrl();
      const verifyPath = `/verify-email?${new URLSearchParams({ token: verifyToken, role: "customer" }).toString()}`;
      const verifyUrl = `${appUrl}${verifyPath}`;

      const emailResult = await sendSignupVerificationEmail({
        to: normalizedEmail,
        name: user.name,
        verifyUrl,
        roleLabel: "customer",
      });

      const emailSent = Boolean(emailResult?.sent);
      const basePayload = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: false,
        requiresEmailVerification: true,
        location: user.location,
        preferences: user.preferences,
        verificationEmailSent: emailSent,
        message: emailSent
          ? "We sent a verification link for your wallet. After you verify, you can switch between merchant and wallet on this email."
          : hasSmtpConfig()
            ? "We could not send the verification email (SMTP error). Check Vercel function logs. After fixing SMTP, use Resend verification on sign-in."
            : "Account created, but outgoing email is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and usually SMTP_FROM) in Vercel → Environment Variables, redeploy, then use Resend verification on sign-in.",
      };

      if (process.env.NODE_ENV === "development" && !emailSent) {
        basePayload.devVerificationPath = verifyPath;
        if (!hasSmtpConfig()) {
          basePayload.message =
            "SMTP is not configured. In development, use the local link below; add SMTP in production to send real emails.";
        }
      }

      return res.status(201).json(basePayload);
    }

    const { token: verifyToken, expiresAt } = createEmailVerificationSecret();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "customer",
      authProvider: "local",
      emailVerified: false,
      emailVerificationToken: verifyToken,
      emailVerificationExpires: expiresAt,
      location,
      preferences: Array.isArray(preferences) ? preferences : [],
    });

    const appUrl = getPublicAppUrl();
    const verifyPath = `/verify-email?${new URLSearchParams({ token: verifyToken, role: "customer" }).toString()}`;
    const verifyUrl = `${appUrl}${verifyPath}`;

    const emailResult = await sendSignupVerificationEmail({
      to: normalizedEmail,
      name: user.name,
      verifyUrl,
      roleLabel: "customer",
    });

    const emailSent = Boolean(emailResult?.sent);
    const basePayload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: false,
      requiresEmailVerification: true,
      location: user.location,
      preferences: user.preferences,
      verificationEmailSent: emailSent,
      message: emailSent
        ? "We sent a verification link to your email. Open it to finish setting up your account, then sign in here."
        : hasSmtpConfig()
          ? "We could not send the verification email (SMTP error). Check Vercel function logs. After fixing SMTP, use Resend verification on sign-in."
          : "Account created, but outgoing email is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and usually SMTP_FROM) in Vercel → Environment Variables, redeploy, then use Resend verification on sign-in.",
    };

    if (process.env.NODE_ENV === "development" && !emailSent) {
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

const loginUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    if (role && role !== "customer") {
      return res.status(400).json({ message: "Use /api/merchants/login for merchant accounts." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, role: "customer" }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email, password, or role." });
    }

    if (!user.password) {
      return res.status(401).json({ message: "This account uses Google sign-in. Use “Continue with Google” instead." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email, password, or role." });
    }

    if (user.authProvider === "local" && user.emailVerified !== true) {
      return res.status(403).json({
        message: "Check your email and verify your address before signing in. You can resend the link from the sign-in page.",
        emailVerified: false,
      });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified !== false,
      location: user.location,
      preferences: user.preferences,
    });
  } catch (error) {
    return next(error);
  }
};

const getUsers = async (_req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, location, preferences } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    if (!name || !email) {
      return res.status(400).json({ message: "name and email are required." });
    }

    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      return res.status(409).json({ message: "A user with this email already exists." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        name,
        email,
        ...(location ? { location } : {}),
        preferences: Array.isArray(preferences) ? preferences : [],
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      preferences: user.preferences,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createUser,
  loginUser,
  getUsers,
  updateUser,
};
