const nodemailer = require("nodemailer");

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
            <div style="font-size:18px;color:#3f3144;font-weight:800;margin-top:4px;">$${originalPrice}</div>
          </div>
          <div style="background:#eafbf5;border-radius:18px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:#5a8f78;text-transform:uppercase;font-weight:700;">After Offer</div>
            <div style="font-size:18px;color:#26775b;font-weight:800;margin-top:4px;">$${price}</div>
          </div>
          <div style="background:#fff0f7;border-radius:18px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:#9d6b8a;text-transform:uppercase;font-weight:700;">Saves</div>
            <div style="font-size:18px;color:#c0447d;font-weight:800;margin-top:4px;">$${savings}</div>
          </div>
        </div>
        <div style="background:#fff8ed;border:1px solid #ffe1ad;border-radius:20px;padding:16px;">
          <p style="margin:0;color:#775f33;font-size:14px;line-height:1.6;"><strong>Budget check:</strong> You have about <strong>$${remainingBudget}</strong> left in ${category}. ${reason}</p>
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
    text: `${offerText} at ${merchantName} fits your ${category} budget. After-offer price: $${price}. Remaining budget: $${remainingBudget}. ${reason}`,
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

module.exports = {
  sendCouponNotifications,
  sendBudgetAlignedOfferEmail,
};
