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

```
🛍️  Merchants  →  upload business data  →  AI generates smart offers
👛  Customers  →  get budget-aware recs  →  claim & redeem locally
🤖  AI Engine  →  weather + mood + wallet  →  perfect deal at perfect time
```

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

- 🔐 Email + password or Google Sign-In with email verification
- 📍 Nearby offer map with live location filtering
- 🎭 Mood-based **"For You"** personalized recommendations
- 💰 Personal Wallet with USD budgets per category
- 📊 Category-wise budget tracking & spending safety alerts
- 🎟️ Coupon claiming, pastel coupon emails, and redemption history
- 🧠 Smart recommendations based on remaining budget

</details>

<details>
<summary><b>🏪 Merchant App</b></summary>
<br/>

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

- 🔍 **Tavily** — live web search for city & category context
- ⚡ **Groq** — synthesizes spreadsheets + Tavily + weather into structured JSON
- 📊 **Spreadsheet Analytics** — XLSX parsing with revenue, margin & inventory rollups
- 🌦️ Weather-aware offer reasoning
- 💡 Adaptive Budget Intelligence Engine
- 🚦 Financial state detection: `overspending` · `at_risk` · `balanced` · `under_budget`
- 🔮 Offer impact simulation before recommendation

</details>

---

## 🛠️ Tech Stack

### 🎨 Frontend

| Tech | Purpose |
|---|---|
| ⚛️ React + TypeScript | UI framework with type safety |
| ⚡ Vite | Lightning-fast build tool |
| 🎨 Tailwind CSS | Utility-first styling |
| 🔀 React Router | Client-side routing |
| 🧩 Shadcn-style components | Consistent UI system |

### ⚙️ Backend

| Tech | Purpose |
|---|---|
| 🟢 Node.js + Express | API server & runtime |
| 🍃 MongoDB + Mongoose | Database & ODM |
| 🤖 Groq API | AI offer synthesis |
| 🔍 Tavily API | Live web search & context |
| 📊 XLSX + Multer | File parsing & uploads |
| 📧 Nodemailer | Email workflows |

### ☁️ Deployment

| Tech | Purpose |
|---|---|
| ▲ Vercel | Frontend + serverless API |
| 🌍 MongoDB Atlas | Cloud database |

---

## 📁 Project Structure

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
```

### 2️⃣ Set up environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

#### Backend `.env`

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your-mongodb-atlas-uri
TAVILY_API_KEY=your-tavily-api-key
GROQ_API_KEY=your-groq-api-key         # optional but recommended
CORS_ORIGIN=http://localhost:8080
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
FRONTEND_URL=http://localhost:8080
SMTP_HOST=your-smtp-host
MERCHANT_ADMIN_EMAIL=you@example.com
MERCHANT_ADMIN_KEY=change-me
```

#### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000
VITE_GEOAPIFY_API_KEY=your-geoapify-api-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3️⃣ Start the servers

```bash
# Terminal 1 — backend
npm --prefix backend run dev

# Terminal 2 — frontend
npm --prefix frontend run dev
```

### 4️⃣ Open in browser

| URL | Purpose |
|---|---|
| `http://localhost:8080` | 🌐 Frontend app |
| `http://localhost:5000/api/health` | 💚 Backend health check |

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

```
✅ https://your-project.vercel.app
✅ https://your-project.vercel.app/api/health
```

---

## 🔄 Core User Flows

### 👛 Customer Flow

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

---

## 🏆 Hackathon Highlights

<div align="center">

| 🎯 | Highlight |
|---|---|
| 🤖 | Full-stack AI commerce with Groq + Tavily integration |
| 🗄️ | Real database persistence via MongoDB Atlas |
| 📊 | File-based merchant intelligence (XLSX parsing) |
| 💌 | Complete email workflows (verify, coupon, approval) |
| ☁️ | Vercel-ready serverless deployment from day one |
| 💰 | First-of-its-kind budget-aware offer recommendation engine |

</div>
---
<div align="center">

## 👩‍💻 Creators

<div align="center">

| | Creator |
|---|---|
| 💜 | [@shamaiem10](https://github.com/shamaiem10) |
| 💜 | Kiran |

</div>


---

**Built with 💜 for HackNation 5th Hackathon**

[![Made with Love](https://img.shields.io/badge/Made_with-💜_Love-ff6b9d?style=for-the-badge&labelColor=1a1a2e)](https://github.com)
[![Hackathon](https://img.shields.io/badge/HackNtion-5th_Edition-00d4aa?style=for-the-badge&labelColor=1a1a2e)](https://github.com)

*Localyse — because a good deal should also be a smart one.*

</div>
