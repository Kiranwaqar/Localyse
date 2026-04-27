/**
 * Tiny HTML pages shown after the admin taps Approve or Reject in the merchant-request email.
 */
const esc = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const shell = (inner) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Localyse — merchant request</title>
</head>
<body style="margin:0;padding:24px;background:linear-gradient(180deg,#fff7fb 0%,#f0f4ff 100%);min-height:100vh;font-family:Inter,system-ui,Segoe UI,sans-serif;color:#3f3144;">
  <div style="max-width:480px;margin:0 auto;padding:0;">
    ${inner}
  </div>
</body>
</html>`;

const resultHtml = ({ line1, line2, emoji }) => {
  const e = esc(emoji || "✨");
  return shell(`<div style="background:#ffffff;border:1px solid #f4cfe0;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(214,122,164,0.12);text-align:center;padding:32px 24px 28px;">
  <div style="font-size:40px;line-height:1;margin-bottom:12px;" aria-hidden="true">${e}</div>
  <h1 style="font-size:1.25rem;font-weight:700;margin:0 0 10px;">${line1}</h1>
  <p style="font-size:0.9rem;color:#765f7a;margin:0;line-height:1.55;">${line2}</p>
  <p style="font-size:0.75rem;color:#a486a4;margin:22px 0 0;">Made with care — Localyse</p>
</div>`);
};

const errorHtml = (message) =>
  resultHtml({
    emoji: "🌷",
    line1: "Hmm, that link won’t work",
    line2: esc(message),
  });

const successApprove = ({ email, name }) => {
  const n = name ? ` (${esc(name)})` : "";
  return resultHtml({
    emoji: "💌",
    line1: "You’ve approved this merchant",
    line2: `${esc(String(email))}${n} can now sign up with that email. We’ve sent them a little hello so they know. 🎀`,
  });
};

const successReject = () =>
  resultHtml({
    emoji: "🫧",
    line1: "Request declined",
    line2: "We let them know—softly. They can try again another time if things change. 💫",
  });

module.exports = {
  errorHtml,
  successApprove,
  successReject,
  esc,
};
