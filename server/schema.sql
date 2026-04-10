-- -- 1. USERS TABLE

-- CREATE TABLE Users (
--   user_id NUMBER PRIMARY KEY,
--   name VARCHAR2(50) NOT NULL,
--   email VARCHAR2(100) NOT NULL UNIQUE,
--   role VARCHAR2(20) CHECK (role IN ('client', 'freelancer'))
-- );


-- -- 2. JOBS TABLE

-- CREATE TABLE Jobs (
--   job_id NUMBER PRIMARY KEY,
--   title VARCHAR2(100) NOT NULL,
--   description VARCHAR2(300),
--   budget NUMBER,
--   client_id NUMBER,
--   FOREIGN KEY (client_id) REFERENCES Users(user_id)
-- );


-- -- 3. APPLICATIONS TABLE

-- CREATE TABLE Applications (
--   app_id NUMBER PRIMARY KEY,
--   job_id NUMBER,
--   freelancer_id NUMBER,
--   status VARCHAR2(20) DEFAULT 'pending'
--   CHECK (status IN ('pending','accepted','rejected')),
--   FOREIGN KEY (job_id) REFERENCES Jobs(job_id),
--   FOREIGN KEY (freelancer_id) REFERENCES Users(user_id)
-- );


-- -- 4. PAYMENTS TABLE

-- CREATE TABLE Payments (
--   payment_id NUMBER PRIMARY KEY,
--   job_id NUMBER,
--   amount NUMBER,
--   payment_date DATE DEFAULT SYSDATE,
--   FOREIGN KEY (job_id) REFERENCES Jobs(job_id)
-- );


-- -- 5. AUDIT TABLES


-- CREATE TABLE Audit_Jobs (
--   audit_id NUMBER PRIMARY KEY,
--   job_id NUMBER,
--   old_title VARCHAR2(100),
--   new_title VARCHAR2(100),
--   old_budget NUMBER,
--   new_budget NUMBER,
--   operation_type VARCHAR2(10),
--   changed_at DATE,
--   changed_by VARCHAR2(50)
-- );

-- CREATE TABLE Audit_Applications (
--   audit_id NUMBER PRIMARY KEY,
--   app_id NUMBER,
--   old_status VARCHAR2(20),
--   new_status VARCHAR2(20),
--   operation_type VARCHAR2(10),
--   changed_at DATE,
--   changed_by VARCHAR2(50)
-- );

-- CREATE TABLE Audit_Payments (
--   audit_id NUMBER PRIMARY KEY,
--   payment_id NUMBER,
--   old_amount NUMBER,
--   new_amount NUMBER,
--   operation_type VARCHAR2(10),
--   changed_at DATE,
--   changed_by VARCHAR2(50)
-- );


-- CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;
-- CREATE SEQUENCE jobs_seq START WITH 1 INCREMENT BY 1;
-- CREATE SEQUENCE app_seq START WITH 1 INCREMENT BY 1;
-- CREATE SEQUENCE payment_seq START WITH 1 INCREMENT BY 1;

-- CREATE SEQUENCE audit_jobs_seq START WITH 1 INCREMENT BY 1;
-- CREATE SEQUENCE audit_app_seq START WITH 1 INCREMENT BY 1;
-- CREATE SEQUENCE audit_pay_seq START WITH 1 INCREMENT BY 1;

-- ALTER TABLE Users ADD password VARCHAR2(100);

-- USERS
-- INSERT INTO Users 
-- VALUES (users_seq.NEXTVAL, 'Aishu', 'aishu@gmail.com', 'client', '123');

-- INSERT INTO Users 
-- VALUES (users_seq.NEXTVAL, 'Rahim', 'rahim@gmail.com', 'freelancer', '123');
-- SELECT * FROM Users;

SELECT u.name, j.title
FROM Jobs j
JOIN Users u ON j.client_id = u.user_id;