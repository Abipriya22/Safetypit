# ⛏️ SafePit — Mining Safety Platform

> A full-stack mining safety app with real-time SOS alerts, role-based checklists, and multilingual support for underground workers.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?style=flat-square)
![React Native](https://img.shields.io/badge/React_Native-Expo-blue?style=flat-square)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express.js |
| Frontend | React Native (Expo Router v3) |
| Database | MySQL 8.0 |
| Real-time | Socket.IO |
| Auth | JWT + bcryptjs |
| Navigation | Expo Router |
| i18n | Custom translations (5 languages) |

---

## 📋 Prerequisites

Before you begin, make sure the following are installed:

- [Node.js](https://nodejs.org/) ≥ 18.x
- [MySQL](https://www.mysql.com/) ≥ 8.0
- [npm](https://www.npmjs.com/) ≥ 9.x
- [Expo Go](https://expo.dev/go) app on your physical device (optional)
- [Git](https://git-scm.com/)

---

## 📁 Folder Structure
SafePit_Full/
├── backend/                        ← Node.js API Server
│   ├── .env                        ← ✏️ Set your MySQL password here
│   ├── package.json
│   ├── database/
│   │   └── schema.sql              ← All 6 tables
│   └── src/
│       ├── index.js                ← Express + Socket.IO entry
│       ├── config/
│       │   ├── db.js               ← MySQL connection pool
│       │   └── setup.js            ← One-time DB setup script
│       ├── middleware/
│       │   └── auth.js             ← JWT verification
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── checklistController.js
│       │   ├── sosController.js
│       │   ├── reportController.js
│       │   └── contentController.js
│       └── routes/
│           ├── auth.js
│           ├── checklist.js
│           ├── sos.js
│           ├── report.js
│           └── content.js
│
└── frontend/                       ← React Native (Expo Router)
├── i18n/
│   └── translations.ts         ← EN / HI / TA / TE / OD
├── services/
│   └── api.ts                  ← ✏️ Set BASE_URL here
└── app/
├── _layout.tsx             ← Auth guard + navigation
├── index.tsx
├── login.tsx
├── worker.tsx
├── checklist.tsx
├── report.tsx
├── profile.tsx
├── supervisor.tsx
├── supervisor_profile.tsx
├── admin.tsx
└── admin_profile.tsx

---

## 🚀 Installation & Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/SafePit.git
cd SafePit_Full
```

---

### Step 2 — Backend Setup

```bash
cd backend
```

Edit `.env` and set your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=safepit
JWT_SECRET=your_jwt_secret
PORT=5000
```

Install dependencies:

```bash
npm install
```

Create database, tables, and seed data (run only once):

```bash
npm run setup
```

Start the server:

```bash
npm run dev       # Development (auto-restart)
npm start         # Production
```

- Server → `http://localhost:5000`
- Health check → `http://localhost:5000/api/health`

---

### Step 3 — Frontend Setup

```bash
cd ../frontend
```

Install packages:

```bash
npm install
npx expo install @react-native-async-storage/async-storage
```

Edit `services/api.ts` — set your BASE URL:

| Device | BASE URL |
|---|---|
| Android Emulator | `http://10.0.2.2:5000/api` |
| iOS Simulator | `http://localhost:5000/api` |
| Physical Phone | `http://YOUR_PC_IP:5000/api` |

> To find your PC IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

Start the app:

```bash
npx expo start
```

Scan the QR code with Expo Go or press `a` for Android emulator / `i` for iOS simulator.

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Worker | rajesh@safepit.com | abipriya |
| Supervisor | suresh@safepit.com | dharshini |
| Admin | xyz.admin@gmail.com | 1234567 |

> ⚠️ Change these credentials before deploying to production.

---

## ✨ Features

### 🚨 Real-Time SOS Alert
- Red SOS button on the Worker Dashboard
- Confirmation dialog prevents accidental triggers
- Triggers `POST /api/sos` → creates `sos_alert` DB record
- Socket.IO broadcasts alert instantly to supervisor room
- Supervisors see live SOS badge count on Alerts tab
- Supervisors can Acknowledge or Resolve alerts

### ✅ Role-Based Checklist
- Admin uploads tasks with a `role_target` field via Admin panel
- Workers see only tasks assigned to their role
- Workers toggle tasks done/undone (saved to MySQL by date)
- Supervisors see all workers' progress for today
- Animated progress bar shows completion percentage

### 💡 Positive Safety Prompts
- Admin uploads safety tips, DGMS guidelines, and positive statements
- Content stored with language tag
- Random tip shown to worker on each app open
- Delivered in the worker's preferred language

### 🌐 Multilanguage Support
- 5 languages: **English, Hindi, Tamil, Telugu, Odia**
- Language preference saved to MySQL on change
- All UI text uses the `translations.ts` system
- Content (tips, guidelines) fetched in user's preferred language
- Falls back to English if preferred language content is unavailable

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `user` | Workers, supervisors, admins |
| `incident_report` | Hazard reports submitted by workers |
| `checklist` | Role-based tasks uploaded by admin |
| `sos_alert` | Emergency SOS events with status |
| `notification` | Auto-generated on SOS / report events |
| `reports` | Tips, statements, DGMS guidelines |

---

## 🌐 API Endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | All |
| PUT | `/api/auth/language` | All |
| GET | `/api/checklist` | Worker |
| POST | `/api/checklist/:id/complete` | Worker |
| POST | `/api/checklist` | Admin |
| DELETE | `/api/checklist/:id` | Admin |
| GET | `/api/checklist/workers-progress` | Supervisor / Admin |
| POST | `/api/sos` | Worker |
| GET | `/api/sos` | Supervisor / Admin |
| PATCH | `/api/sos/:id/acknowledge` | Supervisor / Admin |
| POST | `/api/reports` | Worker |
| GET | `/api/reports` | All |
| PATCH | `/api/reports/:id/status` | Supervisor / Admin |
| GET | `/api/content` | All |
| POST | `/api/content` | Admin |
| GET | `/api/content/stats` | Supervisor / Admin |
| GET | `/api/content/notifications` | All |

---

## 📜 License

This project is licensed under the **MIT License**.
You are free to use, modify, and distribute this software for personal or commercial purposes.
See the [LICENSE](./LICENSE) file for full terms.

---

## 🙏 Acknowledgements

- [Express.js](https://expressjs.com/) — Backend framework
- [Expo](https://expo.dev/) — React Native toolchain
- [Socket.IO](https://socket.io/) — Real-time communication
- [MySQL2](https://github.com/sidorares/node-mysql2) — Database driver
- [JSON Web Token](https://jwt.io/) — Secure authentication
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — Password hashing
- [DGMS](https://dgms.gov.in/) — Safety guideline reference (Directorate General of Mines Safety, India)

> ⛏️ Built with the goal of improving safety awareness and emergency response for underground mining communities across India.