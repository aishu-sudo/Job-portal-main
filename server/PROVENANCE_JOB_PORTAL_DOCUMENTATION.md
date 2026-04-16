# Provenance-Enabled RDBMS - Job Portal Documentation

## 1. Introduction

### Project Overview
This project implements a **Provenance-Enabled Relational Database Management System** for the **Job Portal** application. The system captures the "why," "where," and "how" of data evolution, ensuring transparency, facilitating dispute resolution, auditing, and compliance through comprehensive audit trails.

### Purpose of Provenance
- **Why-Provenance**: Understanding justification for data values (e.g., why a job budget is $X)
- **Where-Provenance**: Tracking source and lineage (e.g., which user made changes)
- **How-Provenance**: Documenting transformation history (e.g., job/application status transitions)

### Application Scenario
Job Portal with clients, freelancers, jobs, applications, and payments. Complete audit trails are critical for:
- **Dispute resolution** (job/payment/application disputes)
- **Compliance** (regulatory requirements)
- **Freelancer tracking** (performance, accountability)
- **Payment reconciliation** (client vs freelancer payouts)
- **User accountability** (who did what, when)

---

## 2. Database Design

### 2.1 Core Tables

**USERS** - Client, freelancer, and admin accounts
- Tracks role changes for accountability
- Email unique prevents duplicate registrations

**JOBS** - Job postings by clients  
- Status transitions tracked (open → in-progress → completed)
- Budget changes tracked for justification

**APPLICATIONS** - Freelancer applications to jobs
- Status changes tracked (pending → accepted/rejected)
- Bid amounts tracked for negotiation history

**PAYMENTS** - Client payments and freelancer payouts
- Type: client_payment or freelancer_payout
- Status tracked through complete lifecycle

### 2.2 Audit Tables

**AUDIT_JOBS** - Tracks job status and budget changes
**AUDIT_APPLICATIONS** - Tracks application status and bid changes
**AUDIT_PAYMENTS** - Tracks payment lifecycle and status changes
**AUDIT_USERS** - Tracks role and profile changes

Each audit record captures: action type, time of change, actor, before/after values, business reason.

---

## 3. Stored Procedures (7 total)

1. **insert_user_p** - Register new user with role
2. **insert_job_p** - Post new job
3. **update_job_status_p** - Change job status with audit
4. **update_job_budget_p** - Modify job budget with audit
5. **update_application_status_p** - Accept/reject application with audit
6. **insert_payment_p** - Create payment record
7. **update_payment_status_p** - Update payment status with audit

---

## 4. Automatic Triggers (6 total)

1. **trg_job_insert** - Auto-audit job creation
2. **trg_job_update** - Auto-audit job changes
3. **trg_application_insert** - Auto-audit application creation
4. **trg_application_update** - Auto-audit application changes
5. **trg_payment_insert** - Auto-audit payment creation
6. **trg_payment_update** - Auto-audit payment changes

Triggers ensure comprehensive coverage without manual intervention.

---

## 5. Provenance Queries (8 total)

### Query 1: Job Budget History (WHY-PROVENANCE)
Shows all budget changes for a job, justifying current budget.

**View**: JobBudgetHistory
**Usage**: Track why a job's budget is at its current level

### Query 2: Job Status Transitions (HOW-PROVENANCE)
Shows complete job lifecycle: open → in-progress → completed.

**View**: JobStatusTransitions
**Usage**: See how a job evolved through its states

### Query 3: Job Action Audit (WHERE-PROVENANCE)
Shows all changes made to a job and who made them.

**View**: JobActionAudit
**Usage**: Track user accountability and audit trail

### Query 4: Application Status Transitions (HOW-PROVENANCE)
Shows how applications evolved: pending → accepted/rejected.

**View**: ApplicationStatusTransitions
**Usage**: Track application workflow and decisions

### Query 5: Payment Status Transitions (WHERE-PROVENANCE)
Shows payment lifecycle: pending → completed/failed.

**View**: PaymentStatusTransitions
**Usage**: Track payment processing and resolve disputes

### Query 6: Freelancer Application History (WHERE-PROVENANCE)
Shows all applications from a freelancer with outcomes.

**View**: FreelancerApplicationHistory
**Usage**: Track freelancer performance and history

### Query 7: Complete Job Audit Trail (COMBINED)
Shows complete job evolution with applications and payments.

**View**: CompleteJobAuditTrail
**Usage**: Full job history for analysis

### Query 8: Payment Dispute Analysis (WHY-PROVENANCE)
Shows complete payment history for dispute resolution.

**Usage**: Answer "why is payment in this state?"

---

## 6. Sample Data

Includes:
- 4 users (2 clients, 2 freelancers)
- 3 jobs with various budgets
- 4 applications with different statuses
- 3 payments (client payments and freelancer payouts)

---

## 7. Usage Examples

### Track Job Budget Changes
```sql
SELECT * FROM JobBudgetHistory WHERE job_id = 1;
-- Shows: why current budget is $X
```

### Track Job Progress
```sql
SELECT * FROM JobStatusTransitions WHERE job_id = 1;
-- Shows: how job evolved through open → in-progress → completed
```

### Find Who Changed a Job
```sql
SELECT * FROM JobActionAudit WHERE job_id = 1;
-- Shows: all users and their changes
```

### Resolve Application Dispute
```sql
SELECT * FROM ApplicationStatusTransitions WHERE app_id = 1;
-- Shows: complete application history
```

### Resolve Payment Dispute
```sql
SELECT * FROM PaymentStatusTransitions WHERE payment_id = 1;
-- Shows: why payment is in current state
```

### Freelancer Performance
```sql
SELECT * FROM FreelancerApplicationHistory WHERE freelancer_id = 3;
-- Shows: all applications and outcomes
```

---

## 8. Files Included

- **schema.sql** - Complete schema with all tables, triggers, procedures, and sample data
- **provenance_queries.sql** - All 8 provenance queries and views
- **PROVENANCE_PROJECT_DOCUMENTATION.md** - Original detailed documentation

---

## 9. Key Features

✅ **Comprehensive Audit Trail** - Every change tracked with user, timestamp, before/after values
✅ **Three Provenance Types** - Why (justification), Where (source), How (transformation)
✅ **Automatic Tracking** - Triggers ensure no change is missed
✅ **Complex Queries** - Window functions for sophisticated analysis
✅ **Production Ready** - Normalized design with proper constraints
✅ **Dispute Resolution** - Complete history for resolving conflicts
✅ **Compliance Ready** - Full audit logs for regulatory requirements

---

## 10. Execution Instructions

### 1. Create Database Schema
```bash
sqlplus /nolog
CONNECT sys as sysdba
@schema.sql
```

### 2. Create Provenance Views/Queries
```bash
sqlplus /nolog
CONNECT username/password
@provenance_queries.sql
```

### 3. Test Procedures
```sql
-- Update job status
EXEC update_job_status_p(1, 'in-progress', 'ADMIN', 'Job started');

-- Update payment
EXEC update_payment_status_p(1, 'completed', 'ADMIN', 'Payment processed');

-- View audit trails
SELECT * FROM Audit_Jobs ORDER BY timestamp DESC;
SELECT * FROM Audit_Applications ORDER BY timestamp DESC;
SELECT * FROM Audit_Payments ORDER BY timestamp DESC;
```

---

## Conclusion

This provenance-enabled Job Portal database provides complete transparency and accountability for:
- ✅ Job lifecycle management
- ✅ Application workflow tracking
- ✅ Payment processing and reconciliation
- ✅ Freelancer performance history
- ✅ Dispute resolution and compliance

All while maintaining data integrity and providing complete audit trails for regulatory compliance.
