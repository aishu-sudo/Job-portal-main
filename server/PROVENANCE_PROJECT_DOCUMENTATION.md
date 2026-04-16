# Provenance-Enabled RDBMS - Job Portal Documentation

## 1. Introduction

### Project Overview
This project implements a **Provenance-Enabled Relational Database Management System** for a Job Portal application. The system captures the "why," "where," and "how" of data evolution, ensuring transparency, facilitating dispute resolution, auditing, and compliance through comprehensive audit trails and tracking mechanisms.

### Purpose of Provenance
- **Why-Provenance**: Understanding the justification for data values (e.g., why a job budget is $X)
- **Where-Provenance**: Tracking source and lineage of data (e.g., which user made changes)
- **How-Provenance**: Documenting transformation history and evolution (e.g., job status transitions)

### Application Scenario
Job Portal platform with clients, freelancers, jobs, applications, and payment processing, where complete audit trails are critical for:
- Dispute resolution (job/payment disputes)
- Regulatory compliance
- Freelancer performance tracking
- Payment reconciliation
- User accountability
- Application workflow transparency

---

## 2. Database Design

### 2.1 Relational Schema Diagram

```
USERS (PK: user_id)
├── user_id (NUMBER)
├── name (VARCHAR2)
├── email (VARCHAR2) - UNIQUE
├── role (client|freelancer|admin)
└── password (VARCHAR2)
     ↓
    JOBS (PK: job_id, FK: client_id → USERS)
    ├── job_id (NUMBER)
    ├── title (VARCHAR2)
    ├── description (VARCHAR2)
    ├── budget (NUMBER)
    ├── category (VARCHAR2)
    ├── status (open|in-progress|completed|cancelled)
    ├── client_id → USERS
    └── created_at (DATE)
         ↓
    ┌────┴──────────────────┬──────────────────┐
    ↓                       ↓                  ↓
APPLICATIONS          PAYMENTS          AUDIT_JOBS
(PK: app_id)         (PK: payment_id)   (PK: audit_id)
├── app_id           ├── payment_id      ├── audit_id
├── job_id (FK)      ├── job_id (FK)     ├── job_id
├── freelancer_id    ├── amount          ├── old_status
├── status           ├── type            ├── new_status
├── proposal         ├── status          ├── old_budget
└── bid_amount       ├── client_id       ├── new_budget
     ↓                ├── freelancer_id   ├── timestamp
                     └── transaction_id  └── changed_by
                          ↓
                     AUDIT_APPLICATIONS
                     ├── app_id
                     ├── job_id
                     ├── freelancer_id
                     ├── old_status/new_status
                     ├── old_bid_amount/new_bid_amount
                     └── timestamp

```

### 2.2 Table Specifications

#### Core Tables

**USERS**
```sql
CREATE TABLE Users (
  user_id NUMBER PRIMARY KEY,
  name VARCHAR2(100) NOT NULL,
  email VARCHAR2(100) NOT NULL UNIQUE,
  role VARCHAR2(20) CHECK (role IN ('client', 'freelancer', 'admin')) NOT NULL,
  password VARCHAR2(100),
  created_at DATE DEFAULT SYSDATE
);
```
- Stores user information with role-based access
- Email unique to prevent duplicate registrations

**JOBS**
```sql
CREATE TABLE Jobs (
  job_id NUMBER PRIMARY KEY,
  title VARCHAR2(100) NOT NULL,
  description VARCHAR2(500),
  budget NUMBER(10, 2) NOT NULL,
  category VARCHAR2(50),
  status VARCHAR2(20) DEFAULT 'open' 
    CHECK (status IN ('open', 'in-progress', 'completed', 'cancelled')),
  client_id NUMBER NOT NULL,
  created_at DATE DEFAULT SYSDATE,
  FOREIGN KEY (client_id) REFERENCES Users(user_id)
);
```
- Core job posting entity
- Status transitions tracked for how-provenance
- Budget changes tracked for why-provenance

**APPLICATIONS**
```sql
CREATE TABLE Applications (
  app_id NUMBER PRIMARY KEY,
  job_id NUMBER NOT NULL,
  freelancer_id NUMBER NOT NULL,
  status VARCHAR2(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  proposal VARCHAR2(500),
  bid_amount NUMBER(10, 2),
  created_at DATE DEFAULT SYSDATE,
  FOREIGN KEY (job_id) REFERENCES Jobs(job_id),
  FOREIGN KEY (freelancer_id) REFERENCES Users(user_id)
);
```
- Freelancer applications to jobs
- Status and bid changes tracked

**PAYMENTS**
```sql
CREATE TABLE Payments (
  payment_id NUMBER PRIMARY KEY,
  job_id NUMBER NOT NULL,
  amount NUMBER(10, 2) NOT NULL,
  payment_date DATE DEFAULT SYSDATE,
  type VARCHAR2(20) CHECK (type IN ('client_payment', 'freelancer_payout')) 
    DEFAULT 'client_payment',
  status VARCHAR2(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  client_id NUMBER,
  freelancer_id NUMBER,
  transaction_id VARCHAR2(100),
  error_message VARCHAR2(255),
  created_at DATE DEFAULT SYSDATE,
  FOREIGN KEY (job_id) REFERENCES Jobs(job_id),
  FOREIGN KEY (client_id) REFERENCES Users(user_id),
  FOREIGN KEY (freelancer_id) REFERENCES Users(user_id)
);
```
- Handles both client payments and freelancer payouts
- Status changes tracked for payment lifecycle

---

## 3. Audit Table Design

### 3.1 Audit Tables Structure

Audit tables capture all data changes with complete metadata:

**AUDIT_USERS** - Tracks role and user profile changes
```
Fields:
- audit_id (PK)
- user_id (FK to Users)
- old_role / new_role
- operation_type (INSERT, UPDATE, DELETE)
- timestamp (when change occurred)
- changed_by (who made change)
- change_reason (business reason)
```

**AUDIT_JOBS** - Tracks job status and budget changes
```
Fields:
- audit_id (PK)
- job_id (FK to Jobs)
- old_status / new_status (how-provenance)
- old_budget / new_budget (why-provenance)
- operation_type
- timestamp
- changed_by
- change_reason
```

**AUDIT_APPLICATIONS** - Tracks application status and bid changes
```
Fields:
- audit_id (PK)
- app_id (FK to Applications)
- job_id, freelancer_id
- old_status / new_status
- old_bid_amount / new_bid_amount
- operation_type
- timestamp
- changed_by (where-provenance)
- change_reason
```

**AUDIT_PAYMENTS** - Tracks payment lifecycle and type/status changes
```
Fields:
- audit_id (PK)
- payment_id (FK to Payments)
- job_id
- old_amount / new_amount
- old_type / new_type (client_payment vs freelancer_payout)
- old_status / new_status
- operation_type
- timestamp
- changed_by (where-provenance)
- source_table (which table was affected)
- affected_row_id (which row)
```

### 3.2 Captured Metadata

Each audit record captures:
1. **Action Type** (INSERT, UPDATE, DELETE)
2. **Time of Change** (timestamp SYSDATE)
3. **Actor** (changed_by - database user)
4. **Before/After Values** (old_* and new_* columns)
5. **Business Context** (change_reason - optional but valuable)

All allowing complete reconstruction of data evolution and root cause analysis.---

## 4. Trigger/Procedure Implementation

### 4.1 Stored Procedures

**insert_user_p** - Insert new user (client/freelancer)
**insert_job_p** - Insert new job posting
**update_job_status_p** - Update job status with audit trail
**update_job_budget_p** - Update job budget with audit trail  
**update_application_status_p** - Update application status (accept/reject)
**insert_payment_p** - Insert new payment record
**update_payment_status_p** - Update payment status with audit trail

All procedures automatically log changes to audit tables, ensuring comprehensive provenance capture.

### 4.2 Automatic Triggers

**trg_job_insert** - Auto-log job creation
**trg_job_update** - Auto-log job status/budget changes
**trg_application_insert** - Auto-log application creation
**trg_application_update** - Auto-log application status/bid changes
**trg_payment_insert** - Auto-log payment creation
**trg_payment_update** - Auto-log payment status changes

All 6 triggers automatically insert audit records into corresponding audit tables when DML operations occur, ensuring comprehensive provenance capture without manual intervention.

---

## 5. Provenance Queries

**Type: WHY-PROVENANCE (Justification)**

**Purpose**: Shows why product prices are what they are

**SQL Code**:
```sql
CREATE OR REPLACE VIEW ProductPriceHistory AS
SELECT 
    ap.product_id,
    p.name AS product_name,
    ap.old_price,
    ap.new_price,
    ap.timestamp,
    ap.user_id,
    ap.change_reason,
    ap.operation_type,
    ROW_NUMBER() OVER (PARTITION BY ap.product_id ORDER BY ap.timestamp DESC) AS change_sequence
FROM Audit_Products ap
JOIN Products p ON ap.product_id = p.product_id
WHERE ap.operation_type IN ('INSERT', 'UPDATE')
ORDER BY ap.product_id, ap.timestamp DESC;

-- To query: SELECT * FROM ProductPriceHistory WHERE product_id = 1;
```

**Sample Output**:
```
product_id | product_name | old_price | new_price | timestamp         | user_id | change_reason | operation_type
-----------|--------------|-----------|-----------|-------------------|---------|---------------|----------------
1          | Laptop       | 999.99    | 1099.99   | 2026-04-17 10:15  | ADMIN   | Price increase| UPDATE
1          | Laptop       | NULL      | 999.99    | 2026-04-16 09:30  | ADMIN   | Initial price | INSERT
```

**Interpretation**: Product "Laptop" was created at $999.99 and later increased to $1,099.99. This provides complete justification for the current price.

---

### 5.2 Query 2: Trace the status transitions of a specific Order

**Type: HOW-PROVENANCE (Transformation History)**

**Purpose**: Shows how an order evolved through different states

**SQL Code**:
```sql
CREATE OR REPLACE VIEW OrderStatusTransitions AS
SELECT 
    ao.order_id,
    o.customer_id,
    c.name AS customer_name,
    ao.old_status,
    ao.new_status,
    ao.timestamp,
    ao.user_id,
    ao.change_reason,
    LAG(ao.new_status) OVER (PARTITION BY ao.order_id ORDER BY ao.timestamp) AS previous_status,
    LEAD(ao.new_status) OVER (PARTITION BY ao.order_id ORDER BY ao.timestamp) AS next_status
FROM Audit_Orders ao
JOIN Orders o ON ao.order_id = o.order_id
JOIN Customers c ON o.customer_id = c.customer_id
ORDER BY ao.order_id, ao.timestamp;

-- To query: SELECT * FROM OrderStatusTransitions WHERE order_id = 1;
```

**Sample Output**:
```
order_id | customer_name | old_status | new_status | timestamp         | user_id | previous_status | next_status
---------|---------------|-----------|------------|-------------------|---------|-----------------|-------------
1        | Alice Johnson | pending    | processing| 2026-04-17 10:20  | ADMIN   | NULL           | shipped
1        | Alice Johnson | processing | shipped    | 2026-04-17 11:00  | ADMIN   | processing     | delivered
1        | Alice Johnson | shipped    | delivered  | 2026-04-17 15:30  | ADMIN   | shipped        | NULL
```

**Interpretation**: Order #1 progressed through: pending → processing → shipped → delivered. This complete transformation history enables dispute resolution and customer service.

---

### 5.3 Query 3: Find all actions taken by a user on the Orders table

**Type: WHERE-PROVENANCE (Source/Lineage)**

**Purpose**: Tracks all changes made by a specific user

**SQL Code**:
```sql
CREATE OR REPLACE VIEW UserActionsOnOrders AS
SELECT 
    ao.user_id,
    ao.order_id,
    o.customer_id,
    c.name AS customer_name,
    ao.operation_type,
    ao.old_status,
    ao.new_status,
    ao.timestamp,
    ao.change_reason,
    COUNT(*) OVER (PARTITION BY ao.user_id) AS total_actions_by_user
FROM Audit_Orders ao
JOIN Orders o ON ao.order_id = o.order_id
JOIN Customers c ON o.customer_id = c.customer_id
ORDER BY ao.user_id, ao.timestamp DESC;

-- To query: SELECT * FROM UserActionsOnOrders WHERE user_id = 'ADMIN';
```

**Sample Output**:
```
user_id | order_id | customer_name | operation_type | old_status | new_status | timestamp         | total_actions_by_user
--------|----------|---------------|----------------|------------|------------|-------------------|---------------------
ADMIN   | 1        | Alice Johnson | UPDATE         | pending    | processing | 2026-04-17 10:20  | 5
ADMIN   | 3        | Charlie Brown | UPDATE         | pending    | processing | 2026-04-17 10:15  | 5
ADMIN   | 2        | Bob Smith     | UPDATE         | pending    | processing | 2026-04-17 10:10  | 5
```

**Interpretation**: User 'ADMIN' has made 5 actions on orders, all status transitions. This ensures user accountability and compliance.

---

### 5.4 Query 4: Track payment status changes and their reasons

**Type: WHERE-PROVENANCE (Source and Reason)**

**Purpose**: Shows all payment status transitions

**SQL Code**:
```sql
SELECT 
    ap.payment_id,
    ap.old_status AS previous_status,
    ap.new_status AS current_status,
    ap.timestamp,
    ap.user_id,
    ap.source_table,
    ap.affected_row_id AS order_id,
    p.amount,
    ROW_NUMBER() OVER (PARTITION BY ap.payment_id ORDER BY ap.timestamp) AS status_change_number
FROM Audit_Payments ap
LEFT JOIN Payments p ON ap.payment_id = p.payment_id
ORDER BY ap.payment_id, ap.timestamp DESC;
```

**Sample Output**:
```
payment_id | previous_status | current_status | timestamp         | amount  | status_change_number
-----------|-----------------|----------------|-------------------|---------|--------------------
1          | pending         | completed      | 2026-04-17 11:00  | 1029.98 | 1
2          | pending         | completed      | 2026-04-17 10:45  | 109.98  | 1
3          | pending         | NULL           | 2026-04-17 10:30  | 1379.97 | 1
```

**Interpretation**: Payments 1 and 2 have been completed. Payment 3 is still pending. Complete payment lifecycle is traceable.

---

### 5.5 Query 5: Data lineage for order totals

**Type: WHY-PROVENANCE (Complete justification with lineage)**

**Purpose**: Shows how order totals are derived and changed

**SQL Code**:
```sql
SELECT 
    o.order_id,
    o.customer_id,
    c.name AS customer_name,
    o.total_amount AS current_total,
    ao.old_total_amount AS previous_total,
    ao.new_total_amount AS changed_to_total,
    ao.timestamp AS change_timestamp,
    ao.user_id,
    ao.change_reason,
    (SELECT COUNT(*) FROM OrderItems oi WHERE oi.order_id = o.order_id) AS number_of_items,
    (SELECT SUM(subtotal) FROM OrderItems oi WHERE oi.order_id = o.order_id) AS calculated_total,
    ao.operation_type
FROM Orders o
LEFT JOIN Audit_Orders ao ON o.order_id = ao.order_id
LEFT JOIN Customers c ON o.customer_id = c.customer_id
WHERE ao.operation_type IN ('INSERT', 'UPDATE')
ORDER BY o.order_id, ao.timestamp DESC;
```

**Sample Output**:
```
order_id | customer_name | current_total | previous_total | changed_to_total | number_of_items | calculated_total
---------|---------------|---------------|----------------|------------------|-----------------|------------------
1        | Alice Johnson | 1029.98       | NULL           | 1029.98          | 2               | 1029.98
2        | Bob Smith     | 109.98        | NULL           | 109.98           | 2               | 109.98
3        | Charlie Brown | 1379.97       | NULL           | 1379.97          | 3               | 1379.97
```

**Interpretation**: Each order total is justified by its component items, with complete history of any modifications.

---

## 6. Sample Data

The schema includes sample data for 3 customers, 4 products, and 3 orders with associated order items and payments to demonstrate the provenance system in action.

---

## 7. Challenges and Lessons Learned

### Implementation Challenges
1. **Trigger Complexity**: Conditionally logging only relevant changes to avoid bloating audit tables
2. **Performance**: Audit tables can grow large; indexing on frequently queried columns is essential
3. **User Context**: Oracle's USER variable captures database user, not application user (use procedures or contexts for better tracking)
4. **Cascading Updates**: Manual tracking of cascading changes through procedures

### Key Learnings
1. **Provenance Types**: Why/Where/How provenance requires different tracking strategies
2. **Audit Table Design**: Separate tables per entity simplify queries and indexing
3. **Procedure vs Triggers**: Procedures provide better control; triggers ensure comprehensive coverage
4. **View-Based Queries**: Creating views simplifies complex lineage queries
5. **Regulatory Compliance**: Comprehensive audit trails are essential for audit, compliance, and dispute resolution

---

## 8. Conclusion

This provenance-enabled RDBMS successfully captures and tracks the complete evolution of data in an e-commerce system through:
- **Normalized schema** with clear relationships
- **Comprehensive audit tables** capturing before/after states
- **Automated triggers** ensuring complete coverage
- **Powerful queries** enabling root cause analysis and compliance verification

### Future Scope
1. Application-layer user tracking (not just DB user)
2. Temporal queries (AS OF timestamp)
3. Automated archival of old audit records
4. GUI dashboard for audit visualization
5. Integration with data governance tools
6. Fine-grained access control based on audit trails

---

## 9. References

- Oracle Database SQL Language Reference - Triggers and Procedures
- Research Paper: "Why-Not" Provenance in Databases (2013)
- Data Lineage: An Overview (IBM Data Governance)
- GDPR Compliance through Data Provenance
- Advanced SQL Window Functions in Oracle

---

## Appendix A: Execution Instructions

### 1. Create the Schema
```bash
sqlplus /nolog
CONNECT sys as sysdba
@schema.sql
```

### 2. Run Provenance Queries
```bash
sqlplus /nolog
CONNECT username/password
@provenance_queries.sql
SELECT * FROM ProductPriceHistory WHERE product_id = 1;
```

### 3. Test Procedures
```sql
EXEC update_product_price_p(1, 1099.99, 'ADMIN', 'Price increase due to demand');
EXEC update_order_status_p(1, 'shipped', 'ADMIN', 'Order shipped today');
SELECT * FROM Audit_Products ORDER BY timestamp DESC;
SELECT * FROM Audit_Orders ORDER BY timestamp DESC;
```

