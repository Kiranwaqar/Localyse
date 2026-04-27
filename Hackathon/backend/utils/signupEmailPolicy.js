/**
 * Server-side sign-up email rules. Browsers can lie; the API enforces this.
 * - Google Sign-In: trust Google's email_verified (handled in authController).
 * - Email/password: we cannot prove a mailbox exists without sending mail or a paid API.
 *   We block common throwaway domains and invalid-looking addresses.
 */

const DISPOSABLE_DOMAINS = new Set(
  [
    "mailinator.com",
    "guerrillamail.com",
    "guerrillamailblock.com",
    "sharklasers.com",
    "yopmail.com",
    "yopmail.fr",
    "throwaway.email",
    "trashmail.com",
    "tempmail.com",
    "tempmail.org",
    "10minutemail.com",
    "10minutemail.net",
    "fakeinbox.com",
    "getnada.com",
    "mailnesia.com",
    "mohmal.com",
    "dispostable.com",
    "trash-gmail.com",
  ].map((d) => d.toLowerCase())
);

const ROUGH_EMAIL = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const normalize = (email) => String(email || "").trim().toLowerCase();

const isValidFormat = (email) => {
  const s = normalize(email);
  if (s.length < 3 || s.length > 320) return false;
  if (!ROUGH_EMAIL.test(s)) return false;
  if (s.includes("..") || s.startsWith(".") || s.includes("@.")) return false;
  return true;
};

const getDomain = (email) => {
  const s = normalize(email);
  const at = s.lastIndexOf("@");
  if (at < 0) return "";
  return s.slice(at + 1);
};

const isDisposableDomain = (email) => {
  const domain = getDomain(email);
  if (!domain) return true;
  // Subdomains: block root disposable host
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i += 1) {
    const sub = parts.slice(i).join(".");
    if (DISPOSABLE_DOMAINS.has(sub)) return true;
  }
  return DISPOSABLE_DOMAINS.has(domain);
};

/**
 * @returns {{ ok: true, email: string } | { ok: false, message: string }}
 */
const assertSignupEmailAllowed = (email) => {
  const s = normalize(email);
  if (!s) {
    return { ok: false, message: "Email is required." };
  }
  if (!isValidFormat(s)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (isDisposableDomain(s)) {
    return {
      ok: false,
      message: "Use a real email from a standard provider. Temporary or disposable addresses are not allowed.",
    };
  }
  return { ok: true, email: s };
};

module.exports = {
  assertSignupEmailAllowed,
  isValidFormat,
  isDisposableDomain,
};
