# CareQueue: Test Cases & Verification Plan

This document outlines the test procedures, scenarios, expected results, and verification checklist for the **CareQueue Hospital Queue Management System**.

---

## 1. Authentication Testing

| Test ID | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Patient Registration | Fill in Full Name, Email, Phone, DOB, Gender, Password (&ge; 6 chars). Click Register. | Account is created, user is logged in, and redirected to `/patient`. | Pass |
| **AUTH-02** | Validation - Password Mismatch | Enter differing Password and Confirm Password. | Registration is blocked with error: *"Passwords do not match."* | Pass |
| **AUTH-03** | Validation - Short Password | Enter password &lt; 6 characters. | Blocked with message: *"Password must be at least 6 characters."* | Pass |
| **AUTH-04** | Role-Based Redirection | Log in with Admin credentials &rarr; should go to `/admin`. Log in with Doctor credentials &rarr; `/doctor`. | Users automatically land on their authorized dashboard. | Pass |
| **AUTH-05** | Unauthorized Route Guard | Attempt navigating directly to `/admin` while logged in as a Patient. | Router intercepts and redirects back to `/patient`. | Pass |
| **AUTH-06** | Logout | Click Logout button in navigation sidebar. | Session is cleared and user is redirected to `/login`. | Pass |

---

## 2. Admin Portal Testing

| Test ID | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **ADM-01** | Empty Dashboard Check | Access `/admin` when no data has been created. | Displays `Total Patients: 0`, `Total Doctors: 0`, `Waiting Patients: 0`, and proper Empty State illustrations. | Pass |
| **ADM-02** | Add Department | Navigate to `/admin/departments`, click *Add Department*, enter "Cardiology" and description, click Save. | Department is saved, card appears in list, and metric updates to 1. | Pass |
| **ADM-03** | Add Doctor | Navigate to `/admin/doctors`, click *Add Doctor*, fill in Name, Email, Department, Specialization, and click Save. | Doctor is created, linked to department, and listed in directory. | Pass |
| **ADM-04** | Search Patients | On `/admin/patients`, enter search term into search input. | Table instantly filters matching patients by name, email, or phone. | Pass |
| **ADM-05** | Live Queue Board | Open `/admin/queue`. | Displays all doctor chambers with live token highlights and waiting counts. | Pass |

---

## 3. Patient Appointment & Queue Testing

| Test ID | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **PAT-01** | Empty Token Tracker | Patient visits `/patient` with no appointments booked. | Shows *"No Active Queue Token Today"* empty state with a *"Book Appointment"* button. | Pass |
| **PAT-02** | Booking Wizard | Navigate to `/patient/book`, select Department &rarr; Doctor &rarr; Date &rarr; Time slot &rarr; Confirm. | Appointment is saved and success screen displays confirmation with sequential **Token #1**. | Pass |
| **PAT-03** | Sequential Token Increment | Another patient books the same doctor on the same date. | Dispenses strictly **Token #2** (no duplicates or random numbers). | Pass |
| **PAT-04** | Live Queue Display | View `/patient` after booking Token #2 when Token #1 is waiting. | Displays `Your Token: #2`, `Patients Ahead: 1`, `Status: Waiting`. | Pass |
| **PAT-05** | Appointment History | Open `/patient/history`. | Displays list of past/upcoming bookings with dates, doctors, and statuses. | Pass |

---

## 4. Doctor OPD Queue Console Testing

| Test ID | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DOC-01** | Empty OPD Queue | Doctor logs in with 0 appointments for today. | Displays *"No waiting patients"* in waiting list tab. | Pass |
| **DOC-02** | Call Next Patient | With Token #1 waiting, doctor clicks *"Call Next Patient"*. | Token #1 changes status to `called`, timestamp is recorded, and Token #1 is highlighted in the console. | Pass |
| **DOC-03** | Start Consultation | Doctor clicks *"Start Consultation"*. | Status updates to `in_progress`. | Pass |
| **DOC-04** | Complete Consultation | Doctor clicks *"Complete Consultation"*. | Status changes to `completed`, moved to *Completed* tab, and appointment marked completed. | Pass |
| **DOC-05** | Skip Patient | Doctor calls a patient who is absent and clicks *"Skip Patient"*. | Status updates to `skipped` and patient appears in the *Skipped* tab. | Pass |

---

## 5. Real-Time Synchronization Testing

| Test ID | Test Scenario | Steps | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **RT-01** | Doctor Call & Patient Sync | Open Doctor Console on Window A. Open Patient Dashboard (Token #1) on Window B. Doctor clicks "Call Next". | Window B updates automatically to show "Called (Now)" with alert banner without refreshing. | Pass |
| **RT-02** | Queue Advance Count | Patient with Token #3 monitors dashboard while Doctor completes Token #1. | Patients ahead automatically decrements from 2 to 1 in real-time. | Pass |

---

## 6. Responsive UI & Cross-Device Testing

| Screen Size | Breakpoint | Tested Viewports | Result |
| :--- | :--- | :--- | :--- |
| **Mobile** | `< 640px` | 375x667 (iPhone SE), 390x844 (iPhone 14) | Hamburger menu opens slide-over drawer; cards stack cleanly; tables scroll horizontally. |
| **Tablet** | `640px - 1024px` | 768x1024 (iPad Mini), 820x1180 (iPad Air) | Two-column grid layouts; navigation remains accessible; modals scale appropriately. |
| **Desktop / TV** | `> 1024px` | 1366x768, 1920x1080 (Waiting Room Display) | Persistent sidebar, multi-card queue boards, full-width data tables. |

---

## 7. Verification Summary

- ✅ Zero TypeScript or Vite bundling errors (`npm run build` exits 0).
- ✅ Zero hardcoded fake hospital records pre-filled.
- ✅ Atomic, sequential token numbering verified (`COALESCE(MAX(token_number), 0) + 1`).
- ✅ Multi-role authentication & navigation guards operating correctly.
- ✅ Offline local storage resilience ensuring immediate functionality without blank screens.
- ✅ Ready for college mini-project demonstration and evaluation.
