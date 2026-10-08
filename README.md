# CareQueue - Hospital Queue Management System

A digital Outpatient Department (OPD) appointment scheduling and sequential live queue tracking application developed for hospital clinics. Built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth & Realtime)**.

Designed to be opened and run directly from **VS Code** with standard `npm` commands.

---

## 🌟 Key Highlights

- **Zero Fake Data Initially**: Starts with strictly 0 records across all dashboards (`Total Patients: 0`, `Total Doctors: 0`, `Waiting: 0`) and clean empty states with direct action triggers.
- **Strict Sequential Tokens**: Automatically dispenses non-repeating, ordered tokens (`#1`, `#2`, `#3`, ...) per doctor per date.
- **Three Dedicated Portals**:
  - **Admin / Receptionist Portal**: Real statistics, departments management, doctors directory, patient database, appointment scheduler, and hospital live queue board.
  - **Doctor OPD Portal**: Active patient console, one-click **Call Next**, **Start Consultation**, **Complete**, and **Skip** actions, and categorized queue tabs.
  - **Patient Portal**: Step-by-step booking wizard, sequential token generation, real-time token tracking (Current Token Serving, Patients Ahead, Status), and consultation history.
- **AI Smart Triage & Doctor Recommender**: Patients can describe their symptoms in natural language. Powered by Google Gemini AI with a comprehensive local triage fallback, the system assesses urgency (Routine, Priority, Emergency), automatically suggests the right medical department and doctor, generates clinical chief complaints, and pre-fills the booking.
- **24/7 AI Hospital Concierge / Chatbot**: Floating CareQueue AI assistant answers live queue questions, tells patients how many people are ahead of their token, gives hospital timings, emergency contact details, and department recommendations.
- **Dual Mode Resilience**: Operates instantly in local storage persistence mode if Supabase keys have not yet been provided, and automatically hooks into cloud Supabase PostgreSQL as soon as credentials are added to `.env`.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool & Dev Server** | Vite 5 |
| **Styling & Design System** | Tailwind CSS + Modern Healthcare Palette |
| **Icons** | Lucide React |
| **Routing** | React Router v6 (Role-Protected Routes) |
| **Database & Auth** | Supabase (PostgreSQL, Row Level Security, Realtime) |

---

## 🚀 Quick Start in VS Code

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20+)
- [VS Code](https://code.visualstudio.com/)

### 1. Open in VS Code
Open the project directory in VS Code:
```bash
cd mini
code .
```

### 2. Install Dependencies
Open a terminal in VS Code (`Ctrl + ~` or Terminal -> New Terminal):
```bash
npm install
```
*(On Windows PowerShell, use `npm.cmd install` if execution policy restricts scripts).*

### 3. Start Local Development Server
```bash
npm run dev
```
*(Or `npm.cmd run dev`)*.

The application will start at:
```
http://localhost:5173
```

---

## 🗄️ Supabase Setup Instructions

The application is fully configured to work with Supabase PostgreSQL and Realtime:

1. Create a free account and new project at [supabase.com](https://supabase.com).
2. In your Supabase project dashboard, open the **SQL Editor** in the left sidebar.
3. Open the [`supabase_schema.sql`](file:///c:/Users/SHEIK/Downloads/mini/supabase_schema.sql) file located in this project root.
4. Copy the entire content of `supabase_schema.sql`, paste it into the Supabase SQL Editor, and click **Run**.
   - This creates all 6 tables: `profiles`, `departments`, `doctors`, `patients`, `appointments`, and `queue_entries`.
   - It sets up the atomic sequential token generator function `get_next_token`.
   - It enables Row Level Security (RLS) and real-time publications.
5. In Supabase, go to **Project Settings &rarr; API**.
6. Copy your **Project URL** and **anon public Key**.
7. In your project's `.env` file, replace the placeholders:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```
8. Save `.env` and restart your Vite server (`npm run dev`).

---

## 🔑 User Roles & Portal Access

| Role | Access URL | Capabilities |
| :--- | :--- | :--- |
| **Admin / Receptionist** | `/admin` | Manage departments, doctors, patients, appointments, and live TV queue board. |
| **Doctor** | `/doctor` | View today's queue, call next patient, start consultation, complete, and skip. |
| **Patient** | `/patient` | Register, book appointment, receive token, track live wait position and history. |

### Quick Role Testing
On the `/login` page, you can use the role-selector tabs or one-click role test buttons to explore all three dashboards.

---

## 📁 Project Structure

```
mini/
├── public/
├── src/
│   ├── components/
│   │   └── common/           # StatCard, EmptyState, Modal, StatusBadge, LoadingSpinner
│   ├── contexts/
│   │   └── AuthContext.tsx   # Session management and role-based permissions
│   ├── layouts/
│   │   └── DashboardLayout.tsx # Responsive sidebar, mobile drawer, top navigation
│   ├── lib/
│   │   └── supabase.ts       # Supabase client and connection diagnostics
│   ├── pages/
│   │   ├── LandingPage.tsx   # Hospital landing page (Hero, About, Services, Hours)
│   │   ├── auth/             # LoginPage and RegisterPage
│   │   ├── admin/            # AdminDashboard, Departments, Doctors, Patients, Appts, Queue
│   │   ├── doctor/           # DoctorDashboard (OPD Console), DoctorAppointmentsPage
│   │   └── patient/          # PatientDashboard (Token Tracker), BookAppointment, History
│   ├── services/
│   │   ├── hospitalService.ts # CRUD for Depts, Doctors, Patients, Appointments
│   │   ├── queueService.ts   # Sequential token generation and Realtime subscriptions
│   │   └── storageService.ts # Local persistent storage fallback
│   ├── types/
│   │   └── database.ts       # TypeScript schemas and status enums
│   ├── App.tsx               # Route declarations and ProtectedRoute guards
│   ├── main.tsx              # Application entry point
│   └── index.css             # Tailwind base, components, and animations
├── index.html
├── package.json
├── supabase_schema.sql       # PostgreSQL database schema script
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── PROJECT_DOCUMENTATION.md  # Standard mini-project academic report
└── TESTING.md                # Comprehensive test cases and verification checklist
```

---

## 📦 Production Build Verification

To create an optimized production build:
```bash
npm run build
```
To preview the production bundle locally:
```bash
npm run preview
```
