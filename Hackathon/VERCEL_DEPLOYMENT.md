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

`VITE_API_URL` is not required on Vercel because the frontend calls the API on the same domain.

If emails are not received, confirm SMTP variables in Vercel and that the sender is allowed (e.g. Gmail app password).

## Local Development

Run the apps separately:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

The frontend falls back to `http://localhost:5000` during local development.
