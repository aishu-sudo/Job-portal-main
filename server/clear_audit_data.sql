-- Clear all audit table records (keeps tables, sequences, and main data intact)

DELETE FROM Audit_Payments;
DELETE FROM Audit_Applications;
DELETE FROM Audit_Jobs;
DELETE FROM Audit_Users;

-- Reset audit sequences back to 1
DROP SEQUENCE audit_user_seq;
CREATE SEQUENCE audit_user_seq START WITH 1 INCREMENT BY 1;

DROP SEQUENCE audit_job_seq;
CREATE SEQUENCE audit_job_seq START WITH 1 INCREMENT BY 1;

DROP SEQUENCE audit_app_seq;
CREATE SEQUENCE audit_app_seq START WITH 1 INCREMENT BY 1;

DROP SEQUENCE audit_payment_seq;
CREATE SEQUENCE audit_payment_seq START WITH 1 INCREMENT BY 1;

COMMIT;
