# Clinic Management System - Full Stack Production Documentation & Deployment Guide

A production-ready, modular, and visually stunning **Clinic Management System** tailored for General Clinics. Built with a Node.js + Express TypeScript backend and a React + TypeScript Vite frontend, storing data in a PostgreSQL database with raw SQL migrations and role-based access control (RBAC).

---

## 📋 Table of Contents
1. [Overview & Features](#-overview--features)
2. [Technical Architecture](#-technical-architecture)
3. [Folder Structure](#-folder-structure)
4. [Prerequisites](#-prerequisites)
5. [Environment Variables Setup](#-environment-variables-setup)
6. [Local Database Migrations & Seeding](#-local-database-migrations--seeding)
7. [Local Running Instructions](#-local-running-instructions)
8. [Default Test Accounts](#-default-test-accounts)
9. [Complete Production Deployment Guide](#-complete-production-deployment-guide)
   - [Option A: Deploying on Render (Backend + Database) & Vercel (Frontend)](#option-a-render--vercel-cloud-deployment)
   - [Option B: Deploying on a Single VPS (Ubuntu + Nginx + PM2 + PostgreSQL)](#option-b-single-vps-ubuntu--nginx--pm2--postgresql)
10. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## ✨ Overview & Features

### Core Modules:
- **Authentication & RBAC**: JWT-based authentication with role-based permissions (`Admin`, `Doctor`, `Receptionist`).
- **User Management**: Add and manage staff accounts with instant activation/deactivation.
- **Patient Management**: Register patients, track contact info, blood group, medical history, CNIC encryption, and assigned doctor.
- **Appointments System**: Book, reschedule, cancel, or complete patient consultations with date filters and status badges.
- **Visit History & Vitals Timeline**: Record chief complaints, diagnoses, vitals (BP, weight, temp), follow-up dates, and consult sheets.
- **Medical Prescriptions**: Add medications, dosages, frequency, duration, and print clinical prescription slips.
- **Financial Billing & Payments**: Create itemized invoices, record cash/card payments, track balance due, and print **Single-Page Executive Invoices**.
- **Medical Documents & Image Gallery**: Upload and preview X-rays, lab reports, and scans.
- **Compliance & Audit Logs**: HIPAA/GDPR consent management and full system audit logging.

---

## 🛠 Technical Architecture

- **Frontend**: React (v19) + TypeScript + Vite + Vanilla CSS (Glassmorphism theme, dynamic light/dark modes, `@media print` single A4 page invoice isolation).
- **Backend**: Node.js + Express + TypeScript + `pg` (node-postgres connection pool) + `bcryptjs` + `jsonwebtoken` + `multer`.
- **Database**: PostgreSQL (Raw SQL migration scripts with auto-database creation capabilities).

---

## 📁 Folder Structure

```
clinic-management-system/
├── backend/
│   ├── src/
│   │   ├── config/          # DB config & PostgreSQL pool initialization
│   │   ├── controllers/     # Controller business logic (Auth, Users, Patients, Bills, Visits)
│   │   ├── db/              # SQL Migrations & complete seed scripts
│   │   ├── middleware/      # Auth JWT & Role authorization middleware
│   │   ├── routes/          # Express route definitions (/api/...)
│   │   └── index.ts         # Server entry point (Express app)
│   ├── uploads/             # Patient documents & medical images storage
│   ├── .env.example         # Example backend environment variables
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/      # Shared components (Layout, ProtectedRoute, Navbar, Sidebar)
    │   ├── context/         # AuthContext with apiFetch interceptors
    │   ├── pages/           # Dashboard, UserManagement, PatientList, PatientProfile, BillDetails, etc.
    │   ├── styles/          # Vanilla CSS design system (app.css)
    │   ├── App.tsx          # Client-side routing configuration
    │   └── main.tsx         # React entry point
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

---

## ⚡ Prerequisites

Before running or deploying the project, ensure you have:
1. **Node.js**: `v18.x` or higher
2. **npm**: `v9.x` or higher
3. **PostgreSQL**: `v14.x` or higher (running locally on port `5432` or hosted on Neon/Supabase/Render)

---

## 🔐 Environment Variables Setup

### 1. Backend Environment Variables (`backend/.env`)
Create a `.env` file inside the `backend` folder:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=super-secret-clinic-key-change-in-production
JWT_EXPIRES_IN=24h

# Database Connection (Local or Remote)
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=clinic_db

# Optional: Remote PostgreSQL Connection URL (e.g. Neon, Render, Supabase)
# DATABASE_URL=postgres://user:password@host:5432/clinic_db?sslmode=require
```

### 2. Frontend Environment Variables (`frontend/.env`)
Create a `.env` file inside the `frontend` folder:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```
*(In production, set `VITE_API_BASE_URL` to your live backend URL, e.g., `https://api.yourdomain.com/api`)*

---

## 🗄 Local Database Migrations & Seeding

Navigate to the `backend` directory:
```bash
cd backend
```

### Step 1: Run All Migrations
Run the master migration command. This creates the database `clinic_db` automatically if it doesn't exist, followed by creating all tables, indexes, triggers, and soft-delete features:

```bash
npm run migrate:all
```

### Step 2: Seed Dummy Data
To populate the database with realistic test accounts, patients, visits, prescriptions, bills, and images:

```bash
npm run seed:complete
npm run seed:images
```

---

## 🚀 Local Running Instructions

### 1. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
The API server will run at: `http://localhost:5000`

### 2. Start the Frontend Application
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The React frontend will run at: `http://localhost:5173`

---

## 🔑 Default Test Accounts

Use the **Developer Quick-Access Panel** on the login page, or log in with these credentials:

| Role | Email | Password | Allowed Access |
|---|---|---|---|
| **Admin** | `admin@clinic.com` | `AdminPass123!` | Full system access (Users, Audit Logs, Patients, Billing, Reports) |
| **Doctor** | `doctor@clinic.com` | `DoctorPass123!` | Clinical Workspace (Patients, Visit History, Prescriptions, Images) |
| **Receptionist** | `receptionist@clinic.com` | `ReceptionistPass123!` | Front Desk (Patient Registration, Appointments, Invoices & Cash Receipts) |

---

## 🌍 Complete Production Deployment Guide

---

### Option A: Render + Vercel Cloud Deployment

#### 1. Deploy Database (Neon.tech or Render PostgreSQL)
1. Create a PostgreSQL database on [Neon.tech](https://neon.tech) or [Render.com](https://render.com).
2. Copy the **Connection String** (`postgres://...`).

#### 2. Deploy Backend (Render.com)
1. Log in to [Render.com](https://render.com) -> Click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Set the following details:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js` (or `npm start` after running migrations)
4. Under **Environment Variables**, add:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `your_random_secure_jwt_secret`
   - `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_DATABASE` (or set `DATABASE_URL`)
5. Click **Deploy Web Service**.
6. Once deployed, run migrations on your remote DB by triggering `npx ts-node src/db/migrate.ts` or attaching via Render Shell.

#### 3. Deploy Frontend (Vercel.com)
1. Log in to [Vercel.com](https://vercel.com) -> Click **Add New Project**.
2. Connect your Git repository.
3. Set the following details:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://your-render-backend-url.onrender.com/api`
5. Click **Deploy**.

---

### Option B: Single VPS (Ubuntu + Nginx + PM2 + PostgreSQL)

Use this step-by-step guide to host both backend and frontend on a single VPS (e.g. DigitalOcean, AWS EC2, Linode, Contabo).

#### Step 1: Connect to VPS & Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx git pm2 -y
```

#### Step 2: Configure PostgreSQL Database
```bash
sudo -u postgres psql
```
Inside the `psql` shell:
```sql
CREATE DATABASE clinic_db;
CREATE USER clinic_user WITH PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE clinic_db TO clinic_user;
\q
```

#### Step 3: Clone Repository & Setup Backend
```bash
cd /var/www
git clone https://github.com/your-username/clinic-management-system.git
cd clinic-management-system/backend

# Install dependencies
npm install

# Create production .env file
nano .env
```
Paste environment settings:
```env
PORT=5000
NODE_ENV=production
JWT_SECRET=super_secret_production_key_12345
JWT_EXPIRES_IN=24h

DB_USER=clinic_user
DB_PASSWORD=SecurePassword123!
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=clinic_db
```

#### Step 4: Run Migrations & Build Backend
```bash
npm run migrate:all
npm run seed:complete
npm run build
```

#### Step 5: Start Backend with PM2
```bash
pm2 start dist/index.js --name "clinic-backend"
pm2 save
pm2 startup
```

#### Step 6: Build Frontend
```bash
cd /var/www/clinic-management-system/frontend

# Create production .env file
nano .env
```
Paste frontend environment setting:
```env
VITE_API_BASE_URL=http://your_domain_or_vps_ip/api
```

Build static files:
```bash
npm install
npm run build
```
*(The production build will be located at `/var/www/clinic-management-system/frontend/dist`)*

#### Step 7: Configure Nginx as Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/clinic
```
Paste Nginx site configuration:
```nginx
server {
    listen 80;
    server_name your_domain_or_vps_ip;

    # Frontend Static React App
    location / {
        root /var/www/clinic-management-system/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads Static Assets
    location /uploads/ {
        alias /var/www/clinic-management-system/backend/uploads/;
    }
}
```

Enable site & restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/clinic /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 8: (Optional) SSL Certificate Setup with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your_domain.com
```

---

## ❓ Troubleshooting & FAQs

1. **`relation "departments" does not exist` or column errors**:
   - Run `npm run migrate:all` inside the `backend` directory to ensure all latest database schemas are created.

2. **Frontend cannot connect to Backend (Network Error)**:
   - Verify `VITE_API_BASE_URL` in `frontend/.env` matches your running backend URL (including `/api`).

3. **Single Page Invoice Printing**:
   - When printing invoices from the browser, make sure print margins are set to **Default** or **None**. The system automatically handles `@media print` formatting to guarantee a **1-page A4** output.
