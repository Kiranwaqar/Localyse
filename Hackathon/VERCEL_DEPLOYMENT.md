# Vercel Deployment

This project is configured for one Vercel deployment from the repository root.

## Vercel Settings

- Framework preset: Other
- Install command: handled by `vercel.json`
- Build command: handled by `vercel.json`
- Output directory: handled by `vercel.json`

## Environment Variables

Add these in Vercel Project Settings -> Environment Variables (Production and Preview as needed):

```text
MONGO_URI=your-mongodb-atlas-uri
TAVILY_API_KEY=your-tavily-api-key
GROQ_API_KEY=your-groq-api-key
VITE_GEOAPIFY_API_KEY=your-geoapify-api-key
GOOGLE_CLIENT_ID=your-oauth-web-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-oauth-web-client-id.apps.googleusercontent.com
WEATHER_API_KEY=optional-if-used
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=Localyse <your-smtp-user>
CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

**URLs in emails (required for a working public app)**

Vercel sets `VERCEL_URL` automatically. The API uses it (with `getPublicAppUrl` / `getApiPublicUrl`) so links in emails point at your deployment instead of `localhost` — as long as the **server** runs on Vercel.

- **`FRONTEND_URL`**: Set to your canonical site URL, e.g. `https://your-app.vercel.app` or your custom domain. Use this if you use a custom domain (so verify-email, password reset, and merchant “you’re approved” links match the site users open).
- **`API_PUBLIC_URL`**: Only if the API is hosted on a **different** host than the SPA. On this repo the API is under `/api` on the same Vercel project, so you usually **omit** it. If omitted, the backend now reuses `FRONTEND_URL` and then `VERCEL_URL` for approve/reject links in the admin email.

**Merchant approval**

```text
MERCHANT_ADMIN_EMAIL=you@example.com
MERCHANT_ADMIN_KEY=long-random-secret
```

**`VITE_API_URL`:** Leave **unset** or empty for the default Vercel setup (same domain as `https://your-app.vercel.app`, API at `/api/...`). Do **not** set it to `http://localhost:5000` in Vercel — the browser would call the user’s machine and **email verification, login, and resend** would fail. If you need a separate API host, set it to the full `https://...` origin of that API (never localhost).

### No emails in production? (SMTP)

Verification, coupons, and merchant mail **only send if SMTP is set on the server**. Local `.env` does **not** apply to Vercel — you must add the same variables in **Vercel → Settings → Environment Variables** for **Production** (and Preview if you test there), then **redeploy**.

1. Open `https://YOUR-APP.vercel.app/api/health` and check JSON:  
   - **`"smtpConfigured": true`** → the app sees host/port/user/password.  
   - **`false`** → add all of: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` (Gmail example below).

2. **Gmail** (typical):
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `465`
   - `SMTP_SECURE` = `true` (must be the string `true` for 465)
   - `SMTP_USER` = your full Gmail address
   - `SMTP_PASS` = [Google App Password](https://myaccount.google.com/apppasswords) (16 characters; not your normal Gmail password)
   - `SMTP_FROM` = e.g. `Localyse <you@gmail.com>`

3. After changing env vars, **Redeploy** (Deployments → ⋮ → Redeploy) so serverless functions pick up new values.

4. If `smtpConfigured` is true but still no mail, open **Vercel → Project → Logs** (or Functions → your route) and look for **`[Email send failed]`** — that line shows the real SMTP error (auth, blocked, etc.).

If emails are not received, confirm SMTP variables in Vercel and that the sender is allowed (e.g. Gmail app password).

## Local Development

Run the apps separately:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

The frontend falls back to `http://localhost:5000` during local development.
