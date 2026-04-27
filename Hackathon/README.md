# Localyse

**HackNtion 5th Hackathon Project**

Localyse is an AI-powered, finance-aware city wallet that connects customers with nearby merchant offers while protecting their budget. It helps merchants generate smarter offers from real business data, and helps customers decide whether a deal is actually good for their wallet.

## What It Does

Localyse combines local offers, customer budgets, merchant data, and real-time context to create a smarter city commerce experience.

For customers, Localyse recommends nearby offers based on:

- Remaining category budget
- Claimed and redeemed offer history
- Location and time context
- Mood-based personalization
- Food/category preferences
- Spending safety and financial state

For merchants, Localyse helps generate AI offers using:

- Sales and finance sheets
- Inventory sheets
- Product margin sheets
- Business goals
- Exact store location
- Weather and live context

## Key Features

### Customer App

- Email + password or Google; email verification; forgot / reset password
- Personalized live offer feed
- Nearby offer map with location filtering
- Mood-based "For You" recommendations
- Personal Wallet with USD budgets
- Category-wise budget tracking
- Smart recommendations based on remaining budget
- Coupon claiming and redemption history
- Email coupons after claiming
- Budget updates after merchant redemption

### Merchant App

- **Invite-only signup**: request access, then owner approval (email or admin API) before creating an account
- Email + password or Google; email verification; forgot / reset password
- Merchant signup with business category (after approval)
- AI offer generation from business files
- Exact address and map pin selection
- Published offer cards with actual price and after-offer price
- Coupon claims page with customer name, email, coupon code, and redeem action
- Offer analytics dashboard
- Budget-fit email notifications to customers when new offers align with their wallet

### AI and Intelligence

- **Tavily** — live web search + answer for city and category context
- **Groq** — merges spreadsheet rollups, Tavily, and weather into JSON-structured synthesis (`reasonWhyNow` augment, narrative, risk check, data highlights). Set `GROQ_API_KEY`; if unset, offers still work with Tavily + heuristics only.
- **Spreadsheet analytics** — XLSX uploads plus pandas-style rollups in Node (revenue concentration, margin spread, inventory pressure). Optional: import **published Google Sheets** via CSV in `sheetUrlService.js` (no key) for demos.
- Weather-aware offer reasoning
- Adaptive Budget Intelligence Engine
- Financial state detection: `overspending`, `at_risk`, `balanced`, `under_budget`
- Offer impact simulation before recommendation
- Personalized recommendation explanations

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Shadcn-style UI components
- Bootstrap Icons

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- Multer
- XLSX file parsing
- Nodemailer
- Google Sign-In (google-auth-library)
- Tavily API
- Groq API (see `GROQ_API_KEY` in `.env.example`)
- Weather context API
- Geoapify location search

### Deployment

- Vercel frontend + serverless API
- MongoDB Atlas

## Project Structure

```text
Hackathon/
├── api/                    # Vercel serverless Express adapter
├── backend/                # Express API, models, controllers, services
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/               # React + Vite customer and merchant apps
│   └── src/
│       ├── components/
│       ├── lib/
│       └── pages/
├── vercel.json             # Vercel deployment config
└── VERCEL_DEPLOYMENT.md    # Deployment notes
```

## Environment Variables

Create these local files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend

Use `backend/.env.example` as the source of truth. In addition to core keys, you will typically set:

- `GROQ_API_KEY` — offer synthesis
- `GOOGLE_CLIENT_ID` — must match the frontend
- `FRONTEND_URL` — links in emails (verify, password reset, merchant approval)
- `API_PUBLIC_URL` — public base URL of this API (merchant approve/decline links in email)
- `MERCHANT_ADMIN_EMAIL`, `MERCHANT_ADMIN_KEY` — invite-only merchant flow

```text
PORT=5000
NODE_ENV=development
MONGO_URI=your-mongodb-atlas-uri
TAVILY_API_KEY=your-tavily-api-key
GROQ_API_KEY=your-groq-api-key
CORS_ORIGIN=http://localhost:8080
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
FRONTEND_URL=http://localhost:8080
SMTP_*
MERCHANT_ADMIN_EMAIL=you@example.com
MERCHANT_ADMIN_KEY=change-me
```

### Frontend

```text
VITE_API_URL=http://localhost:5000
VITE_GEOAPIFY_API_KEY=your-geoapify-api-key
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

For Vercel, add the same variables in Vercel Project Settings. `VITE_API_URL` is optional in production because the deployed frontend calls the API on the same domain.

## Local Setup

Install dependencies:

```bash
npm --prefix backend install
npm --prefix frontend install
```

Start the backend:

```bash
npm --prefix backend run dev
```

Start the frontend:

```bash
npm --prefix frontend run dev
```

Open:

```text
http://localhost:8080
```

Backend health check:

```text
http://localhost:5000/api/health
```

## Build Check

From the project root:

```bash
npm run check
```

This checks the serverless API entry, backend syntax, and frontend production build.

## Vercel Deployment

This repository is configured for deployment from the project root.

1. Push the project to GitHub.
2. Import the GitHub repo in Vercel.
3. Use the project root as the root directory.
4. Add the required environment variables.
5. Deploy.

After deployment, test:

```text
https://your-project.vercel.app
https://your-project.vercel.app/api/health
```

## Core User Flow

1. **New merchant:** request access → owner approves → sign up (email or Google) and verify as needed.
2. Merchant selects a business category and uploads sales, inventory, and margin files.
3. AI generates a business-safe offer with actual and discounted price.
4. Customers see personalized, budget-aware offers.
5. Customer claims an offer and receives a pastel coupon email.
6. Merchant redeems the coupon.
7. Customer wallet updates the relevant category budget.

## Why Localyse Matters

Most offer apps only ask: "Is this deal attractive?"

Localyse asks something better:

> "Is this deal right for this person, in this place, at this time, with this budget?"

That makes Localyse more than a coupon app. It is a proactive financial advisor for local city commerce.

## Hackathon Highlight

Localyse was built for HackNtion 5th Hackathon as a full-stack AI commerce system with real database persistence, file-based merchant intelligence, customer wallet tracking, email workflows, and Vercel-ready deployment.

## License

This project is for hackathon and educational use.
