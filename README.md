<div align="center">

<img src="https://img.shields.io/badge/HackNation-5th%20Hackathon-FF6B6B?style=for-the-badge&logoColor=white" alt="HackNation 5th Hackathon"/>

# 🏙️ Localyse

### *The AI-powered city wallet that makes every deal personal*

> "Is this deal right for **this person**, in **this place**, at **this time**, with **this budget**?"

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 👥 Team

<div align="center">

Built with 💙 by


| **[shamaiem10](https://github.com/shamaiem10)** | **[Kiranwaqar](https://github.com/Kiranwaqar)** |

</div>

---

## 🧠 What is Localyse?

Localyse is a **finance-aware city commerce platform** that bridges the gap between local merchants and smart customers. Unlike generic coupon apps, Localyse factors in your real budget, location, mood, and spending habits — then tells you whether a deal actually makes sense *for you*.

Most offer apps ask: *"Is this deal attractive?"*

**Localyse asks something better.**

---

## ✨ Features at a Glance

### 🛍️ For Customers

| Feature | Description |
|---|---|
| 📍 Live Offer Feed | Personalized offers based on your location & time |
| 🗺️ Nearby Map | Filter offers by distance on an interactive map |
| 😊 Mood-Based Picks | "For You" recommendations tuned to how you feel |
| 💰 Personal Wallet | Set USD budgets per spending category |
| 📊 Budget Tracker | See exactly how much you have left before you spend |
| 🎟️ Smart Coupons | Claim, receive via email, and redeem at the store |
| 🔁 Redemption History | Track every deal you've used |

### 🏪 For Merchants

| Feature | Description |
|---|---|
| 🤖 AI Offer Generator | Upload your sales/inventory files — AI does the rest |
| 📌 Geo-Pinning | Set your exact store location on a map |
| 💳 Offer Cards | Show actual price vs. after-offer price clearly |
| 👤 Coupon Claims Page | View customer name, email, coupon code & redeem |
| 📈 Analytics Dashboard | Track offer performance in real-time |
| 📧 Budget-Fit Emails | Notify customers when a new offer fits their wallet |

---

## 🔬 AI & Intelligence Engine

```
📦 Adaptive Budget Intelligence Engine
├── 🔴 overspending     → Suppress high-cost offers
├── 🟡 at_risk          → Warn before recommending
├── 🟢 balanced         → Standard recommendations
└── 🔵 under_budget     → Highlight best-value deals
```

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

---

## 🛠️ Tech Stack

**Frontend**

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=react-router&logoColor=white)

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=flat-square&logoColor=white)
![Nodemailer](https://img.shields.io/badge/Nodemailer-22B573?style=flat-square&logoColor=white)

**APIs & Services**

![Tavily](https://img.shields.io/badge/Tavily_AI-FF6B35?style=flat-square&logoColor=white)
![Geoapify](https://img.shields.io/badge/Geoapify-1A73E8?style=flat-square&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-4EA94B?style=flat-square&logo=mongodb&logoColor=white)

---

## ⚙️ Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/localyse.git
cd localyse
```

### 2. Set up environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Backend (`backend/.env`)**

```env
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

**Frontend (`frontend/.env`)**

```env
VITE_API_URL=http://localhost:5000
VITE_GEOAPIFY_API_KEY=your-geoapify-api-key
```

### 3. Install dependencies

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 4. Run locally

```bash
# Terminal 1 — Backend
npm --prefix backend run dev

# Terminal 2 — Frontend
npm --prefix frontend run dev
```

### 5. Open in browser

| Service | URL |
|---|---|
| 🌐 App | `http://localhost:8080` |
| 🩺 Health Check | `http://localhost:5000/api/health` |


---

## 🔄 Core User Flow

```
Merchant signs up & selects category
        ↓
Uploads sales / inventory / margin files
        ↓
AI generates a business-safe, margin-aware offer
        ↓
Customers see personalized, budget-filtered offers
        ↓
Customer claims → receives pastel coupon via email
        ↓
Merchant scans & redeems at counter
        ↓
Customer wallet auto-updates budget category
```

---

## 🏆 Hackathon Highlight

Localyse was built end-to-end for **HackNation 5th Hackathon** as a full-stack AI commerce system featuring:

- ✅ Real MongoDB persistence
- ✅ File-based merchant intelligence (XLSX parsing)
- ✅ Customer wallet & budget tracking
- ✅ Automated email coupon workflows
- ✅ Vercel-ready serverless deployment
- ✅ Live weather & location context

---

## 📄 License

This project is built for **hackathon and educational use**.

---

<div align="center">

Made with ❤️ by **[shamaiem10](https://github.com/shamaiem10)** & **[Kiranwaqar](https://github.com/Kiranwaqar)**

*HackNtion 5th Hackathon · Localyse · 2026*

</div>
