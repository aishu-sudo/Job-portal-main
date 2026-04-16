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

-- ============================================================================
-- AUDIT/PROVENANCE TABLES
-- ============================================================================

-- Audit table for Users (captures role changes and user modifications)
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

-- Audit table for Jobs (captures job status and budget changes)
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

-- Audit table for Applications (captures application status transitions)
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

-- Audit table for Payments (captures payment lifecycle and status changes)
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
-- SEQUENCES FOR ID GENERATION
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

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC PROVENANCE LOGGING
-- ============================================================================

-- Trigger for automatic INSERT audit logging on Jobs
CREATE OR REPLACE TRIGGER trg_job_insert
AFTER INSERT ON Jobs
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Jobs (audit_id, job_id, new_status, new_budget, operation_type, timestamp, changed_by)
    VALUES (audit_job_seq.NEXTVAL, :NEW.job_id, :NEW.status, :NEW.budget, 'INSERT', SYSDATE, USER);
END;
/

-- Trigger for automatic UPDATE audit logging on Jobs
CREATE OR REPLACE TRIGGER trg_job_update
AFTER UPDATE ON Jobs
FOR EACH ROW
BEGIN
    IF :OLD.status != :NEW.status OR :OLD.budget != :NEW.budget THEN
        INSERT INTO Audit_Jobs (audit_id, job_id, old_status, new_status, old_budget, new_budget, operation_type, timestamp, changed_by)
        VALUES (audit_job_seq.NEXTVAL, :NEW.job_id, :OLD.status, :NEW.status, :OLD.budget, :NEW.budget, 'UPDATE', SYSDATE, USER);
    END IF;
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
CREATE OR REPLACE TRIGGER trg_application_update
AFTER UPDATE ON Applications
FOR EACH ROW
BEGIN
    IF :OLD.status != :NEW.status OR :OLD.bid_amount != :NEW.bid_amount THEN
        INSERT INTO Audit_Applications (audit_id, app_id, job_id, freelancer_id, old_status, new_status, old_bid_amount, new_bid_amount, operation_type, timestamp, changed_by)
        VALUES (audit_app_seq.NEXTVAL, :NEW.app_id, :NEW.job_id, :NEW.freelancer_id, :OLD.status, :NEW.status, :OLD.bid_amount, :NEW.bid_amount, 'UPDATE', SYSDATE, USER);
    END IF;
END;
/

-- Trigger for automatic INSERT audit logging on Payments
CREATE OR REPLACE TRIGGER trg_payment_insert
AFTER INSERT ON Payments
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Payments (audit_id, payment_id, job_id, new_amount, new_type, new_status, operation_type, timestamp, changed_by, source_table, affected_row_id)
    VALUES (audit_payment_seq.NEXTVAL, :NEW.payment_id, :NEW.job_id, :NEW.amount, :NEW.type, :NEW.status, 'INSERT', SYSDATE, USER, 'Payments', :NEW.job_id);
END;
/

-- Trigger for automatic UPDATE audit logging on Payments
CREATE OR REPLACE TRIGGER trg_payment_update
AFTER UPDATE ON Payments
FOR EACH ROW
BEGIN
    IF :OLD.status != :NEW.status OR :OLD.type != :NEW.type OR :OLD.amount != :NEW.amount THEN
        INSERT INTO Audit_Payments (audit_id, payment_id, job_id, old_status, new_status, old_type, new_type, old_amount, new_amount, operation_type, timestamp, changed_by, source_table, affected_row_id)
        VALUES (audit_payment_seq.NEXTVAL, :NEW.payment_id, :NEW.job_id, :OLD.status, :NEW.status, :OLD.type, :NEW.type, :OLD.amount, :NEW.amount, 'UPDATE', SYSDATE, USER, 'Payments', :NEW.job_id);
    END IF;
END;
/

-- ============================================================================
-- SAMPLE DATA INSERTION
-- ============================================================================

-- Insert sample users
INSERT INTO Users (user_id, name, email, role, password) VALUES (user_seq.NEXTVAL, 'Alice Johnson', 'alice@example.com', 'client', 'pass123');
INSERT INTO Users (user_id, name, email, role, password) VALUES (user_seq.NEXTVAL, 'Bob Smith', 'bob@example.com', 'client', 'pass123');
INSERT INTO Users (user_id, name, email, role, password) VALUES (user_seq.NEXTVAL, 'Charlie Brown', 'charlie@example.com', 'freelancer', 'pass123');
INSERT INTO Users (user_id, name, email, role, password) VALUES (user_seq.NEXTVAL, 'Diana Prince', 'diana@example.com', 'freelancer', 'pass123');

-- Insert sample jobs
INSERT INTO Jobs (job_id, title, description, budget, category, client_id) 
VALUES (job_seq.NEXTVAL, 'Website Development', 'Build a modern e-commerce website', 5000.00, 'web-development', 1);

INSERT INTO Jobs (job_id, title, description, budget, category, client_id) 
VALUES (job_seq.NEXTVAL, 'Mobile App Design', 'Design mockups for iOS/Android app', 3000.00, 'design', 2);

INSERT INTO Jobs (job_id, title, description, budget, category, client_id) 
VALUES (job_seq.NEXTVAL, 'Content Writing', 'Write blog posts for tech website', 1500.00, 'writing', 1);

-- Insert sample applications
INSERT INTO Applications (app_id, job_id, freelancer_id, status, proposal, bid_amount) 
VALUES (app_seq.NEXTVAL, 1, 3, 'pending', 'I have 5 years of web dev experience', 4500.00);

INSERT INTO Applications (app_id, job_id, freelancer_id, status, proposal, bid_amount) 
VALUES (app_seq.NEXTVAL, 1, 4, 'pending', 'Specialized in React and Node.js', 5200.00);

INSERT INTO Applications (app_id, job_id, freelancer_id, status, proposal, bid_amount) 
VALUES (app_seq.NEXTVAL, 2, 3, 'accepted', 'Expert in UI/UX design with Figma', 3000.00);

INSERT INTO Applications (app_id, job_id, freelancer_id, status, proposal, bid_amount) 
VALUES (app_seq.NEXTVAL, 3, 4, 'pending', 'Professional content writer', 1400.00);

-- Insert sample payments
INSERT INTO Payments (payment_id, job_id, amount, type, status, client_id, freelancer_id, transaction_id) 
VALUES (payment_seq.NEXTVAL, 1, 4500.00, 'client_payment', 'pending', 1, 3, 'TXN001');

INSERT INTO Payments (payment_id, job_id, amount, type, status, client_id, freelancer_id, transaction_id) 
VALUES (payment_seq.NEXTVAL, 2, 3000.00, 'client_payment', 'pending', 2, 3, 'TXN002');

INSERT INTO Payments (payment_id, job_id, amount, type, status, client_id, freelancer_id, transaction_id) 
VALUES (payment_seq.NEXTVAL, 1, 4050.00, 'freelancer_payout', 'completed', 1, 3, 'PAYOUT001');

COMMIT;