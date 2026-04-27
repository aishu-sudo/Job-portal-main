-- ============================================================================
-- PROVENANCE-ENABLED JOB PORTAL DATABASE SCHEMA
-- CSE464: Advanced Database Systems - Term Project
-- ============================================================================

-- ============================================================================
-- CORE SCHEMA TABLES
-- ============================================================================

-- 1. USERS TABLE
CREATE TABLE Users (
  user_id NUMBER PRIMARY KEY,
  name VARCHAR2(100) NOT NULL,
  email VARCHAR2(100) NOT NULL UNIQUE,
  role VARCHAR2(20) CHECK (role IN ('client', 'freelancer', 'admin')) NOT NULL,
  password VARCHAR2(100),
  created_at DATE DEFAULT SYSDATE
);

-- 2. JOBS TABLE
CREATE TABLE Jobs (
  job_id NUMBER PRIMARY KEY,
  title VARCHAR2(100) NOT NULL,
  description VARCHAR2(500),
  budget NUMBER(10, 2) NOT NULL,
  category VARCHAR2(50),
  status VARCHAR2(20) DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'completed', 'cancelled')),
  client_id NUMBER NOT NULL,
  created_at DATE DEFAULT SYSDATE,
  FOREIGN KEY (client_id) REFERENCES Users(user_id)
);

-- 3. APPLICATIONS TABLE
CREATE TABLE Applications (
  app_id NUMBER PRIMARY KEY,
  job_id NUMBER NOT NULL,
  freelancer_id NUMBER NOT NULL,
  status VARCHAR2(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  proposal VARCHAR2(500),
  bid_amount NUMBER(10, 2),
  applicant_name VARCHAR2(100),
  created_at DATE DEFAULT SYSDATE,
  FOREIGN KEY (job_id) REFERENCES Jobs(job_id),
  FOREIGN KEY (freelancer_id) REFERENCES Users(user_id)
);

-- 4. PAYMENTS TABLE
CREATE TABLE Payments (
  payment_id NUMBER PRIMARY KEY,
  job_id NUMBER NOT NULL,
  amount NUMBER(10, 2) NOT NULL,
  payment_date DATE DEFAULT SYSDATE,
  type VARCHAR2(20) DEFAULT 'client_payment' CHECK (type IN ('client_payment', 'freelancer_payout')),
  status VARCHAR2(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  client_id NUMBER,
  freelancer_id NUMBER,
  transaction_id VARCHAR2(100),
  error_message VARCHAR2(255),
  created_at DATE DEFAULT SYSDATE,
  FOREIGN KEY (job_id) REFERENCES Jobs(job_id),
  FOREIGN KEY (client_id) REFERENCES Users(user_id),
  FOREIGN KEY (freelancer_id) REFERENCES Users(user_id)
);


CREATE TABLE Audit_Users (
  audit_id NUMBER PRIMARY KEY,
  user_id NUMBER NOT NULL,
  old_role VARCHAR2(20),
  new_role VARCHAR2(20),
  operation_type VARCHAR2(10) CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  timestamp DATE DEFAULT SYSDATE,
  changed_by VARCHAR2(100),
  change_reason VARCHAR2(255)
);

CREATE TABLE Audit_Jobs (
  audit_id NUMBER PRIMARY KEY,
  job_id NUMBER NOT NULL,
  old_status VARCHAR2(20),
  new_status VARCHAR2(20),
  old_budget NUMBER(10, 2),
  new_budget NUMBER(10, 2),
  operation_type VARCHAR2(10) CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  timestamp DATE DEFAULT SYSDATE,
  changed_by VARCHAR2(100),
  change_reason VARCHAR2(255)
);

CREATE TABLE Audit_Applications (
  audit_id NUMBER PRIMARY KEY,
  app_id NUMBER NOT NULL,
  job_id NUMBER,
  freelancer_id NUMBER,
  old_status VARCHAR2(20),
  new_status VARCHAR2(20),
  old_bid_amount NUMBER(10, 2),
  new_bid_amount NUMBER(10, 2),
  operation_type VARCHAR2(10) CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  timestamp DATE DEFAULT SYSDATE,
  changed_by VARCHAR2(100),
  change_reason VARCHAR2(255)
);

CREATE TABLE Audit_Payments (
  audit_id NUMBER PRIMARY KEY,
  payment_id NUMBER NOT NULL,
  job_id NUMBER,
  old_amount NUMBER(10, 2),
  new_amount NUMBER(10, 2),
  old_type VARCHAR2(20),
  new_type VARCHAR2(20),
  old_status VARCHAR2(20),
  new_status VARCHAR2(20),
  operation_type VARCHAR2(10) CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  timestamp DATE DEFAULT SYSDATE,
  changed_by VARCHAR2(100),
  source_table VARCHAR2(50),
  affected_row_id NUMBER
);

-- ============================================================================

CREATE SEQUENCE user_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE job_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE app_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE payment_seq START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE audit_user_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE audit_job_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE audit_app_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE audit_payment_seq START WITH 1 INCREMENT BY 1;

-- ============================================================================
-- STORED PROCEDURES FOR DML OPERATIONS
-- ============================================================================

-- Insert User Procedure
CREATE OR REPLACE PROCEDURE insert_user_p (
    p_name IN VARCHAR2,
    p_email IN VARCHAR2,
    p_role IN VARCHAR2,
    p_password IN VARCHAR2
)
AS
BEGIN
    INSERT INTO Users (user_id, name, email, role, password)
    VALUES (user_seq.NEXTVAL, p_name, p_email, p_role, p_password);
    COMMIT;
END insert_user_p;
/

-- Insert Job Procedure
CREATE OR REPLACE PROCEDURE insert_job_p (
    p_title IN VARCHAR2,
    p_description IN VARCHAR2,
    p_budget IN NUMBER,
    p_category IN VARCHAR2,
    p_client_id IN NUMBER
)
AS
BEGIN
    INSERT INTO Jobs (job_id, title, description, budget, category, client_id)
    VALUES (job_seq.NEXTVAL, p_title, p_description, p_budget, p_category, p_client_id);
    COMMIT;
END insert_job_p;
/

-- Update Job Status Procedure
CREATE OR REPLACE PROCEDURE update_job_status_p (
    p_job_id IN NUMBER,
    p_new_status IN VARCHAR2,
    p_changed_by IN VARCHAR2,
    p_reason IN VARCHAR2
)
AS
    v_old_status VARCHAR2(20);
BEGIN
    SELECT status INTO v_old_status FROM Jobs WHERE job_id = p_job_id;
    
    UPDATE Jobs SET status = p_new_status WHERE job_id = p_job_id;
    
    INSERT INTO Audit_Jobs (audit_id, job_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
    VALUES (audit_job_seq.NEXTVAL, p_job_id, v_old_status, p_new_status, 'UPDATE', SYSDATE, p_changed_by, p_reason);
    
    COMMIT;
END update_job_status_p;
/

-- Update Job Budget Procedure
CREATE OR REPLACE PROCEDURE update_job_budget_p (
    p_job_id IN NUMBER,
    p_new_budget IN NUMBER,
    p_changed_by IN VARCHAR2,
    p_reason IN VARCHAR2
)
AS
    v_old_budget NUMBER(10, 2);
BEGIN
    SELECT budget INTO v_old_budget FROM Jobs WHERE job_id = p_job_id;
    
    UPDATE Jobs SET budget = p_new_budget WHERE job_id = p_job_id;
    
    INSERT INTO Audit_Jobs (audit_id, job_id, old_budget, new_budget, operation_type, timestamp, changed_by, change_reason)
    VALUES (audit_job_seq.NEXTVAL, p_job_id, v_old_budget, p_new_budget, 'UPDATE', SYSDATE, p_changed_by, p_reason);
    
    COMMIT;
END update_job_budget_p;
/

-- Update Application Status Procedure
CREATE OR REPLACE PROCEDURE update_application_status_p (
    p_app_id IN NUMBER,
    p_new_status IN VARCHAR2,
    p_changed_by IN VARCHAR2,
    p_reason IN VARCHAR2
)
AS
    v_old_status VARCHAR2(20);
    v_job_id NUMBER;
    v_freelancer_id NUMBER;
BEGIN
    SELECT status, job_id, freelancer_id INTO v_old_status, v_job_id, v_freelancer_id 
    FROM Applications WHERE app_id = p_app_id;
    
    UPDATE Applications SET status = p_new_status WHERE app_id = p_app_id;
    
    INSERT INTO Audit_Applications (audit_id, app_id, job_id, freelancer_id, old_status, new_status, 
                                    operation_type, timestamp, changed_by, change_reason)
    VALUES (audit_app_seq.NEXTVAL, p_app_id, v_job_id, v_freelancer_id, v_old_status, p_new_status, 
            'UPDATE', SYSDATE, p_changed_by, p_reason);
    
    COMMIT;
END update_application_status_p;
/

-- Insert Payment Procedure
CREATE OR REPLACE PROCEDURE insert_payment_p (
    p_job_id IN NUMBER,
    p_amount IN NUMBER,
    p_type IN VARCHAR2,
    p_client_id IN NUMBER,
    p_freelancer_id IN NUMBER,
    p_changed_by IN VARCHAR2
)
AS
BEGIN
    INSERT INTO Payments (payment_id, job_id, amount, type, status, client_id, freelancer_id)
    VALUES (payment_seq.NEXTVAL, p_job_id, p_amount, p_type, 'pending', p_client_id, p_freelancer_id);
    
    INSERT INTO Audit_Payments (audit_id, payment_id, job_id, new_amount, new_type, new_status, 
                                operation_type, timestamp, changed_by, source_table, affected_row_id)
    VALUES (audit_payment_seq.NEXTVAL, payment_seq.CURRVAL, p_job_id, p_amount, p_type, 'pending', 
            'INSERT', SYSDATE, p_changed_by, 'Payments', p_job_id);
    
    COMMIT;
END insert_payment_p;
/

-- Update Payment Status Procedure
CREATE OR REPLACE PROCEDURE update_payment_status_p (
    p_payment_id IN NUMBER,
    p_new_status IN VARCHAR2,
    p_changed_by IN VARCHAR2,
    p_reason IN VARCHAR2
)
AS
    v_old_status VARCHAR2(20);
    v_job_id NUMBER;
BEGIN
    SELECT status, job_id INTO v_old_status, v_job_id FROM Payments WHERE payment_id = p_payment_id;
    
    UPDATE Payments SET status = p_new_status WHERE payment_id = p_payment_id;
    
    INSERT INTO Audit_Payments (audit_id, payment_id, job_id, old_status, new_status,
                                operation_type, timestamp, changed_by, source_table, affected_row_id)
    VALUES (audit_payment_seq.NEXTVAL, p_payment_id, v_job_id, v_old_status, p_new_status,
            'UPDATE', SYSDATE, p_changed_by, 'Payments', p_payment_id);
    
    COMMIT;
END update_payment_status_p;
/

-- TRIGGERS FOR AUTOMATIC PROVENANCE LOGGING


-- Trigger for automatic INSERT audit logging on Jobs
-- NOTE: Body is intentionally empty — the backend inserts the audit record
-- with the real application-level user name after calling insert_job_p.
-- Keeping both would create duplicate Audit_Jobs rows per job creation.
CREATE OR REPLACE TRIGGER trg_job_insert
AFTER INSERT ON Jobs
FOR EACH ROW
BEGIN
    NULL;
END;
/

-- Trigger for automatic UPDATE audit logging on Jobs
-- NOTE: Body is intentionally empty — update_job_status_p and
-- update_job_budget_p stored procedures insert the audit record with the
-- real user name and change reason. Running both creates duplicates.
CREATE OR REPLACE TRIGGER trg_job_update
AFTER UPDATE ON Jobs
FOR EACH ROW
BEGIN
    NULL;
END;
/

-- Trigger for automatic INSERT audit logging on Applications
CREATE OR REPLACE TRIGGER trg_application_insert
AFTER INSERT ON Applications
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Applications (audit_id, app_id, job_id, freelancer_id, new_status, new_bid_amount, operation_type, timestamp, changed_by)
    VALUES (audit_app_seq.NEXTVAL, :NEW.app_id, :NEW.job_id, :NEW.freelancer_id, :NEW.status, :NEW.bid_amount, 'INSERT', SYSDATE, USER);
END;
/

-- Trigger for automatic UPDATE audit logging on Applications
-- NOTE: Body is intentionally empty — update_application_status_p stores the
-- audit record with real user name + reason. Both would create duplicates.
CREATE OR REPLACE TRIGGER trg_application_update
AFTER UPDATE ON Applications
FOR EACH ROW
BEGIN
    NULL;
END;
/

-- Trigger for automatic INSERT audit logging on Payments
-- NOTE: Body is intentionally empty — insert_payment_p stored procedure
-- handles the audit insert. Both would create duplicates.
CREATE OR REPLACE TRIGGER trg_payment_insert
AFTER INSERT ON Payments
FOR EACH ROW
BEGIN
    NULL;
END;
/

-- Trigger for automatic UPDATE audit logging on Payments
-- NOTE: Body is intentionally empty — update_payment_status_p stored procedure
-- handles the audit insert with real user name. Both would create duplicates.
CREATE OR REPLACE TRIGGER trg_payment_update
AFTER UPDATE ON Payments
FOR EACH ROW
BEGIN
    NULL;
END;
/


COMMIT;