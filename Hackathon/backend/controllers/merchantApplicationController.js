const crypto = require("crypto");
const MerchantApplication = require("../models/MerchantApplication");
const { assertSignupEmailAllowed } = require("../utils/signupEmailPolicy");
const { getApiPublicUrl } = require("../utils/appUrl");
const {
  sendMerchantApplicationAdminNotify,
  sendMerchantApplicationApproved,
  sendMerchantApplicationRejected,
} = require("../services/emailService");
const {
  errorHtml,
  successApprove,
  successReject,
} = require("../utils/merchantEmailReviewPage");

const newReviewToken = () => crypto.randomBytes(32).toString("hex");

const buildEmailReviewUrls = (doc) => {
  const base = getApiPublicUrl();
  return {
    approveUrl: `${base}/api/merchants/review/email/approve?t=${encodeURIComponent(doc.emailApproveToken)}`,
    rejectUrl: `${base}/api/merchants/review/email/reject?t=${encodeURIComponent(doc.emailRejectToken)}`,
  };
};

async function finalizeApproveApplication(app) {
  const inbox = String(process.env.MERCHANT_ADMIN_EMAIL || "shamaiemshabbir3@gmail.com").trim();
  const to = app.email;
  const displayName = app.name;
  const reviewedAt = new Date();
  await MerchantApplication.findByIdAndUpdate(
    app._id,
    {
      $set: { status: "approved", reviewedAt, reviewedBy: inbox },
      $unset: { emailApproveToken: 1, emailRejectToken: 1 },
    },
    { new: true }
  );
  app.status = "approved";
  app.reviewedAt = reviewedAt;
  app.reviewedBy = inbox;
  app.emailApproveToken = undefined;
  app.emailRejectToken = undefined;
  await sendMerchantApplicationApproved({ to, name: displayName });
}

async function finalizeRejectApplication(app) {
  const inbox = String(process.env.MERCHANT_ADMIN_EMAIL || "shamaiemshabbir3@gmail.com").trim();
  const to = app.email;
  const displayName = app.name;
  const reviewedAt = new Date();
  await MerchantApplication.findByIdAndUpdate(
    app._id,
    {
      $set: { status: "rejected", reviewedAt, reviewedBy: inbox },
      $unset: { emailApproveToken: 1, emailRejectToken: 1 },
    },
    { new: true }
  );
  app.status = "rejected";
  app.reviewedAt = reviewedAt;
  app.reviewedBy = inbox;
  app.emailApproveToken = undefined;
  app.emailRejectToken = undefined;
  await sendMerchantApplicationRejected({ to, name: displayName });
}

const submitApplication = async (req, res, next) => {
  try {
    const { email, name, message } = req.body;
    const emailCheck = assertSignupEmailAllowed(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ message: emailCheck.message });
    }
    const nemail = emailCheck.email;
    const nameStr = name != null ? String(name).trim() : "";
    const messageStr = message != null ? String(message).trim() : "";

    const existing = await MerchantApplication.findOne({ email: nemail });
    let doc;
    if (existing) {
      if (existing.status === "approved") {
        return res.status(200).json({
          message:
            "You’re already approved. Open merchant sign up and use this same email (password or Google) to finish your account.",
          status: "approved",
        });
      }
      if (existing.status === "pending") {
        return res.status(200).json({
          message: "We already have your request. We’ll contact you at this address when it’s reviewed.",
          status: "pending",
        });
      }
      existing.name = nameStr || existing.name;
      existing.message = messageStr;
      existing.status = "pending";
      existing.reviewedAt = undefined;
      existing.reviewedBy = undefined;
      existing.emailApproveToken = newReviewToken();
      existing.emailRejectToken = newReviewToken();
      await existing.save();
      doc = existing;
    } else {
      doc = await MerchantApplication.create({
        email: nemail,
        name: nameStr,
        message: messageStr,
        status: "pending",
        emailApproveToken: newReviewToken(),
        emailRejectToken: newReviewToken(),
      });
    }
    const { approveUrl, rejectUrl } = buildEmailReviewUrls(doc);
    await sendMerchantApplicationAdminNotify({
      applicantEmail: nemail,
      name: nameStr,
      message: messageStr,
      applicationId: doc?._id,
      approveUrl,
      rejectUrl,
    });

    return res.status(201).json({
      message: "Request received. We’ll email you at this address when you’re approved to sign up.",
      status: "pending",
    });
  } catch (error) {
    return next(error);
  }
};

const listApplications = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ["pending", "approved", "rejected"].includes(String(status))) {
      filter.status = String(status);
    }
    const applications = await MerchantApplication.find(filter)
      .sort({ createdAt: -1 })
      .select("-emailApproveToken -emailRejectToken")
      .lean();
    return res.json({ applications });
  } catch (error) {
    return next(error);
  }
};

const approveApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const app = await MerchantApplication.findById(id);
    if (!app) {
      return res.status(404).json({ message: "Application not found." });
    }
    if (app.status === "approved") {
      return res.json({
        message: "Already approved.",
        application: {
          _id: app._id,
          email: app.email,
          name: app.name,
          status: app.status,
        },
      });
    }
    if (app.status !== "pending") {
      return res.status(400).json({
        message: "Only pending applications can be approved. The applicant can submit a new request if needed.",
      });
    }
    await finalizeApproveApplication(app);
    return res.json({
      message: "Approved. The applicant can now complete merchant sign up with that email.",
      application: { _id: app._id, email: app.email, name: app.name, status: app.status },
    });
  } catch (error) {
    return next(error);
  }
};

const rejectApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const app = await MerchantApplication.findById(id);
    if (!app) {
      return res.status(404).json({ message: "Application not found." });
    }
    if (app.status === "rejected") {
      return res.json({
        message: "Already rejected.",
        application: { _id: app._id, email: app.email, status: app.status },
      });
    }
    if (app.status !== "pending") {
      return res.status(400).json({ message: "Only pending applications can be rejected." });
    }
    await finalizeRejectApplication(app);
    return res.json({
      message: "Application rejected. They may request again later.",
      application: { _id: app._id, email: app.email, status: app.status },
    });
  } catch (error) {
    return next(error);
  }
};

const emailApproveByToken = async (req, res, next) => {
  try {
    const t = String(req.query.t || "").trim();
    if (!t) {
      return res.status(400).type("html").send(errorHtml("This link is missing a token. Check the full link in your email."));
    }
    const app = await MerchantApplication.findOne({ emailApproveToken: t });
    if (!app) {
      return res
        .status(404)
        .type("html")
        .send(
          errorHtml(
            "This approve link is invalid, expired, or the request was already handled. If you need to, use the admin list API or wait for a new request email."
          )
        );
    }
    if (app.status !== "pending") {
      return res.status(400).type("html").send(errorHtml("This request was already decided. Fresh links are sent for new requests only."));
    }
    const email = app.email;
    const displayName = app.name;
    await finalizeApproveApplication(app);
    return res.status(200).type("html").send(successApprove({ email, name: displayName }));
  } catch (error) {
    return next(error);
  }
};

const emailRejectByToken = async (req, res, next) => {
  try {
    const t = String(req.query.t || "").trim();
    if (!t) {
      return res.status(400).type("html").send(errorHtml("This link is missing a token. Check the full link in your email."));
    }
    const app = await MerchantApplication.findOne({ emailRejectToken: t });
    if (!app) {
      return res
        .status(404)
        .type("html")
        .send(
          errorHtml(
            "This decline link is invalid, expired, or the request was already handled. You can use the admin list API if you still need to act."
          )
        );
    }
    if (app.status !== "pending") {
      return res.status(400).type("html").send(errorHtml("This request was already decided. Fresh links are sent for new requests only."));
    }
    await finalizeRejectApplication(app);
    return res.status(200).type("html").send(successReject());
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  submitApplication,
  listApplications,
  approveApplication,
  rejectApplication,
  emailApproveByToken,
  emailRejectByToken,
};
