# Provenance-Enabled Job Portal System

> **CSE464 – Advanced Database Systems | Group 4 | East West University**

A full-stack job portal that connects **clients** (employers) with **freelancers** (job seekers), featuring complete **data provenance tracking** — every change in the system is recorded with *who* made it, *when*, and *why*.

---

## Table of Contents

- [Overview](#overview)
- [User Roles](#user-roles)
- [Features](#features)
- [Provenance System](#provenance-system)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Team](#team)

---

## Overview

This system manages the **complete lifecycle of a job** — from posting to payment — while maintaining a full audit trail. Built on top of **Oracle Database XE**, it uses stored procedures and triggers to capture provenance data for every INSERT and UPDATE operation.

---

## User Roles

| Role | Capabilities |
|---|---|
| **Client** | Post projects, review applicants, accept/reject, make payments |
| **Freelancer** | Browse jobs, submit applications, receive payments |
| **Admin** | Manage users, update job status/budget, view provenance data, explore all tables |

---

## Features

### Client
- Register and log in securely (JWT + bcrypt)
- Post projects with title, description, salary range, job type, location, and required skills
- View all applicants with proposal details and bid amounts
- Accept or reject freelancers (triggers stored procedure + audit log)
- Make payments via Credit/Debit Card, PayPal, or Venmo
- View project and applicant history

### Freelancer
- Browse all available job listings with category filters
- Apply for jobs with full name, email, resume/CV upload, cover letter
- Track application status (pending / accepted / rejected)
- View payment history with job-wise breakdown

### Admin
- **Data Explorer** — browse any database table (Users, Jobs, Applications, Payments, and all 4 Audit tables) directly from the UI
- **Update Job** — change job status or budget with a mandatory reason field (WHY-provenance)
- **Manage Users** — view and change user roles
- **Data Provenance Viewer** — interactive dashboard with 5 views:
  - Complete Audit Trail (combined)
  - Status Changes (HOW-Provenance)
  - Budget Changes (WHY-Provenance)
  - Who Did What (WHERE-Provenance)
  - All Jobs Global Audit Log
- **System Report** — overall system statistics
- **Notifications** — real-time activity alerts

---

## Provenance System

The core feature of this project is its **3-type provenance tracking**, implemented via Oracle stored procedures and triggers.

| Provenance Type | Question Answered | Implementation |
|---|---|---|
| **WHERE** | Where did this data come from? Who created it? | `changed_by` field in all audit tables |
| **WHY** | Why was this data changed? | `change_reason` field captured on every UPDATE |
| **HOW** | How did the data evolve over time? | Full INSERT → UPDATE history in audit tables |

### Audit Tables

Each core table has a matching audit table:

| Core Table | Audit Table | Tracks |
|---|---|---|
| `Users` | `Audit_Users` | Role changes, registrations |
| `Jobs` | `Audit_Jobs` | Status changes, budget modifications |
| `Applications` | `Audit_Applications` | Application lifecycle (pending → accepted/rejected) |
| `Payments` | `Audit_Payments` | Payment status (pending → completed/failed) |

### How It Works

```
Client posts job
    └─► insert_job_p (procedure) ──► Jobs table
                                          └─► trg_job_insert (trigger) ──► Audit_Jobs [INSERT]

Client accepts applicant
    └─► update_application_status_p ──► Applications table
                                              └─► Audit_Applications [UPDATE, with reason]
                                        update_job_status_p ──► Jobs table
                                              └─► Audit_Jobs [UPDATE: open → in-progress]

Client pays freelancer
    └─► insert_payment_p ──► Payments table
                                   └─► Audit_Payments [INSERT]
Freelancer marks received
    └─► update_payment_status_p ──► Payments table
                                         └─► Audit_Payments [UPDATE: pending → completed]
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | Oracle Database XE (XEPDB1) |
| **Auth** | JSON Web Tokens (JWT) + bcryptjs |
| **DB Driver** | oracledb (Node.js) |
| **Dev Server** | lite-server (frontend), nodemon (backend) |

---

## Project Structure

```
Job-portal/
├── client/
│   └── public/
│       ├── htmlfiles/          # All HTML pages (dashboard, login, jobs, etc.)
│       ├── scripts/            # JavaScript modules per feature
│       ├── styles/             # CSS stylesheets
│       ├── images/             # Static image assets
│       └── index.html
│
├── server/
│   ├── models/
│   │   └── db.js               # Oracle DB connection pool
│   ├── routes/
│   │   ├── auth.js             # POST /api/auth/signup, /login
│   │   ├── job.js              # CRUD + audit endpoints for jobs
│   │   ├── payment.js          # Payment creation and status updates
│   │   ├── freelancer.js       # Freelancer-specific routes
│   │   ├── users.js            # User management
│   │   ├── explorer.js         # GET /api/explorer/:tableName
│   │   └── notifications.js    # Notification system
│   ├── schema.sql              # Full Oracle DDL (tables, sequences, procedures, triggers)
│   ├── provenance_queries.sql  # Provenance views (JobBudgetHistory, CompleteJobAuditTrail, etc.)
│   ├── drop_all.sql            # Reset script
│   └── server.js               # Express app entry point
│
└── README.md
```

---

## Database Schema

### Core Tables

```sql
Users(user_id, name, email, role, password, created_at)
Jobs(job_id, title, description, budget, category, status, client_id, created_at)
Applications(app_id, job_id, freelancer_id, status, proposal, bid_amount, applicant_name, created_at)
Payments(payment_id, job_id, amount, type, status, client_id, freelancer_id, transaction_id, created_at)
```

### Audit Tables

```sql
Audit_Users(audit_id, user_id, old_role, new_role, operation_type, timestamp, changed_by, change_reason)
Audit_Jobs(audit_id, job_id, old_status, new_status, old_budget, new_budget, operation_type, timestamp, changed_by, change_reason)
Audit_Applications(audit_id, app_id, job_id, freelancer_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
Audit_Payments(audit_id, payment_id, job_id, old_status, new_status, old_amount, new_amount, operation_type, timestamp, changed_by, source_table)
```

### Stored Procedures

| Procedure | Purpose |
|---|---|
| `insert_user_p` | Register a new user |
| `insert_job_p` | Post a new job |
| `update_job_status_p` | Change job status + log to Audit_Jobs |
| `update_job_budget_p` | Change job budget + log to Audit_Jobs |
| `update_application_status_p` | Accept/reject application + log to Audit_Applications |
| `insert_payment_p` | Create a payment + log to Audit_Payments |
| `update_payment_status_p` | Update payment status + log to Audit_Payments |

### Triggers

| Trigger | Fires On | Action |
|---|---|---|
| `trg_user_insert` | INSERT on Users | Logs registration to Audit_Users |
| `trg_application_insert` | INSERT on Applications | Logs new application to Audit_Applications |
| `trg_payment_insert` | INSERT on Payments | Logs new payment to Audit_Payments |

> UPDATE triggers have NULL bodies — audit logging for updates is handled exclusively by stored procedures to prevent duplicate records.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Oracle Database XE](https://www.oracle.com/database/technologies/xe-downloads.html) with a pluggable database named `XEPDB1`
- Oracle Instant Client (for `oracledb` npm package)

### 1. Clone the repository

```bash
git clone https://github.com/aishu-sudo/Job-portal.git
cd Job-portal
```

### 2. Set up the database

Open SQL*Plus or SQL Developer and run:

```bash
@server/schema.sql
@server/provenance_queries.sql
```

### 3. Configure environment variables

```bash
cd server
cp .env.example .env
```

Edit `.env`:

```env
ORACLE_DB_USER=system
ORACLE_DB_PASSWORD=your_password
ORACLE_DB_CONNECT_STRING=127.0.0.1:1521/XEPDB1
```

### 4. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 5. Run the application

```bash
# Start backend (from /server)
node server.js

# Start frontend (from /client) — opens at http://localhost:3000
npm start
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs` | Get all jobs |
| POST | `/api/jobs` | Post a new job |
| PUT | `/api/jobs/:id/status` | Update job status (calls stored procedure) |
| PUT | `/api/jobs/:id/budget` | Update job budget (calls stored procedure) |
| GET | `/api/jobs/:id/audit/complete` | Get complete audit trail for a job |
| GET | `/api/jobs/:id/audit/status-history` | HOW-Provenance: status changes |
| GET | `/api/jobs/:id/audit/budget-history` | WHY-Provenance: budget changes |
| GET | `/api/jobs/audit/all-jobs` | Global audit log across all jobs |

### Applications
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/jobs/:id/apply` | Submit a job application |
| PUT | `/api/jobs/applications/:id/status` | Accept or reject applicant |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments` | Create a payment |
| PUT | `/api/payments/:id/status` | Update payment status |
| GET | `/api/payments/freelancer` | Get freelancer's payment history |

### Data Explorer (Admin only)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/explorer/tables` | List all allowed tables |
| GET | `/api/explorer/:tableName` | Browse any table's data |

---

## License

This project is submitted as an academic assignment for **CSE464 – Advanced Database Systems**.
