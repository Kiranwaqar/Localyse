<div align="center">

# 🏙️ Localyse

### AI-Powered Finance-Aware City Wallet


<br/>

[![HackNtion](https://img.shields.io/badge/🏆_HackNtion-5th_Hackathon-ff6b9d?style=for-the-badge&labelColor=1a1a2e)](https://github.com)
[![Status](https://img.shields.io/badge/Status-Live_on_Vercel-00d4aa?style=for-the-badge&logo=vercel&logoColor=white&labelColor=1a1a2e)](https://vercel.com)
[![License](https://img.shields.io/badge/License-Educational-a78bfa?style=for-the-badge&labelColor=1a1a2e)](./LICENSE)

<br/>

[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com/)

<br/>


> ### ✨ *"Is this deal right for this person, in this place, at this time, with this budget?"*

<br/>

</div>

---

## 🌆 What is Localyse?

**Localyse** is an AI-powered, finance-aware city wallet that bridges the gap between local merchants and budget-conscious customers. It's not just another coupon app — it's a **proactive financial advisor for local city commerce**.

<<<<<<< HEAD
Built with 💙 by

| **[shamaiem10](https://github.com/shamaiem10)** | **[Kiranwaqar](https://github.com/Kiranwaqar)** |

</div>
=======
```
🛍️  Merchants  →  upload business data  →  AI generates smart offers
👛  Customers  →  get budget-aware recs  →  claim & redeem locally
🤖  AI Engine  →  weather + mood + wallet  →  perfect deal at perfect time
```
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

---

## 💡 The Problem We Solve

| Other offer apps ask... | Localyse asks... |
|---|---|
| ❓ Is this deal attractive? | ✅ Is this deal right for **this person**? |
| ❓ Is this popular nearby? | ✅ Is this the right **time and place**? |
| ❓ Is it a discount? | ✅ Does this fit their **actual budget**? |

---

## ✨ Features at a Glance

<details>
<summary><b>👛 Customer App</b></summary>
<br/>

<<<<<<< HEAD
| Feature | Description |
|---|---|
| 📍 Live Offer Feed | Personalized offers based on your location & time |
| 🗺️ Nearby Map | Filter offers by distance on an interactive map |
| 😊 Mood-Based Picks | "For You" recommendations tuned to how you feel |
| 💰 Personal Wallet | Set USD budgets per spending category |
| 📊 Budget Tracker | See exactly how much you have left before you spend |
| 🎟️ Smart Coupons | Claim, receive via email, and redeem at the store |
| 🔁 Redemption History | Track every deal you've used |
| 🔐 Sign-in & accounts | Email + password, **Google Sign-In**, email verification, **forgot / reset password** |
=======
- 🔐 Email + password or Google Sign-In with email verification
- 📍 Nearby offer map with live location filtering
- 🎭 Mood-based **"For You"** personalized recommendations
- 💰 Personal Wallet with USD budgets per category
- 📊 Category-wise budget tracking & spending safety alerts
- 🎟️ Coupon claiming, pastel coupon emails, and redemption history
- 🧠 Smart recommendations based on remaining budget
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

</details>

<<<<<<< HEAD
| Feature | Description |
|---|---|
| ✉️ Invite-only onboarding | New merchants **request access**; owner approves before sign-up (email or Google) |
| 🎀 Admin approval | Email to platform owner with **one-tap Approve / Decline**; optional API with `MERCHANT_ADMIN_KEY` |
| 🤖 AI Offer Generator | Upload your sales/inventory files — AI does the rest |
| 📌 Geo-Pinning | Set your exact store location on a map |
| 💳 Offer Cards | Show actual price vs. after-offer price clearly |
| 👤 Coupon Claims Page | View customer name, email, coupon code & redeem |
| 📈 Analytics Dashboard | Track offer performance in real-time |
| 📧 Budget-Fit Emails | Notify customers when a new offer fits their wallet |
| 🔐 Sign-in & accounts | Email + password, **Google Sign-In**, email verification, **forgot / reset password** |
=======
<details>
<summary><b>🏪 Merchant App</b></summary>
<br/>
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

- 🔒 **Invite-only signup** — request access → owner approves → onboard
- 🤖 AI offer generation from uploaded business files
- 📌 Exact address + interactive map pin selection
- 💸 Published offer cards with actual vs. discounted prices
- 📋 Coupon claims dashboard (name, email, coupon code, redeem action)
- 📈 Offer analytics dashboard
- 📧 Budget-fit email notifications to matched customers

</details>

<details>
<summary><b>🧠 AI & Intelligence</b></summary>
<br/>

<<<<<<< HEAD
- **Groq** — Merges spreadsheet rollups, Tavily, and weather into structured offer synthesis; configure `GROQ_API_KEY` (falls back to Tavily + heuristics if unset).
- 🌐 **Tavily API** — Real-time contextual web insights
- 🌤️ **Weather-aware reasoning** — Offers shift based on conditions
- 🔮 **Offer impact simulation** — Budget effect previewed before shown
- 💬 **Personalized explanations** — AI tells you *why* a deal is right for you

---

## 🗂️ Project Structure

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
│       └── pages/          # Auth, verify-email, forgot/reset password, merchant-apply, customer & merchant UIs
├── vercel.json             # Vercel deployment config
└── VERCEL_DEPLOYMENT.md    # Deployment notes
```
=======
- 🔍 **Tavily** — live web search for city & category context
- ⚡ **Groq** — synthesizes spreadsheets + Tavily + weather into structured JSON
- 📊 **Spreadsheet Analytics** — XLSX parsing with revenue, margin & inventory rollups
- 🌦️ Weather-aware offer reasoning
- 💡 Adaptive Budget Intelligence Engine
- 🚦 Financial state detection: `overspending` · `at_risk` · `balanced` · `under_budget`
- 🔮 Offer impact simulation before recommendation

</details>
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

---

## 🛠️ Tech Stack

### 🎨 Frontend

<<<<<<< HEAD
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=react-router&logoColor=white)
![Google Sign-In](https://img.shields.io/badge/Google_Sign_In-4285F4?style=flat-square&logo=google&logoColor=white)
=======
| Tech | Purpose |
|---|---|
| ⚛️ React + TypeScript | UI framework with type safety |
| ⚡ Vite | Lightning-fast build tool |
| 🎨 Tailwind CSS | Utility-first styling |
| 🔀 React Router | Client-side routing |
| 🧩 Shadcn-style components | Consistent UI system |
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

### ⚙️ Backend

<<<<<<< HEAD
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logoColor=white)
![Nodemailer](https://img.shields.io/badge/Nodemailer-22B573?style=flat-square&logoColor=white)
![bcrypt](https://img.shields.io/badge/bcrypt-00599C?style=flat-square&logoColor=white)
![google-auth-library](https://img.shields.io/badge/google--auth--library-4285F4?style=flat-square&logo=google&logoColor=white)
=======
| Tech | Purpose |
|---|---|
| 🟢 Node.js + Express | API server & runtime |
| 🍃 MongoDB + Mongoose | Database & ODM |
| 🤖 Groq API | AI offer synthesis |
| 🔍 Tavily API | Live web search & context |
| 📊 XLSX + Multer | File parsing & uploads |
| 📧 Nodemailer | Email workflows |
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

### ☁️ Deployment

<<<<<<< HEAD
![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square&logoColor=white)
![Tavily](https://img.shields.io/badge/Tavily_AI-FF6B35?style=flat-square&logoColor=white)
![Geoapify](https://img.shields.io/badge/Geoapify-1A73E8?style=flat-square&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-4EA94B?style=flat-square&logo=mongodb&logoColor=white)
=======
| Tech | Purpose |
|---|---|
| ▲ Vercel | Frontend + serverless API |
| 🌍 MongoDB Atlas | Cloud database |
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

---

## 📁 Project Structure

<<<<<<< HEAD
From the **repository root** (`Localyse/`), the app lives under `Hackathon/`.

### 1. Clone the repo

```bash
git clone https://github.com/your-username/Localyse.git
cd Localyse
=======
```
Hackathon/
├── 📁 api/                    # Vercel serverless Express adapter
├── 📁 backend/                # Express API, models, controllers, services
│   ├── 📁 config/
│   ├── 📁 controllers/
│   ├── 📁 middleware/
│   ├── 📁 models/
│   ├── 📁 routes/
│   ├── 📁 services/
│   └── 📁 utils/
├── 📁 frontend/               # React + Vite customer & merchant apps
│   └── 📁 src/
│       ├── 📁 components/
│       ├── 📁 lib/
│       └── 📁 pages/
├── 📄 vercel.json             # Vercel deployment config
└── 📄 VERCEL_DEPLOYMENT.md   # Deployment notes
```

---

## 🚀 Local Setup

### 1️⃣ Clone and install

```bash
git clone https://github.com/your-username/localyse.git
cd localyse

npm --prefix backend install
npm --prefix frontend install
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e
```

### 2️⃣ Set up environment variables

```bash
cp Hackathon/backend/.env.example Hackathon/backend/.env
cp Hackathon/frontend/.env.example Hackathon/frontend/.env
```

<<<<<<< HEAD
**Backend (`Hackathon/backend/.env`)** — see `backend/.env.example` for the full list. Commonly used:
=======
#### Backend `.env`
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your-mongodb-atlas-uri
TAVILY_API_KEY=your-tavily-api-key
<<<<<<< HEAD
GROQ_API_KEY=your-groq-api-key
CORS_ORIGIN=http://localhost:8080

# Google Sign-In (must match the frontend)
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# Links in emails (reset password, verify email, merchant approval mail)
FRONTEND_URL=http://localhost:8080
# Public API base URL (merchant approval links in email; set in production)
# API_PUBLIC_URL=https://your-api-host.com

SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=Localyse <your-smtp-user>

# Merchant invite / approval
MERCHANT_ADMIN_EMAIL=you@example.com
MERCHANT_ADMIN_KEY=long-random-secret
# MERCHANT_APPROVAL_BYPASS=true   # dev only; omit in production
```

**Frontend (`Hackathon/frontend/.env`)**
=======
GROQ_API_KEY=your-groq-api-key         # optional but recommended
CORS_ORIGIN=http://localhost:8080
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
FRONTEND_URL=http://localhost:8080
SMTP_HOST=your-smtp-host
MERCHANT_ADMIN_EMAIL=you@example.com
MERCHANT_ADMIN_KEY=change-me
```

#### Frontend `.env`
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

```env
VITE_API_URL=http://localhost:5000
VITE_GEOAPIFY_API_KEY=your-geoapify-api-key
<<<<<<< HEAD
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
=======
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e
```

### 3️⃣ Start the servers

```bash
<<<<<<< HEAD
npm --prefix Hackathon/backend install
npm --prefix Hackathon/frontend install
```

### 4. Run locally

```bash
# Terminal 1 — Backend
npm --prefix Hackathon/backend run dev

# Terminal 2 — Frontend
npm --prefix Hackathon/frontend run dev
=======
# Terminal 1 — backend
npm --prefix backend run dev

# Terminal 2 — frontend
npm --prefix frontend run dev
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e
```

### 4️⃣ Open in browser

| URL | Purpose |
|---|---|
<<<<<<< HEAD
| 🌐 App | `http://localhost:8080` (or the port Vite prints) |
| 🩺 Health Check | `http://localhost:5000/api/health` |
=======
| `http://localhost:8080` | 🌐 Frontend app |
| `http://localhost:5000/api/health` | 💚 Backend health check |
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

---

## ☁️ Vercel Deployment

```bash
# Quick check before pushing
npm run check
```

1. 📤 Push to GitHub
2. 🔗 Import repo in [Vercel](https://vercel.com)
3. 📂 Use project root as root directory
4. 🔑 Add all environment variables in Vercel Project Settings
5. 🚀 Deploy!

After deploy, verify:

**Merchants (new, production-style)**

```
<<<<<<< HEAD
Request merchant access → Owner approves (email link or admin API) →
Sign up (email+password or Google) → Verify email if needed →
Upload business files & publish AI offers
```

**Commerce loop**

```
Merchant uploads sales / inventory / margin files
        ↓
AI generates a business-safe, margin-aware offer
        ↓
Customers see personalized, budget-filtered offers
        ↓
Customer claims → receives pastel coupon via email
        ↓
Merchant redeems at counter
        ↓
Customer wallet auto-updates budget category
=======
✅ https://your-project.vercel.app
✅ https://your-project.vercel.app/api/health
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e
```

**Accounts**

- **Customers & merchants** can use **email + password** or **Google** (where configured).
- **Forgot password** sends a time-limited reset link; **email verification** applies to local sign-ups as before.

---

## 🔄 Core User Flows

### 👛 Customer Flow

<<<<<<< HEAD
- ✅ Real MongoDB persistence
- ✅ File-based merchant intelligence (XLSX parsing)
- ✅ Customer wallet & budget tracking
- ✅ Automated email workflows (coupons, verification, password reset, merchant approval)
- ✅ **Google Sign-In** and **invite-only merchant onboarding** with **owner approval**
- ✅ Vercel-ready serverless deployment
- ✅ Live weather & location context
- ✅ **Groq** + **Tavily** for contextual AI
=======
```mermaid
flowchart TD
    A([👤 New Customer]) --> B[📧 Sign up with Email or Google]
    B --> C[✅ Verify email]
    C --> D[💰 Set up Wallet & category budgets]
    D --> E[📍 Browse nearby offers on map]
    E --> F{🎭 Filter by mood,\ncategory, or location}
    F --> G[🧠 AI checks budget fit\n& financial state]
    G -->|✅ Good fit| H[🎟️ Claim the offer]
    G -->|⚠️ Over budget| I[💡 See safer alternatives]
    H --> J[📧 Receive pastel coupon email]
    J --> K[🏪 Visit merchant & show coupon]
    K --> L[📲 Merchant redeems coupon]
    L --> M[💰 Wallet category budget updates]
    M --> N([🔄 Browse more offers])
```

### 🏪 Merchant Flow

```mermaid
flowchart TD
    A([🏪 New Merchant]) --> B[📩 Request access via invite form]
    B --> C[📬 Owner reviews request]
    C -->|✅ Approved| D[📧 Approval email sent]
    C -->|❌ Declined| E([🚫 Access denied])
    D --> F[📝 Sign up with Email or Google]
    F --> G[✅ Verify email & select business category]
    G --> H[📌 Set exact store location on map]
    H --> I[📊 Upload sales, inventory & margin files]
    I --> J[🤖 AI analyzes data + weather + city context]
    J --> K[💡 AI generates smart offer with reasoning]
    K --> L[📣 Offer published to customer feed]
    L --> M[📧 Budget-matched customers notified]
    M --> N[🎟️ Customers claim coupons]
    N --> O[📋 View claims dashboard]
    O --> P[✅ Redeem coupon in app]
    P --> Q[📈 Analytics dashboard updates]
    Q --> N
```
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

---

## 🏆 Hackathon Highlights

<div align="center">

<<<<<<< HEAD
Made with ❤️ by **[shamaiem10](https://github.com/shamaiem10)** & **[Kiranwaqar](https://github.com/Kiranwaqar)**

*HackNation 5th Hackathon · Localyse · 2026*
=======
| 🎯 | Highlight |
|---|---|
| 🤖 | Full-stack AI commerce with Groq + Tavily integration |
| 🗄️ | Real database persistence via MongoDB Atlas |
| 📊 | File-based merchant intelligence (XLSX parsing) |
| 💌 | Complete email workflows (verify, coupon, approval) |
| ☁️ | Vercel-ready serverless deployment from day one |
| 💰 | First-of-its-kind budget-aware offer recommendation engine |

</div>

<div align="center">

## 👩‍💻 Creators

<div align="center">

| | Creator |
|---|---|
| 💜 | [@shamaiem10](https://github.com/shamaiem10) |
| 💜 | Kiran |

</div>



**Built with 💜 for HackNation 5th Hackathon**

[![Made with Love](https://img.shields.io/badge/Made_with-💜_Love-ff6b9d?style=for-the-badge&labelColor=1a1a2e)](https://github.com)
[![Hackathon](https://img.shields.io/badge/HackNtion-5th_Edition-00d4aa?style=for-the-badge&labelColor=1a1a2e)](https://github.com)

*Localyse — because a good deal should also be a smart one.*
>>>>>>> 149ce3420359b1dffcbb9136eed51208b150294e

</div>
