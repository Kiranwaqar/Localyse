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

- Merchant signup with business category
- AI offer generation from business files
- Exact address and map pin selection
- Published offer cards with actual price and after-offer price
- Coupon claims page with customer name, email, coupon code, and redeem action
- Offer analytics dashboard
- Budget-fit email notifications to customers when new offers align with their wallet

### AI and Intelligence

- Tavily-powered contextual insights
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
- Tavily API
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
│   ├── models/
│   ├── routes/
│   └── services/
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

```text
PORT=5000
NODE_ENV=development
MONGO_URI=your-mongodb-atlas-uri
TAVILY_API_KEY=your-tavily-api-key
CORS_ORIGIN=http://localhost:8080
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=Localyse <your-smtp-user>
```

### Frontend

```text
VITE_API_URL=http://localhost:5000
VITE_GEOAPIFY_API_KEY=your-geoapify-api-key
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

1. Merchant signs up and selects a business category.
2. Merchant uploads sales, inventory, and margin files.
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
