# 🌾 Ghalla Mandi ERP — Multi-Tenant Cloud ERP

Production-ready, multi-tenant SaaS ERP tailored for commodity traders, grain markets (غلہ منڈی), wholesalers, and commission agents (آڑھتی).

---

## 🚀 Tech Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express.js (Vercel Serverless Functions)
- **Database**: [Neon Postgres](https://neon.tech) (Cloud Serverless PostgreSQL)
- **Authentication**: JWT (JSON Web Tokens) with 7-day expiry + bcrypt password hashing
- **Deployment**: [Vercel](https://vercel.com) (Full-Stack single deployment)

```
                       ┌────────────────────────┐
                       │   React SPA (Vite)     │
                       │ (Vercel Static Hosting)│
                       └───────────┬────────────┘
                                   │ /api/*
                                   ▼
                       ┌────────────────────────┐
                       │  Express API Server    │
                       │ (Vercel Serverless)    │
                       └───────────┬────────────┘
                                   │ pg connection
                                   ▼
                       ┌────────────────────────┐
                       │   Neon Cloud Postgres  │
                       │  (Serverless Database) │
                       └────────────────────────┘
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18 or higher
- **PostgreSQL Database**: Free cloud database from [neon.tech](https://neon.tech) (or local Postgres)

### 2. Configure Environment Variables
In `backend/.env`:
```env
PORT=5000
DATABASE_URL=postgres://neondb_owner:YOUR_PASSWORD@ep-YOUR-ENDPOINT.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Install & Run
In one terminal (Backend):
```bash
cd backend
npm install
npm run dev
```

In second terminal (Frontend):
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## ☁️ Deployment Guide (Vercel & GitHub)

### Step 1: Create Neon Database (Free)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project: `ghalla-mandi`
3. Copy your connection string (`DATABASE_URL`) from the Neon dashboard.

### Step 2: Push Project to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Ghalla Mandi Full-Stack ERP"
git branch -M main
git remote add origin https://github.com/lets-abdullah/Ghalla-Mandi.git
git push -u origin main
```

### Step 3: Deploy to Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New Project"**
2. Import your GitHub repository: `lets-abdullah/Ghalla-Mandi`
3. Configure the Project:
   - **Framework Preset**: `Other` (or auto-detected Vite)
   - **Root Directory**: `./` (leave default root)
4. Add **Environment Variables** in Vercel project settings:
   | Variable | Value | Description |
   |---|---|---|
   | `DATABASE_URL` | `postgres://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` | Your Neon Postgres connection string |
   | `JWT_SECRET` | `your_secure_random_string_here` | Secret key for signing JWT tokens |
   | `NODE_ENV` | `production` | Production mode |
   | `FRONTEND_URL` | `https://your-project.vercel.app` | Your Vercel domain |
5. Click **Deploy**!

---

## 🔑 Key ERP Features

- **Multi-Tenant Shop Isolation**: Every shop owner has an isolated workspace and data scope.
- **High-Speed Counter POS**: Instant billing, barcode scanner input, auto price computation, quick cash settlement, and receipt generation.
- **Commodity & Stock Management**: Real-time stock audit, min-stock alerts, kg/mann/bori conversions, and inward arrivals.
- **Khata Ledger (کھاتہ)**: Customer receivables, supplier payables, partial payments, running balance statements, and payment logging.
- **P&L Reporting & Analytics**: Real-time gross profit calculations, sales vs purchases trend comparison, and exportable data.

---

## 📄 License
© 2026 Ghalla Mandi ERP. All rights reserved.
