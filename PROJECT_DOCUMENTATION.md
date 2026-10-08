#  Hospital Queue Management System
## College Mini-Project Technical Documentation

---

## 1. Introduction
Healthcare institutions and outpatient clinics frequently face bottlenecks in managing patient queues. The **CareQueue Hospital Queue Management System** is a responsive digital platform that automates appointment scheduling, dispenses strictly sequential queue token numbers, and provides real-time queue position tracking for patients, consultation consoles for medical doctors, and centralized administrative controls for hospital management.

---

## 2. Problem Statement
In traditional hospital Outpatient Departments (OPD):
1. **Physical Overcrowding**: Patients are forced to wait physically in congested waiting rooms without visibility of when they will be called.
2. **Arbitrary Queues & Confusion**: Without an automated, sequential token dispensing system, patients experience disputes over who arrived first.
3. **Doctor Inefficiencies**: Doctors lack a streamlined dashboard to call the next patient, view who is waiting, or mark absent/skipped patients.
4. **Administrative Blind Spots**: Hospital receptionists and administrative staff lack real-time visibility into OPD bottlenecks, patient loads, and doctor availability.

---

## 3. Objectives
- **Digital Token Generation**: Generate non-repeating, sequential token numbers (`#1`, `#2`, `#3`, ...) grouped by doctor and consultation date.
- **Real-Time Patient Tracker**: Enable patients to track from their devices:
  - Their assigned token number.
  - The current token currently being served by their doctor.
  - Exact count of patients waiting ahead of them.
  - Live status transitions (`Waiting`, `Called - Please Enter Room`, `In Progress`, `Completed`).
- **Doctor Consultation Station**: Equip doctors with one-click OPD controls (`Call Next`, `Start Consultation`, `Complete`, `Skip`).
- **Hospital Administration**: Enable hospital staff to configure clinical departments, onboard doctors, view patient directories, schedule walk-in consultations, and monitor the entire hospital waiting board in real time.
- **Zero Pre-loaded Dummy Data**: Provide an authentic empty baseline (`0 Patients`, `0 Doctors`, `0 Waiting`) that dynamically populates via user activity.

---

## 4. Existing System vs. Proposed System

| Parameter | Existing System (Manual / Paper-Based) | Proposed System (CareQueue) |
| :--- | :--- | :--- |
| **Token Numbering** | Paper slips or verbal announcements | Automated sequential digital tokens |
| **Queue Visibility** | Patients have no idea how many people are ahead | Real-time "Current Token" and "Patients Ahead" display |
| **Doctor Workflow** | Manual calling, shouting names in hallways | One-click digital console (`Call Next`, `Start`, `Complete`) |
| **Patient Waiting** | Confined to crowded physical rooms | Patients can track progress dynamically |
| **Record Keeping** | Paper logbooks prone to loss | Relational PostgreSQL database with audit timestamps |
| **Data Integrity** | Duplicates and gaps common | Atomic sequential database transactions |

---

## 5. System Features
1. **Public Landing Page**: Institutional branding, hero section, OPD clinic hours, contact details, and authentication gateways.
2. **Role-Based Authentication**: Secure access for Administrators, Doctors, and Registered Patients with automated routing guards.
3. **Sequential Token Generator**: Computes the maximum token allocated for a specific doctor on a given date and increments by 1 atomically.
4. **Live Token Display**: Real-time websocket synchronization via Supabase Realtime when doctor advances queue.
5. **Department & Doctor Management**: Administrative CRUD operations with department assignments, specialization, and availability toggles.
6. **Patient Booking Wizard**: 4-step wizard (Department &rarr; Doctor &rarr; Date & Time &rarr; Instant Confirmation) with custom mobile alert preferences.
7. **Waiting Room Monitor**: Live TV board displaying active doctor stations and current token numbers.
8. **Automated SMS & WhatsApp Alerts**: Real-time proximity notifications triggered when a patient is exactly 3 positions away in the OPD queue, instant booking passes, urgent consultation call notices, interactive mobile simulator, and direct WhatsApp Web link integration.

---

## 6. User Roles & Permissions

### 6.1 Administrator / Receptionist
- View global hospital dashboard with real-time statistics.
- Create, update, and remove clinical departments.
- Register and onboard doctors with department linkage.
- Access patient directory and view patient demographics.
- Schedule and cancel patient appointments.
- Monitor live hospital queue display across all doctor chambers.

### 6.2 Doctor
- Access dedicated doctor OPD consultation portal.
- View today's queue categorized into **Waiting**, **Completed**, and **Skipped**.
- Inspect active patient information (name, contact, gender, appointment slot).
- Advance queue using **Call Next**, **Start Consultation**, **Complete**, or **Skip** actions.
- Review past consultation history.

### 6.3 Patient
- Register a secure patient account with contact details and date of birth.
- Select department, doctor, date, and preferred time slot.
- Receive a guaranteed sequential token number upon confirmation.
- Track live token progress from the patient dashboard.
- Access complete personal appointment history.

---

## 7. System Architecture

```
+-------------------------------------------------------------------+
|                        Client Layer (Browser)                     |
|                                                                   |
|   [Landing Page]    [Admin Portal]   [Doctor Console]   [Patient] |
|              \             |              |            /          |
|               \            |              |           /           |
|                +-------------------------------------+            |
|                |   React Router Protected Guards     |            |
|                +-------------------------------------+            |
+-----------------------------------|-------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------+
|                   Application Logic & State Layer                 |
|                                                                   |
|   [AuthContext]   [hospitalService]   [queueService]   [localDB]  |
|                                                                   |
+-----------------------------------|-------------------------------+
                                    |
                     +--------------+--------------+
                     |                             |
                     v                             v
+-----------------------------------+  +----------------------------+
|        Supabase Cloud Backend     |  |   Local Fallback Engine    |
|                                   |  |                            |
|  - PostgreSQL Database            |  |  - HTML5 Storage           |
|  - Supabase Auth Service          |  |  - Event Dispatcher        |
|  - Row Level Security (RLS)       |  |  - Zero Initial State      |
|  - Realtime Websocket Channels    |  |  - Token Sequences         |
+-----------------------------------+  +----------------------------+
```

---

## 8. Database Design (PostgreSQL Schema)

### 8.1 Entity Relationship (ER) Summary
- **profiles**: Base user table linked to authentication users.
- **departments**: Hospital clinical divisions (1-to-many with doctors).
- **doctors**: Medical staff with specializations and department links (1-to-many with appointments and queue entries).
- **patients**: Registered individuals receiving care (1-to-many with appointments and queue entries).
- **appointments**: Booked consultation dates and times between a patient and a doctor.
- **queue_entries**: OPD tokens allocated per appointment with sequential numbering and lifecycle status.

### 8.2 Tables Specification

#### Table: `profiles`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users | Unique profile ID |
| `full_name` | TEXT | NOT NULL | Full name of user |
| `email` | TEXT | NOT NULL | User email address |
| `phone` | TEXT | NULL | Contact phone number |
| `role` | TEXT | NOT NULL, CHECK in ('admin','doctor','patient') | Access role |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Registration timestamp |

#### Table: `departments`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Department ID |
| `name` | TEXT | UNIQUE, NOT NULL | Department name |
| `description` | TEXT | NULL | Scope & clinical details |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

#### Table: `doctors`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Doctor ID |
| `profile_id` | UUID | REFERENCES profiles(id) ON DELETE CASCADE | Associated user profile |
| `department_id` | UUID | REFERENCES departments(id) ON DELETE SET NULL | Clinical department |
| `specialization`| TEXT | NOT NULL | Clinical specialty |
| `availability` | TEXT | DEFAULT 'Available' | Current availability |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Record creation date |

#### Table: `patients`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Patient ID |
| `profile_id` | UUID | REFERENCES profiles(id) ON DELETE CASCADE | Associated user profile |
| `date_of_birth` | DATE | NULL | Date of birth |
| `gender` | TEXT | NULL | Patient gender |
| `phone` | TEXT | NULL | Contact phone |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Record creation date |

#### Table: `appointments`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Appointment ID |
| `patient_id` | UUID | REFERENCES patients(id) ON DELETE CASCADE | Patient record |
| `doctor_id` | UUID | REFERENCES doctors(id) ON DELETE CASCADE | Doctor record |
| `appointment_date`| DATE | NOT NULL | Scheduled date |
| `appointment_time`| TIME | NOT NULL | Scheduled time slot |
| `status` | TEXT | CHECK in ('booked','completed','cancelled') | Status |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Booking timestamp |

#### Table: `queue_entries`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Queue entry ID |
| `appointment_id`| UUID | REFERENCES appointments(id) ON DELETE CASCADE | Linked appointment |
| `doctor_id` | UUID | REFERENCES doctors(id) ON DELETE CASCADE | Doctor station |
| `patient_id` | UUID | REFERENCES patients(id) ON DELETE CASCADE | Patient in queue |
| `queue_date` | DATE | NOT NULL | Queue date |
| `token_number` | INTEGER | NOT NULL | Strictly sequential token |
| `status` | TEXT | CHECK in ('booked','waiting','called','in_progress','completed','skipped','cancelled') | Live status |
| `called_at` | TIMESTAMPTZ | NULL | Timestamp when called |
| `completed_at` | TIMESTAMPTZ | NULL | Timestamp when completed |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Entry creation date |

*Constraint*: `UNIQUE(doctor_id, queue_date, token_number)` guarantees no duplicate tokens for the same doctor on the same day.

---

## 9. Modular Breakdown
- **Authentication Module**: Manages logins, patient registrations, session persistence, and role guards.
- **Department & Doctor Management Module**: CRUD interfaces for administering clinical specialties and assigning doctors.
- **Patient Booking Module**: Dynamic wizard enabling department filtering, doctor selection, slot booking, and sequential token generation.
- **Doctor Consultation Station**: Real-time patient queuing, sequential status transitions, and patient history review.
- **Queue Synchronization Module**: Supabase Realtime channel subscriptions ensuring instantaneous screen updates without page reloads.
- **Reporting & Monitoring Module**: Aggregates live outpatient counts, waiting times, and consultation completion rates.

---

## 10. Future Enhancements & Changelog
1. **SMS & WhatsApp Alerts** *(Status: Implemented & Active)*:
   - Automated proximity alerts dispatched via SMS & WhatsApp when patient token is 3 positions away.
   - Immediate booking confirmation passes dispatched upon appointment scheduling.
   - Urgent "Token Called" notifications dispatched when doctor calls the next token.
   - In-app interactive mobile phone preview simulator (iPhone/Android SMS & WhatsApp threads).
   - Direct click-to-chat WhatsApp Web/App launcher (`wa.me`).
   - Global notification drawer, unread counters, audio chime, and customizable patient phone preferences.
2. **Multi-Counter Calling Displays**: Audio chime announcements with text-to-speech synthesized token calls ("Token 12, please proceed to Room 4").
3. **Emergency Triage Priority**: Option for emergency triage cases to be fast-tracked ahead of routine OPD queue slots.
4. **Doctor Teleconsultation Integration**: Integrated WebRTC video room links for remote OPD consultations.

