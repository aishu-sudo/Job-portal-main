-- CREATE TABLE Users (
--   user_id NUMBER PRIMARY KEY,
--   name VARCHAR2(50),
--   email VARCHAR2(100),
--   role VARCHAR2(20)
-- );

-- CREATE TABLE Jobs (
--   job_id NUMBER PRIMARY KEY,
--   title VARCHAR2(100),
--   description VARCHAR2(200),
--   budget NUMBER,
--   client_id NUMBER,
--   FOREIGN KEY (client_id) REFERENCES Users(user_id)
-- );

-- CREATE TABLE Applications (
--   app_id NUMBER PRIMARY KEY,
--   job_id NUMBER,
--   freelancer_id NUMBER,
--   status VARCHAR2(20),
--   FOREIGN KEY (job_id) REFERENCES Jobs(job_id),
--   FOREIGN KEY (freelancer_id) REFERENCES Users(user_id)
-- );

-- CREATE TABLE Payments (
--   payment_id NUMBER PRIMARY KEY,
--   job_id NUMBER,
--   amount NUMBER,
--   payment_date DATE,
--   FOREIGN KEY (job_id) REFERENCES Jobs(job_id)
-- );



--Audit Table
CREATE TABLE Audit_Jobs (
  audit_id NUMBER PRIMARY KEY,
  job_id NUMBER,
  old_title VARCHAR2(100),
  new_title VARCHAR2(100),
  old_budget NUMBER,
  new_budget NUMBER,
  operation_type VARCHAR2(10),
  changed_at DATE,
  changed_by VARCHAR2(50)
);

CREATE TABLE Audit_Applications (
  audit_id NUMBER PRIMARY KEY,
  app_id NUMBER,
  old_status VARCHAR2(20),
  new_status VARCHAR2(20),
  operation_type VARCHAR2(10),
  changed_at DATE,
  changed_by VARCHAR2(50)
);

CREATE TABLE Audit_Payments (
  audit_id NUMBER PRIMARY KEY,
  payment_id NUMBER,
  old_amount NUMBER,
  new_amount NUMBER,
  operation_type VARCHAR2(10),
  changed_at DATE,
  changed_by VARCHAR2(50)
);
