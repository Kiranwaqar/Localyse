const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Merchant = require("../models/Merchant");
const { createEmailVerificationSecret } = require("../utils/emailVerificationToken");
const { createPasswordResetSecret } = require("../utils/passwordResetToken");
const { getPublicAppUrl } = require("../utils/appUrl");
const { assertSignupEmailAllowed } = require("../utils/signupEmailPolicy");
const { sendSignupVerificationEmail, sendPasswordResetEmail } = require("../services/emailService");
const { isMerchantSignupAllowed } = require("../utils/merchantSignupGate");

const FORGOT_PASSWORD_MESSAGE =
  "If an account with a password exists for that email, we sent reset instructions. Check your inbox and spam.";

const getAudience = () => {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) {
    const err = new Error("Server configuration error: Google Sign-In is not configured.");
    err.statusCode = 500;
    throw err;
  }
  return id;
};

const getOAuthClient = () => new OAuth2Client(getAudience());

const verifyIdToken = async (idToken) => {
  const client = getOAuthClient();
  const audience = getAudience();
  const ticket = await client.verifyIdToken({
    idToken,
    audience,
  });
  return ticket.getPayload();
};

const toCustomerSession = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: "customer",
  emailVerified: user.emailVerified !== false,
  location: user.location,
  preferences: user.preferences,
});

const toMerchantSession = (merchant) => ({
  _id: merchant._id,
  name: merchant.name,
  email: merchant.email,
  role: "merchant",
  emailVerified: merchant.emailVerified !== false,
  category: merchant.category,
  location: merchant.location,
});

const googleAuth = async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        message: "Google Sign-In is not configured. Set GOOGLE_CLIENT_ID on the server.",
      });
    }

    const { credential, role, category, intent } = req.body;

    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ message: "Missing or invalid Google credential." });
    }

    if (!role || !["customer", "merchant"].includes(role)) {
      return res.status(400).json({ message: "Valid role (customer or merchant) is required." });
    }

    const mode = intent === "signin" ? "signin" : "signup";

    let payload;
    try {
      payload = await verifyIdToken(credential);
    } catch {
      return res.status(401).json({ message: "Could not verify Google. Please try again." });
    }

    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ message: "Invalid Google sign-in data." });
    }

    if (!payload.email_verified) {
      return res.status(403).json({
        message:
          "This Google account’s email is not verified. Verify your email in your Google account, then try again.",
      });
    }

    const email = String(payload.email).toLowerCase().trim();
    const name = (payload.name && String(payload.name).trim()) || email.split("@")[0] || "User";
    const googleSub = String(payload.sub);

    if (role === "merchant") {
      if (mode === "signup" && !category) {
        return res.status(400).json({ message: "Select a business category before continuing with Google." });
      }

      const userConflict = await User.findOne({ email });
      if (userConflict) {
        return res.status(409).json({
          message:
            "This email is already used for a customer account. Use a different Google account for your business, or sign in as a customer.",
        });
      }

      let merchant =
        (await Merchant.findOne({ googleSub })) || (email ? await Merchant.findOne({ email }) : null);

      if (merchant) {
        if (merchant.googleSub && merchant.googleSub !== googleSub) {
          return res.status(403).json({ message: "This Google account is not linked to that business profile." });
        }
        if (merchant.email && merchant.email !== email) {
          return res.status(403).json({ message: "This Google account does not match the email on file." });
        }
        if (!merchant.googleSub) {
          merchant.googleSub = googleSub;
          merchant.authProvider = "google";
        }
        if (!merchant.email) {
          merchant.email = email;
        }
        if (name && !merchant.name) {
          merchant.name = name;
        }
        merchant.emailVerified = true;
        merchant.set("emailVerificationToken", undefined);
        merchant.set("emailVerificationExpires", undefined);
        await merchant.save();
        return res.json(toMerchantSession(merchant));
      }

      if (mode === "signin") {
        return res.status(401).json({
          message: "No merchant account found. Create a business account first, or use the role you registered with.",
        });
      }

      const cat = String(category).toLowerCase().trim();
      if (!cat) {
        return res.status(400).json({ message: "Business category is required." });
      }

      const approval = await isMerchantSignupAllowed(email);
      if (!approval.ok) {
        return res.status(403).json({ message: approval.message });
      }

      merchant = await Merchant.create({
        name,
        email,
        category: cat,
        authProvider: "google",
        googleSub,
        emailVerified: true,
      });

      return res.status(201).json(toMerchantSession(merchant));
    }

    // customer
    const merchantConflict = await Merchant.findOne({ email });
    if (merchantConflict) {
      return res.status(409).json({
        message:
          "This email is already used for a merchant account. Use a different email for your wallet, or sign in to the business portal.",
      });
    }

    let user = (await User.findOne({ googleSub })) || (email ? await User.findOne({ email }) : null);

    if (user) {
      if (user.role !== "customer") {
        return res.status(403).json({ message: "This account is not a customer account." });
      }
      if (user.googleSub && user.googleSub !== googleSub) {
        return res.status(403).json({ message: "This Google account is not linked to that profile." });
      }
      if (user.email && user.email !== email) {
        return res.status(403).json({ message: "This Google account does not match the email on file." });
      }
      if (!user.googleSub) {
        user.googleSub = googleSub;
        user.authProvider = "google";
      }
      if (!user.email) {
        user.email = email;
      }
      if (name) {
        user.name = name;
      }
      user.emailVerified = true;
      user.set("emailVerificationToken", undefined);
      user.set("emailVerificationExpires", undefined);
      await user.save();
      return res.json(toCustomerSession(user));
    }

    if (mode === "signin") {
      return res.status(401).json({
        message: "No account found for this Google sign-in. Create an account first.",
      });
    }

    user = await User.create({
      name,
      email,
      role: "customer",
      authProvider: "google",
      googleSub,
      emailVerified: true,
      preferences: [],
    });

    return res.status(201).json(toCustomerSession(user));
  } catch (error) {
    return next(error);
  }
};

const verifyEmailToken = async (req, res, next) => {
  try {
    const { token, role } = req.body;

    if (!token || !role) {
      return res.status(400).json({ message: "Verification token and role are required." });
    }

    const normalizedToken = String(token).trim();

    if (role === "customer") {
      const user = await User.findOne({
        emailVerificationToken: normalizedToken,
        emailVerificationExpires: { $gt: new Date() },
        role: "customer",
      }).select("+emailVerificationToken +emailVerificationExpires");

      if (!user) {
        return res.status(400).json({
          message: "This link is invalid or has expired. Request a new verification email on the sign-in page.",
        });
      }

      await User.findByIdAndUpdate(user._id, {
        $set: { emailVerified: true },
        $unset: { emailVerificationToken: "", emailVerificationExpires: "" },
      });

      return res.json({
        message: "Your email is verified. You can sign in now.",
        emailVerified: true,
        role: "customer",
      });
    }

    if (role === "merchant") {
      const merchant = await Merchant.findOne({
        emailVerificationToken: normalizedToken,
        emailVerificationExpires: { $gt: new Date() },
      }).select("+emailVerificationToken +emailVerificationExpires");

      if (!merchant) {
        return res.status(400).json({
          message: "This link is invalid or has expired. Request a new verification email on the sign-in page.",
        });
      }

      await Merchant.findByIdAndUpdate(merchant._id, {
        $set: { emailVerified: true },
        $unset: { emailVerificationToken: "", emailVerificationExpires: "" },
      });

      return res.json({
        message: "Your email is verified. You can sign in now.",
        emailVerified: true,
        role: "merchant",
      });
    }

    return res.status(400).json({ message: "Invalid role." });
  } catch (error) {
    return next(error);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "email, password, and role are required." });
    }

    if (!["customer", "merchant"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    if (role === "customer") {
      const user = await User.findOne({ email: normalizedEmail, role: "customer" }).select("+password");
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password." });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: "Invalid email or password." });
      }
      if (user.authProvider === "google") {
        return res.status(400).json({ message: "This account uses Google sign-in." });
      }
      if (user.emailVerified === true) {
        return res.json({ message: "Your email is already verified. You can sign in.", alreadyVerified: true });
      }

      const { token, expiresAt } = createEmailVerificationSecret();
      await User.findByIdAndUpdate(user._id, {
        $set: {
          emailVerificationToken: token,
          emailVerificationExpires: expiresAt,
        },
      });

      const appUrl = getPublicAppUrl();
      const verifyPath = `/verify-email?${new URLSearchParams({ token, role: "customer" }).toString()}`;
      const verifyUrl = `${appUrl}${verifyPath}`;

      const emailResult = await sendSignupVerificationEmail({
        to: normalizedEmail,
        name: user.name,
        verifyUrl,
        roleLabel: "customer",
      });

      const sent = Boolean(emailResult?.sent);
      const payload = {
        message: sent
          ? "We sent a new verification link to your email."
          : "We could not send email. Check SMTP settings, or on localhost see the dev link in the response.",
        sent,
      };

      if (process.env.NODE_ENV === "development" && !sent) {
        payload.devVerificationPath = verifyPath;
      }

      return res.json(payload);
    }

    const merchant = await Merchant.findOne({ email: normalizedEmail }).select("+password");
    if (!merchant || !merchant.password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const match = await bcrypt.compare(password, merchant.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (merchant.authProvider === "google") {
      return res.status(400).json({ message: "This business uses Google sign-in." });
    }
    if (merchant.emailVerified === true) {
      return res.json({ message: "Your email is already verified. You can sign in.", alreadyVerified: true });
    }

    const { token, expiresAt } = createEmailVerificationSecret();
    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: {
        emailVerificationToken: token,
        emailVerificationExpires: expiresAt,
      },
    });

    const appUrl = getPublicAppUrl();
    const verifyPath = `/verify-email?${new URLSearchParams({ token, role: "merchant" }).toString()}`;
    const verifyUrl = `${appUrl}${verifyPath}`;

    const emailResult = await sendSignupVerificationEmail({
      to: normalizedEmail,
      name: merchant.name,
      verifyUrl,
      roleLabel: "merchant",
    });

    const sent = Boolean(emailResult?.sent);
    const payload = {
      message: sent
        ? "We sent a new verification link to your email."
        : "We could not send email. Check SMTP settings, or on localhost see the dev link in the response.",
      sent,
    };

    if (process.env.NODE_ENV === "development" && !sent) {
      payload.devVerificationPath = verifyPath;
    }

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    if (!email || !role || !["customer", "merchant"].includes(String(role))) {
      return res.status(400).json({ message: "Valid email and role (customer or merchant) are required." });
    }

    const emailCheck = assertSignupEmailAllowed(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ message: emailCheck.message });
    }
    const normalizedEmail = emailCheck.email;

    if (String(role) === "customer") {
      const user = await User.findOne({ email: normalizedEmail, role: "customer" }).select("+password");
      if (user && user.password) {
        const { token, expiresAt } = createPasswordResetSecret();
        await User.findByIdAndUpdate(user._id, {
          $set: {
            passwordResetToken: token,
            passwordResetExpires: expiresAt,
          },
        });
        const appUrl = getPublicAppUrl();
        const resetPath = `/reset-password?${new URLSearchParams({ token, role: "customer" }).toString()}`;
        const resetUrl = `${appUrl}${resetPath}`;
        const emailResult = await sendPasswordResetEmail({
          to: normalizedEmail,
          name: user.name,
          resetUrl,
          roleLabel: "Customer",
        });
        const sent = Boolean(emailResult?.sent);
        const payload = { message: FORGOT_PASSWORD_MESSAGE, sent };
        if (process.env.NODE_ENV === "development" && !sent) {
          payload.devResetPath = resetPath;
        }
        return res.json(payload);
      }
    } else {
      const merchant = await Merchant.findOne({ email: normalizedEmail }).select("+password");
      if (merchant && merchant.password) {
        const { token, expiresAt } = createPasswordResetSecret();
        await Merchant.findByIdAndUpdate(merchant._id, {
          $set: {
            passwordResetToken: token,
            passwordResetExpires: expiresAt,
          },
        });
        const appUrl = getPublicAppUrl();
        const resetPath = `/reset-password?${new URLSearchParams({ token, role: "merchant" }).toString()}`;
        const resetUrl = `${appUrl}${resetPath}`;
        const emailResult = await sendPasswordResetEmail({
          to: normalizedEmail,
          name: merchant.name,
          resetUrl,
          roleLabel: "Merchant",
        });
        const sent = Boolean(emailResult?.sent);
        const payload = { message: FORGOT_PASSWORD_MESSAGE, sent };
        if (process.env.NODE_ENV === "development" && !sent) {
          payload.devResetPath = resetPath;
        }
        return res.json(payload);
      }
    }

    return res.json({ message: FORGOT_PASSWORD_MESSAGE, sent: false });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, role, newPassword } = req.body;

    if (!token || !role || newPassword == null) {
      return res.status(400).json({ message: "Token, role, and new password are required." });
    }
    if (!["customer", "merchant"].includes(String(role))) {
      return res.status(400).json({ message: "Invalid role." });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const now = new Date();
    if (String(role) === "customer") {
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: now },
      }).select("+password +passwordResetToken +passwordResetExpires");

      if (!user) {
        return res.status(400).json({
          message: "This link is invalid or has expired. Request a new reset from the sign-in page.",
        });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(user._id, {
        $set: { password: hashed, authProvider: "local" },
        $unset: { passwordResetToken: "", passwordResetExpires: "" },
      });
      return res.json({ message: "Your password is updated. You can sign in now." });
    }

    const merchant = await Merchant.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: now },
    }).select("+password +passwordResetToken +passwordResetExpires");

    if (!merchant) {
      return res.status(400).json({
        message: "This link is invalid or has expired. Request a new reset from the sign-in page.",
      });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: { password: hashed, authProvider: "local" },
      $unset: { passwordResetToken: "", passwordResetExpires: "" },
    });
    return res.json({ message: "Your password is updated. You can sign in now." });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  googleAuth,
  verifyEmailToken,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
};
