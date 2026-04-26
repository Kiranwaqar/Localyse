# Vercel Deployment

This project is configured for one Vercel deployment from the repository root.

## Vercel Settings

- Framework preset: Other
- Install command: handled by `vercel.json`
- Build command: handled by `vercel.json`
- Output directory: handled by `vercel.json`

## Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

```text
MONGO_URI=your-mongodb-atlas-uri
TAVILY_API_KEY=your-tavily-api-key
VITE_GEOAPIFY_API_KEY=your-geoapify-api-key
WEATHER_API_KEY=optional-if-used
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=Localyse <your-smtp-user>
CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

`VITE_API_URL` is not required on Vercel because the frontend calls the API on the same domain.

## Local Development

Run the apps separately:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

The frontend falls back to `http://localhost:5000` during local development.
