/**
 * Public URL of the web app (for links in emails). Set FRONTEND_URL in production.
 */
const getPublicAppUrl = () => {
  const explicit = String(process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const vercel = String(process.env.VERCEL_URL || "").trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/$/, "");
  }

  return "http://localhost:8080";
};

/**
 * Public base URL of this API (for one-click review links in emails). Set in production, e.g. https://api.yourdomain.com
 */
const getApiPublicUrl = () => {
  const explicit = String(process.env.API_PUBLIC_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const port = String(process.env.PORT || "5000");
  return `http://localhost:${port}`;
};

module.exports = { getPublicAppUrl, getApiPublicUrl };
