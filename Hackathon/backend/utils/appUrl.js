/**
 * True for URLs that should never be used in emails when running on Vercel (copy-paste from local .env).
 */
const isLocalOrLoopbackUrl = (value) => {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return true;
  return (
    s.includes("localhost") ||
    s.includes("127.0.0.1") ||
    s.includes("[::1]") ||
    /^https?:\/\/0\.0\.0\.0/.test(s)
  );
};

/** True when this process is a Vercel deployment (any environment). */
const isVercelRuntime = () => Boolean(String(process.env.VERCEL_URL || "").trim());

const originFromVercelEnv = () => {
  const vercel = String(process.env.VERCEL_URL || "").trim();
  if (!vercel) return null;
  const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return host.replace(/\/$/, "");
};

/**
 * Prefer a canonical production hostname when set (stable links in emails from preview builds).
 * See: https://vercel.com/docs/projects/environment-variables/system-environment-variables
 */
const originFromVercelProduction = () => {
  const prod = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim();
  if (!prod) return null;
  const host = prod.startsWith("http") ? prod : `https://${prod}`;
  return host.replace(/\/$/, "");
};

/**
 * Pick a URL for emails: use `candidate` unless we're on Vercel and it's localhost-like.
 */
const pickPublicUrl = (candidate, fallbackLocal) => {
  const trimmed = String(candidate || "").trim().replace(/\/$/, "");
  if (trimmed && !(isVercelRuntime() && isLocalOrLoopbackUrl(trimmed))) {
    return trimmed;
  }
  if (isVercelRuntime()) {
    const production = originFromVercelProduction();
    if (production) return production;
    const deployment = originFromVercelEnv();
    if (deployment) return deployment;
  }
  return trimmed || fallbackLocal;
};

/**
 * Public URL of the web app (for links in emails). Set FRONTEND_URL in production to your live domain.
 * On Vercel, if FRONTEND_URL is still http://localhost:... (from a copied .env), it is ignored.
 */
const getPublicAppUrl = () => {
  return pickPublicUrl(process.env.FRONTEND_URL, "http://localhost:8080");
};

/**
 * Public base URL used to build `/api/...` links in emails (merchant approve/reject one-click).
 * On Vercel, same origin as the site. Locally, the API is usually on PORT (5000), not the Vite dev port.
 */
const getApiPublicUrl = () => {
  const apiExplicit = pickPublicUrl(process.env.API_PUBLIC_URL || process.env.BACKEND_URL, "");
  if (apiExplicit) return apiExplicit;

  if (isVercelRuntime()) {
    const frontend = pickPublicUrl(process.env.FRONTEND_URL, "");
    if (frontend) return frontend;
    const production = originFromVercelProduction();
    if (production) return production;
    const deployment = originFromVercelEnv();
    if (deployment) return deployment;
  }

  const port = String(process.env.PORT || "5000");
  return `http://localhost:${port}`;
};

module.exports = { getPublicAppUrl, getApiPublicUrl };
