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
 * Public base URL used to build `/api/...` links in emails (merchant approve/reject, etc.).
 *
 * On Vercel, the API is usually the same origin as the SPA (`/api/*` → serverless). This function
 * therefore falls back like the app URL: FRONTEND_URL, then VERCEL_URL (set automatically on Vercel),
 * so links are not `localhost` in production.
 *
 * Use API_PUBLIC_URL or BACKEND_URL only if the API is on a different host than the web app.
 */
const getApiPublicUrl = () => {
  const explicit = String(process.env.API_PUBLIC_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const frontend = String(process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
  if (frontend) return frontend;

  const vercel = String(process.env.VERCEL_URL || "").trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/$/, "");
  }

  const port = String(process.env.PORT || "5000");
  return `http://localhost:${port}`;
};

module.exports = { getPublicAppUrl, getApiPublicUrl };
