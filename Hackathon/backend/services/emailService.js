const nodemailer = require("nodemailer");
const { formatPkr } = require("../utils/currency");
const { getPublicAppUrl } = require("../utils/appUrl");

const isRealValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(
    normalized &&
      !normalized.startsWith("your-") &&
      !normalized.includes("put_") &&
      !normalized.includes("app-password")
  );
};

const hasSmtpConfig = () =>
  Boolean(
    isRealValue(process.env.SMTP_HOST) &&
      isRealValue(process.env.SMTP_PORT) &&
      isRealValue(process.env.SMTP_USER) &&
      isRealValue(process.env.SMTP_PASS)
  );

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    return { sent: false, reason: "missing_recipient" };
  }

  if (!hasSmtpConfig()) {
    console.log(`[Email skipped: SMTP not configured] To: ${to} | ${subject} | ${text}`);
    return { sent: false, reason: "smtp_not_configured" };
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
};

const buildCouponEmailHtml = ({ merchantName, offerText, couponCode }) => `
  <div style="margin:0;padding:28px;background:#fff7fb;font-family:Inter,Arial,sans-serif;color:#3f3144;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f4cfe0;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(214,122,164,0.18);">
      <div style="background:linear-gradient(135deg,#ffd6e8,#e6ddff,#d7f7ee);padding:28px;text-align:center;">
        <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#7a5b7f;font-weight:700;">Localyse Coupon</div>
        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;color:#3f3144;">Your sweet little deal is ready</h1>
      </div>
      <div style="padding:28px;text-align:center;">
        <p style="margin:0;color:#765f7a;font-size:15px;line-height:1.6;">Show this coupon at <strong>${merchantName}</strong> to redeem:</p>
        <p style="margin:18px 0 0;font-size:17px;line-height:1.5;font-weight:700;color:#3f3144;">${offerText}</p>
        <div style="margin:26px auto 20px;display:inline-block;background:#fff0f7;border:2px dashed #e99ac2;border-radius:20px;padding:18px 28px;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#9d6b8a;font-weight:700;">Coupon Code</div>
          <div style="font-size:32px;letter-spacing:3px;color:#c0447d;font-weight:800;margin-top:6px;">${couponCode}</div>
        </div>
        <p style="margin:0;color:#8b768d;font-size:13px;line-height:1.6;">Keep this code handy and enjoy your pastel-powered savings.</p>
      </div>
      <div style="padding:18px;text-align:center;background:#fffafd;color:#a486a4;font-size:12px;">Made with Localyse</div>
    </div>
  </div>
`;

const sendCouponNotifications = async ({ customerEmail, merchantName, offerText, couponCode }) => {
  const customerResult = await sendEmail({
    to: customerEmail,
    subject: `Your Localyse coupon: ${couponCode}`,
    text: `Your offer at ${merchantName} is claimed. Coupon code: ${couponCode}. Show this code to redeem: ${offerText}`,
    html: buildCouponEmailHtml({ merchantName, offerText, couponCode }),
  });

  return {
    customer: customerResult,
  };
};

const buildBudgetOfferEmailHtml = ({
  customerName,
  merchantName,
  offerText,
  category,
  price,
  originalPrice,
  savings,
  remainingBudget,
  reason,
}) => `
  <div style="margin:0;padding:28px;background:#fff7fb;font-family:Inter,Arial,sans-serif;color:#3f3144;">
    <div style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #f4cfe0;border-radius:30px;overflow:hidden;box-shadow:0 18px 50px rgba(214,122,164,0.18);">
      <div style="background:linear-gradient(135deg,#ffd6e8,#e6ddff,#d7f7ee);padding:30px;text-align:center;">
        <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#7a5b7f;font-weight:800;">Localyse Budget Match</div>
        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;color:#3f3144;">A sweet offer fits your wallet</h1>
        <p style="margin:10px 0 0;color:#6f5c75;font-size:14px;">Hi ${customerName || "there"}, this deal was picked because it suits your ${category} budget.</p>
      </div>
      <div style="padding:28px;">
        <div style="background:#fffafd;border:1px solid #f4d8e7;border-radius:24px;padding:22px;text-align:center;">
          <p style="margin:0;color:#8a6d8e;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">New offer at ${merchantName}</p>
          <h2 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#3f3144;">${offerText}</h2>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:18px 0;">
          <div style="background:#f7f2ff;border-radius:18px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:#8a7891;text-transform:uppercase;font-weight:700;">Actual</div>
            <div style="font-size:18px;color:#3f3144;font-weight:800;margin-top:4px;">${formatPkr(originalPrice)}</div>
          </div>
          <div style="background:#eafbf5;border-radius:18px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:#5a8f78;text-transform:uppercase;font-weight:700;">After Offer</div>
            <div style="font-size:18px;color:#26775b;font-weight:800;margin-top:4px;">${formatPkr(price)}</div>
          </div>
          <div style="background:#fff0f7;border-radius:18px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:#9d6b8a;text-transform:uppercase;font-weight:700;">Saves</div>
            <div style="font-size:18px;color:#c0447d;font-weight:800;margin-top:4px;">${formatPkr(savings)}</div>
          </div>
        </div>
        <div style="background:#fff8ed;border:1px solid #ffe1ad;border-radius:20px;padding:16px;">
          <p style="margin:0;color:#775f33;font-size:14px;line-height:1.6;"><strong>Budget check:</strong> You have about <strong>${formatPkr(remainingBudget)}</strong> left in ${category}. ${reason}</p>
        </div>
        <p style="margin:18px 0 0;color:#8b768d;font-size:13px;line-height:1.6;text-align:center;">Open Localyse to claim it while it is still live.</p>
      </div>
      <div style="padding:18px;text-align:center;background:#fffafd;color:#a486a4;font-size:12px;">Pastel-powered by Localyse</div>
    </div>
  </div>
`;

const sendBudgetAlignedOfferEmail = async ({
  customerEmail,
  customerName,
  merchantName,
  offerText,
  category,
  price,
  originalPrice,
  savings,
  remainingBudget,
  reason,
}) =>
  sendEmail({
    to: customerEmail,
    subject: `A Localyse offer fits your ${category} budget`,
    text: `${offerText} at ${merchantName} fits your ${category} budget. After-offer price: ${formatPkr(
      price
    )}. Remaining budget: ${formatPkr(remainingBudget)}. ${reason}`,
    html: buildBudgetOfferEmailHtml({
      customerName,
      merchantName,
      offerText,
      category,
      price,
      originalPrice,
      savings,
      remainingBudget,
      reason,
    }),
  });

const escHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildVerificationEmailHtml = ({ name, verifyUrl, roleLabel }) => {
  const safeName = escHtml(name || "there");
  const isMerchant = String(roleLabel || "").toLowerCase() === "merchant";
  const roleLine = isMerchant
    ? "We’re so excited to welcome <strong>your business</strong> to Localyse."
    : "We can’t wait to help <strong>your wallet</strong> find cozy little deals nearby.";

  return `
  <div style="margin:0;padding:32px 20px;background:linear-gradient(180deg,#fff7fb 0%,#f5f0ff 50%,#f0fdfa 100%);font-family:Inter,Segoe UI,Arial,sans-serif;color:#3f3144;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f4cfe0;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(214,122,164,0.12);">
      <div style="background:linear-gradient(135deg,#ffd6e8,#e6ddff,#d7f7ee);padding:26px 24px 22px;text-align:center;">
        <div style="font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:#7a5b7f;font-weight:800;">A tiny hello from Localyse</div>
        <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;color:#3f3144;">Let’s make it official, ${safeName} &nbsp;</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#6b5275;line-height:1.5;">One soft tap to verify your email—then the fun part begins.</p>
      </div>
      <div style="padding:26px 24px 28px;">
        <p style="margin:0;font-size:15px;line-height:1.65;color:#5c4865;">${roleLine}</p>
        <p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:#5c4865;">Click the little button and we’ll know it’s really you. Pastel promise: it only takes a second.</p>
        <div style="text-align:center;margin:30px 0 24px;">
          <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#e99ac2,#c7b3f5);color:#3f3144;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:800;font-size:15px;letter-spacing:0.02em;box-shadow:0 10px 24px rgba(201,100,150,0.25);">Verify my email</a>
        </div>
        <div style="background:#fffafd;border:1px dashed #f0c2dd;border-radius:20px;padding:16px 18px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9d6b8a;font-weight:700;letter-spacing:0.5px;">Pssst &mdash; link cozy expires in 48h</p>
          <p style="margin:6px 0 0;font-size:12px;color:#a486a4;line-height:1.5;">If you didn’t just join Localyse, you can ignore this note. No hard feelings.</p>
        </div>
      </div>
      <div style="padding:16px 20px 20px;text-align:center;background:linear-gradient(90deg,#fffafd,#f7f0ff);color:#a486a4;font-size:12px;">Made with sugar and Localyse</div>
    </div>
  </div>
`;
};

const buildVerificationEmailText = ({ name, verifyUrl, roleLabel }) => {
  const n = name || "there";
  return `Hi ${n} — a tiny hello from Localyse!

We need one soft tap to verify your email (${roleLabel} sign-up) before you hop in. Open this link in your browser:
${verifyUrl}

The link is valid for 48 hours. If you didn’t create an account, you can ignore this.

— Localyse (pastel-powered)`;
};

const sendSignupVerificationEmail = async ({ to, name, verifyUrl, roleLabel }) => {
  const displayRole = String(roleLabel || "member").toLowerCase() === "merchant" ? "Merchant" : "Customer";
  return sendEmail({
    to,
    subject: "Your Localyse hello—just one little verify ✨",
    text: buildVerificationEmailText({ name, verifyUrl, roleLabel: displayRole }),
    html: buildVerificationEmailHtml({ name, verifyUrl, roleLabel: displayRole }),
  });
};

const getMerchantAdminInbox = () =>
  String(process.env.MERCHANT_ADMIN_EMAIL || "shamaiemshabbir3@gmail.com").trim();

/**
 * Cutesy admin email: two big buttons to approve or reject in one click (links go to the API, token-protected).
 */
const buildMerchantApplicationAdminNotifyHtml = ({ applicantEmail, name, message, approveUrl, rejectUrl }) => {
  const n = name ? escHtml(name) : "—";
  const m = (message && String(message).trim()) ? escHtml(String(message)) : "—";
  return `
  <div style="margin:0;padding:24px 16px;background:#fff7fb;font-family:Inter,Segoe UI,system-ui,sans-serif;color:#3f3144;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #f4cfe0;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(214,122,164,0.16);">
      <div style="background:linear-gradient(135deg,#ffd6e8,#e6ddff,#d7f7ee);padding:24px 22px;text-align:center;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7a5b7f;font-weight:700;">Localyse</div>
        <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;color:#3f3144;">Someone wants to join the shop club 🛍️</h1>
        <p style="margin:10px 0 0;font-size:14px;color:#765f7a;">Tap a button to send them off with a yes or a gentle no~</p>
      </div>
      <div style="padding:22px 22px 8px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#3f3144;">
          <tr><td style="padding:6px 0;color:#8b6d91;font-size:12px;">Email</td><td style="padding:6px 0;font-weight:600;word-break:break-all;">${escHtml(applicantEmail)}</td></tr>
          <tr><td style="padding:6px 0;color:#8b6d91;font-size:12px;">Name</td><td style="padding:6px 0;">${n}</td></tr>
          <tr><td style="padding:6px 0;vertical-align:top;color:#8b6d91;font-size:12px;">Note</td><td style="padding:6px 0;line-height:1.5;">${m}</td></tr>
        </table>
      </div>
      <div style="padding:8px 18px 28px;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px;vertical-align:top;width:50%;">
              <a href="${escHtml(approveUrl)}" style="display:block;text-align:center;padding:16px 12px;border-radius:18px;font-weight:700;font-size:15px;text-decoration:none;color:#2d6a4f;background:linear-gradient(180deg,#d8f3dc 0%,#b7e4c7 100%);border:1px solid #95d5b2;box-shadow:0 4px 14px rgba(45,106,79,0.2);">Approve ✨</a>
            </td>
            <td style="padding:6px;vertical-align:top;width:50%;">
              <a href="${escHtml(rejectUrl)}" style="display:block;text-align:center;padding:16px 12px;border-radius:18px;font-weight:700;font-size:15px;text-decoration:none;color:#9d4a6f;background:linear-gradient(180deg,#ffe5ec 0%,#ffd6e0 100%);border:1px solid #f4a6c0;box-shadow:0 4px 14px rgba(157,74,111,0.15);">Decline 🫧</a>
            </td>
          </tr>
        </table>
        <p style="font-size:11px;color:#a486a4;margin:16px 0 0;text-align:center;line-height:1.5;">If the buttons are shy, you can also use the admin API with your key—but these links are a one-time, secret little ribbon just for you. 🎀</p>
      </div>
      <div style="padding:14px 18px 18px;text-align:center;background:linear-gradient(90deg,#fffafd,#f7f0ff);color:#9d86a2;font-size:11px;">Made with sugar and Localyse</div>
    </div>
  </div>`;
};

/** New merchant access request (notify platform owner: HTML buttons + plain-text fallbacks). */
const sendMerchantApplicationAdminNotify = async ({ applicantEmail, name, message, applicationId, approveUrl, rejectUrl }) => {
  const to = getMerchantAdminInbox();
  const subject = `✨ [Localyse] New merchant request — ${applicantEmail}`;
  const idLine = applicationId ? `Application ID: ${applicationId}` : "";
  const text = [
    "Someone requested merchant access on Localyse.",
    "",
    idLine,
    `Email: ${applicantEmail}`,
    `Name: ${name || "(not provided)"}`,
    `Message: ${message || "(none)"}`,
    "",
    approveUrl && rejectUrl
      ? `Open one of these links in your browser to approve or decline (one-time, private links):`
      : "Set API_PUBLIC_URL on the server so email buttons work. Until then, use the admin API with your MERCHANT_ADMIN_KEY.",
    approveUrl ? `Approve: ${approveUrl}` : "",
    rejectUrl ? `Decline: ${rejectUrl}` : "",
    "",
    "List pending (header X-Merchant-Admin-Key): GET /api/merchants/applications?status=pending",
  ]
    .filter(Boolean)
    .join("\n");

  const html =
    approveUrl && rejectUrl
      ? buildMerchantApplicationAdminNotifyHtml({ applicantEmail, name, message, approveUrl, rejectUrl })
      : null;

  return sendEmail({ to, subject, text, html: html || undefined });
};

const buildMerchantApplicationApprovedHtml = ({ displayName, signUpUrl }) => {
  const safe = escHtml(displayName);
  return `
  <div style="margin:0;padding:28px 16px;background:linear-gradient(180deg,#fff7fb 0%,#f5f0ff 50%,#f0fdfa 100%);font-family:Inter,Segoe UI,system-ui,sans-serif;color:#3f3144;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f4cfe0;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(214,122,164,0.18);">
      <div style="background:linear-gradient(135deg,#d8f3dc,#c7f0d8,#c7b3f5 55%,#e6ddff);padding:28px 24px 24px;text-align:center;">
        <div style="font-size:12px;letter-spacing:2.2px;text-transform:uppercase;color:#3d5a3f;font-weight:800;">You’re in</div>
        <h1 style="margin:10px 0 0;font-size:27px;line-height:1.15;color:#2d4a32;">Your little merchant invite is ready ✨</h1>
        <p style="margin:10px 0 0;font-size:15px;color:#3f4f42;line-height:1.55;">Hi <strong style="color:#1b4332;">${safe}</strong> — the team said yes! You can now set up your shop on Localyse with <strong>this same email</strong> (comfy password sign-up or Google, with a verified address like always).</p>
      </div>
      <div style="padding:22px 24px 10px;">
        <p style="margin:0;font-size:15px;line-height:1.65;color:#5c4865;">Tuck in, pick your category, and we’ll help your city find you. Your storefront is a few soft taps away~</p>
        <div style="text-align:center;margin:28px 0 22px;">
          <a href="${escHtml(signUpUrl)}" style="display:inline-block;background:linear-gradient(135deg,#e99ac2,#7eb77f);color:#2d2a32;text-decoration:none;padding:15px 30px;border-radius:9999px;font-weight:800;font-size:15px;letter-spacing:0.02em;box-shadow:0 10px 26px rgba(126,183,127,0.3);">Create my merchant account</a>
        </div>
        <div style="background:#f8fff4;border:1px dashed #b6e0c0;border-radius:20px;padding:16px 18px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#2d6a4f;font-weight:700;">Paste-friendly link (if the button is being shy)</p>
          <p style="margin:8px 0 0;word-break:break-all;font-size:12px;color:#5c6b5f;">${escHtml(signUpUrl)}</p>
        </div>
      </div>
      <div style="padding:16px 20px 20px;text-align:center;background:linear-gradient(90deg,#fffafd,#f7f0ff);color:#a486a4;font-size:12px;">Made with sugar and Localyse</div>
    </div>
  </div>`;
};

const buildMerchantApplicationRejectedHtml = ({ displayName }) => {
  const safe = escHtml(displayName);
  return `
  <div style="margin:0;padding:28px 16px;background:linear-gradient(180deg,#fff7fb 0%,#fff0f5 100%);font-family:Inter,Segoe UI,system-ui,sans-serif;color:#3f3144;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f4cfe0;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(214,122,164,0.12);">
      <div style="background:linear-gradient(135deg,#ffe5ec,#e6ddff,#fff6f8);padding:28px 24px 22px;text-align:center;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8b5a6a;font-weight:700;">A gentle no, for now</div>
        <h1 style="margin:10px 0 0;font-size:24px;line-height:1.2;color:#5c3d4a;">A tiny note about your Localyse request 🫧</h1>
        <p style="margin:12px 0 0;font-size:15px;color:#6b4e5a;line-height:1.6;">Hi <strong style="color:#3f2d35;">${safe}</strong> — thank you for wanting to be part of the neighborhood. We’re <strong>not</strong> able to open a merchant spot for <strong>this email</strong> at the moment. It’s a soft no, not a never.</p>
      </div>
      <div style="padding:20px 24px 8px;">
        <p style="margin:0;font-size:14px;line-height:1.65;color:#5c4865;">If something was mixed up, or your plans change, you’re always welcome to reach out the way you first said hello. We’re rooting for you either way. 💫</p>
        <div style="margin:22px 0 16px;padding:16px 18px;background:#fffbfe;border:1px dashed #f0c2dd;border-radius:20px;">
          <p style="margin:0;font-size:12px;color:#9d6b8a;text-align:center;line-height:1.5;">We keep things cozy and fair — a fresh request can always knock another day, when the timing feels right.</p>
        </div>
      </div>
      <div style="padding:16px 20px 20px;text-align:center;background:linear-gradient(90deg,#fffafd,#f7f0ff);color:#a486a4;font-size:12px;">Made with sugar and Localyse</div>
    </div>
  </div>`;
};

const buildMerchantApplicationApprovedText = ({ displayName, signUpUrl }) => {
  const n = displayName || "there";
  return `Hi ${n} — you’re in!

Your merchant access request was approved. Create your business account on Localyse with this same email (password or Google, verified email as usual).

Open: ${signUpUrl}

Tuck in and we’ll help your city find you. Pastel promise. ✨

— Localyse (made with sugar)`;
};

const buildMerchantApplicationRejectedText = ({ displayName }) => {
  const n = displayName || "there";
  return `Hi ${n},

Thank you for your interest in Localyse. We’re not able to approve a merchant account for this email right now — a gentle no, not a never.

If something was a mistake, or you’d like to try again another time, reach out the way you first contacted us. We’re rooting for you. 🫧

— Localyse (made with sugar)`;
};

const sendMerchantApplicationApproved = async ({ to, name }) => {
  const displayName = (name && String(name).trim()) || "there";
  const appUrl = getPublicAppUrl();
  const signUpUrl = `${appUrl}/auth?role=merchant`;
  return sendEmail({
    to,
    subject: "You’re in — your Localyse merchant invite is ready ✨",
    text: buildMerchantApplicationApprovedText({ displayName, signUpUrl }),
    html: buildMerchantApplicationApprovedHtml({ displayName, signUpUrl }),
  });
};

const sendMerchantApplicationRejected = async ({ to, name }) => {
  const displayName = (name && String(name).trim()) || "there";
  return sendEmail({
    to,
    subject: "A little note about your Localyse merchant request 🫧",
    text: buildMerchantApplicationRejectedText({ displayName }),
    html: buildMerchantApplicationRejectedHtml({ displayName }),
  });
};

const buildPasswordResetEmailHtml = ({ name, resetUrl, roleLabel }) => {
  const safe = escHtml(name || "there");
  const roleDisplay = String(roleLabel || "member");
  return `
  <div style="margin:0;padding:32px 20px;background:linear-gradient(180deg,#fff7fb 0%,#f5f0ff 50%,#f0fdfa 100%);font-family:Inter,Segoe UI,system-ui,sans-serif;color:#3f3144;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f4cfe0;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(214,122,164,0.12);">
      <div style="background:linear-gradient(135deg,#ffd6e8,#e6ddff,#d7f7ee);padding:26px 24px 22px;text-align:center;">
        <div style="font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:#7a5b7f;font-weight:800;">psst &mdash; password help</div>
        <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;color:#3f3144;">Let’s get you back in, ${safe} &nbsp;🔐</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#6b5275;line-height:1.5;">A cozy reset for your <strong>${escHtml(roleDisplay)}</strong> account. This link tucks itself away after two little hours~</p>
      </div>
      <div style="padding:26px 24px 28px;">
        <p style="margin:0;font-size:15px;line-height:1.65;color:#5c4865;">Tap the button to pick a new password. If you didn’t ask for this, you can snooze this email&mdash;your old password is still the same.</p>
        <div style="text-align:center;margin:28px 0 24px;">
          <a href="${escHtml(resetUrl)}" style="display:inline-block;background:linear-gradient(135deg,#e99ac2,#c7b3f5);color:#2d2a32;text-decoration:none;padding:14px 32px;border-radius:9999px;font-weight:800;font-size:15px;letter-spacing:0.02em;box-shadow:0 10px 24px rgba(201,100,150,0.25);">Reset my password</a>
        </div>
        <div style="background:#fffafd;border:1px dashed #f0c2dd;border-radius:20px;padding:16px 18px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9d6b8a;font-weight:700;">If the button is playing hide and seek</p>
          <p style="margin:6px 0 0;word-break:break-all;font-size:12px;color:#a486a4;">${escHtml(resetUrl)}</p>
        </div>
      </div>
      <div style="padding:16px 20px 20px;text-align:center;background:linear-gradient(90deg,#fffafd,#f7f0ff);color:#a486a4;font-size:12px;">Made with sugar and Localyse</div>
    </div>
  </div>`;
};

const buildPasswordResetEmailText = ({ name, resetUrl, roleLabel }) => {
  const n = name || "there";
  return `Hi ${n} — we heard you need a new password for your Localyse ${roleLabel} account.

Open this link (valid about 2 hours):
${resetUrl}

If you didn’t request this, ignore this message—your password stays the same. ✨

— Localyse (made with sugar)`;
};

const sendPasswordResetEmail = async ({ to, name, resetUrl, roleLabel }) => {
  return sendEmail({
    to,
    subject: "Reset your Localyse password—cozy one-time link ✨",
    text: buildPasswordResetEmailText({ name, resetUrl, roleLabel }),
    html: buildPasswordResetEmailHtml({ name, resetUrl, roleLabel }),
  });
};

module.exports = {
  sendCouponNotifications,
  sendBudgetAlignedOfferEmail,
  sendSignupVerificationEmail,
  hasSmtpConfig,
  sendMerchantApplicationAdminNotify,
  sendMerchantApplicationApproved,
  sendMerchantApplicationRejected,
  sendPasswordResetEmail,
};
