
-- PROVENANCE QUERIES - JOB PORTAL
-- CSE464: Advanced Database Systems - Term Project

-- These queries demonstrate the three types of provenance:
-- 1. WHY-PROVENANCE: Justification for data values (e.g., why job budget changed)
-- 2. WHERE-PROVENANCE: Source and lineage of data (e.g., from which user made the change)
-- 3. HOW-PROVENANCE: Transformation history and evolution of data ( job status transitions)



-- QUERY 1: List all budget changes for a specific job over time
-- Type: WHY-PROVENANCE (Justification)
-- Description: Shows why job budget is what it is by tracking all changes

/*
This query demonstrates why-provenance by showing all historical budget changes
for a specific job, including when they occurred and who made the change.
It provides justification for the current budget by showing the complete history.
*/

CREATE OR REPLACE VIEW JobBudgetHistory AS
SELECT 
    aj.job_id,
    j.title AS job_title,
    aj.old_budget,
    aj.new_budget,
    aj.timestamp,
    aj.changed_by,
    aj.change_reason,
    aj.operation_type,
    ROW_NUMBER() OVER (PARTITION BY aj.job_id ORDER BY aj.timestamp DESC) AS change_sequence
FROM Audit_Jobs aj
JOIN Jobs j ON aj.job_id = j.job_id
WHERE aj.operation_type IN ('INSERT', 'UPDATE')
ORDER BY aj.job_id, aj.timestamp DESC;

-- Query execution:
-- SELECT * FROM JobBudgetHistory WHERE job_id = 1;



-- QUERY 2: Trace the status transitions of a specific job
-- Type: HOW-PROVENANCE (Transformation History)
-- Description: Shows how a job evolved through different states

/*
This query demonstrates how-provenance by showing the complete transformation
history of a job, including all status transitions, when they occurred, and
who initiated each change. It provides a complete audit trail.
*/

CREATE OR REPLACE VIEW JobStatusTransitions AS
SELECT 
    aj.job_id,
    j.title AS job_title,
    j.client_id,
    u.name AS client_name,
    aj.old_status,
    aj.new_status,
    aj.timestamp,
    aj.changed_by,
    aj.change_reason,
    LAG(aj.new_status) OVER (PARTITION BY aj.job_id ORDER BY aj.timestamp) AS previous_status,
    LEAD(aj.new_status) OVER (PARTITION BY aj.job_id ORDER BY aj.timestamp) AS next_status,
    ROW_NUMBER() OVER (PARTITION BY aj.job_id ORDER BY aj.timestamp) AS status_change_number
FROM Audit_Jobs aj
JOIN Jobs j ON aj.job_id = j.job_id
JOIN Users u ON j.client_id = u.user_id
WHERE aj.old_status IS NOT NULL OR aj.new_status IS NOT NULL
ORDER BY aj.job_id, aj.timestamp;

-- Query execution:
-- SELECT * FROM JobStatusTransitions WHERE job_id = 1;



-- QUERY 3: Find all actions taken on a specific job by all users
-- Type: WHERE-PROVENANCE (Source/Lineage)
-- Description: Shows all changes made to a job and who made them

/*
This query demonstrates where-provenance by tracking all actions performed
on a specific job. It shows what was changed, when, and who made the changes.
*/

CREATE OR REPLACE VIEW JobActionAudit AS
SELECT 
    aj.changed_by,
    aj.job_id,
    j.title AS job_title,
    j.client_id,
    u.name AS client_name,
    aj.operation_type,
    CASE 
        WHEN aj.old_status IS NOT NULL THEN 'Status: ' || NVL(aj.old_status, 'NULL') || ' -> ' || NVL(aj.new_status, 'NULL')
        WHEN aj.old_budget IS NOT NULL THEN 'Budget: ' || NVL(TO_CHAR(aj.old_budget), 'NULL') || ' -> ' || NVL(TO_CHAR(aj.new_budget), 'NULL')
        ELSE 'Job Created'
    END AS change_details,
    aj.timestamp,
    aj.change_reason,
    COUNT(*) OVER (PARTITION BY aj.changed_by, aj.job_id) AS total_actions_by_user_on_job
FROM Audit_Jobs aj
JOIN Jobs j ON aj.job_id = j.job_id
JOIN Users u ON j.client_id = u.user_id
ORDER BY aj.changed_by, aj.timestamp DESC;

-- Query execution:
-- SELECT * FROM JobActionAudit WHERE job_id = 1;



-- QUERY 4: Trace application status changes for a specific job
-- Type: HOW-PROVENANCE (Application Lifecycle)
-- Description: Shows how applications for a job evolved

/*
This query tracks the application lifecycle for a job, showing all status
transitions from pending to accepted/rejected, with complete audit trail.
*/

CREATE OR REPLACE VIEW ApplicationStatusTransitions AS
SELECT 
    aa.app_id,
    aa.job_id,
    j.title AS job_title,
    aa.freelancer_id,
    f.name AS freelancer_name,
    aa.old_status,
    aa.new_status,
    aa.old_bid_amount,
    aa.new_bid_amount,
    aa.timestamp,
    aa.changed_by,
    aa.change_reason,
    ROW_NUMBER() OVER (PARTITION BY aa.app_id ORDER BY aa.timestamp) AS status_change_number
FROM Audit_Applications aa
JOIN Jobs j ON aa.job_id = j.job_id
JOIN Users f ON aa.freelancer_id = f.user_id
WHERE aa.old_status IS NOT NULL OR aa.new_status IS NOT NULL
ORDER BY aa.app_id, aa.timestamp;

-- Query execution:
-- SELECT * FROM ApplicationStatusTransitions WHERE job_id = 1;



-- QUERY 5: Track payment lifecycle and status changes
-- Type: WHERE-PROVENANCE (Payment Source and Reason)
-- Description: Shows all payment status transitions with business reasons

/*
This query tracks the payment lifecycle by showing all status changes, including
the source operation, the user responsible, and the business reason.
It provides complete payment processing traceability.
*/

CREATE OR REPLACE VIEW PaymentStatusTransitions AS
SELECT 
    ap.payment_id,
    ap.job_id,
    j.title AS job_title,
    ap.old_status AS previous_status,
    ap.new_status AS current_status,
    ap.old_type,
    ap.new_type,
    ap.old_amount,
    ap.new_amount,
    ap.timestamp,
    ap.changed_by,
    ap.change_reason,
    ap.operation_type,
    ROW_NUMBER() OVER (PARTITION BY ap.payment_id ORDER BY ap.timestamp) AS payment_change_number
FROM Audit_Payments ap
LEFT JOIN Jobs j ON ap.job_id = j.job_id
ORDER BY ap.payment_id, ap.timestamp DESC;

-- Query execution:
-- SELECT * FROM PaymentStatusTransitions;


-- QUERY 6: Freelancer work history - track all applications and their outcomes
-- Type: WHERE-PROVENANCE (Lineage/Source)
-- Description: Shows all applications from a freelancer and their evolution

/*
This query demonstrates where-provenance by showing the complete history of a
freelancer's applications across jobs, including all status changes and bid amounts.
Useful for freelancer performance tracking and dispute resolution.
*/

CREATE OR REPLACE VIEW FreelancerApplicationHistory AS
SELECT 
    f.user_id AS freelancer_id,
    f.name AS freelancer_name,
    aa.app_id,
    aa.job_id,
    j.title AS job_title,
    j.budget AS job_budget,
    c.name AS client_name,
    aa.old_status,
    aa.new_status,
    aa.old_bid_amount,
    aa.new_bid_amount,
    aa.timestamp,
    aa.operation_type,
    ROW_NUMBER() OVER (PARTITION BY f.user_id, aa.app_id ORDER BY aa.timestamp) AS application_change_number
FROM Audit_Applications aa
JOIN Users f ON aa.freelancer_id = f.user_id
JOIN Jobs j ON aa.job_id = j.job_id
JOIN Users c ON j.client_id = c.user_id
ORDER BY f.user_id, aa.timestamp DESC;

-- Query execution:
-- SELECT * FROM FreelancerApplicationHistory WHERE freelancer_id = 3;


-- QUERY 7: Complete audit trail for a job from creation to completion
-- Type: COMBINED PROVENANCE (Why + How + Where)
-- Description: Shows complete evolution of job with all related changes

/*
This comprehensive query demonstrates combined provenance by showing:
1. The job's status evolution (how)
2. Budget changes (why)
3. Who made each change (where)
4. Applications received and their status
5. Payments related to the job
*/

CREATE OR REPLACE VIEW CompleteJobAuditTrail AS
SELECT 
    j.job_id,
    j.title AS job_title,
    c.name AS client_name,
    j.status AS current_status,
    j.budget AS current_budget,
    (SELECT COUNT(*) FROM Applications WHERE job_id = j.job_id) AS total_applications,
    (SELECT COUNT(*) FROM Payments WHERE job_id = j.job_id AND status = 'completed') AS completed_payments,
    aj.operation_type,
    CASE 
        WHEN aj.old_status IS NOT NULL THEN 'Status Change: ' || aj.old_status || ' -> ' || aj.new_status
        WHEN aj.old_budget IS NOT NULL THEN 'Budget Change: ' || TO_CHAR(aj.old_budget) || ' -> ' || TO_CHAR(aj.new_budget)
        ELSE 'Job Created'
    END AS change_description,
    aj.timestamp,
    aj.changed_by,
    aj.change_reason
FROM Jobs j
JOIN Users c ON j.client_id = c.user_id
LEFT JOIN Audit_Jobs aj ON j.job_id = aj.job_id
ORDER BY j.job_id, aj.timestamp DESC;

-- Query execution:
-- SELECT * FROM CompleteJobAuditTrail WHERE job_id = 1;


-- QUERY 8: Payment dispute analysis - why a payment failed or was refunded
-- Type: WHY-PROVENANCE (Complete Justification)
-- Description: Shows complete payment history with all status changes and reasons

/*
This query helps in dispute resolution by showing:
- Complete payment history
- All status changes (pending -> failed -> pending -> completed, etc.)
- Reasons for each change
- User responsible for each action
*/

SELECT 
    ap.payment_id,
    ap.job_id,
    j.title AS job_title,
    ap.old_amount,
    ap.new_amount,
    ap.old_type,
    ap.new_type,
    ap.old_status AS previous_status,
    ap.new_status AS new_status,
    ap.timestamp,
    ap.changed_by,
    ap.change_reason,
    ROW_NUMBER() OVER (PARTITION BY ap.payment_id ORDER BY ap.timestamp) AS timeline_sequence
FROM Audit_Payments ap
LEFT JOIN Jobs j ON ap.job_id = j.job_id
WHERE ap.operation_type IN ('INSERT', 'UPDATE')
ORDER BY ap.payment_id, ap.timestamp DESC;

-- This query shows why a payment is in its current state by showing complete history



-- SUMMARY VIEW: Complete Compliance Audit Log for Job Portal

/*
Unified view showing all provenance information across all entities for auditing
and compliance purposes.
*/

CREATE OR REPLACE VIEW ComplianceAuditLog AS
SELECT 
    'Job' AS entity_type,
    job_id AS entity_id,
    operation_type,
    timestamp,
    changed_by,
    'Job ' || CASE WHEN old_status IS NOT NULL THEN old_status || ' -> ' || new_status 
                    WHEN old_budget IS NOT NULL THEN 'Budget: ' || old_budget || ' -> ' || new_budget 
                    ELSE 'Created' END AS change_details,
    change_reason AS reason
FROM Audit_Jobs
UNION ALL
SELECT 
    'Application' AS entity_type,
    app_id AS entity_id,
    operation_type,
    timestamp,
    changed_by,
    'Application ' || CASE WHEN old_status IS NOT NULL THEN old_status || ' -> ' || new_status 
                           WHEN old_bid_amount IS NOT NULL THEN 'Bid: ' || old_bid_amount || ' -> ' || new_bid_amount
                           ELSE 'Created' END AS change_details,
    change_reason AS reason
FROM Audit_Applications
UNION ALL
SELECT 
    'Payment' AS entity_type,
    payment_id AS entity_id,
    operation_type,
    timestamp,
    changed_by,
    'Payment ' || CASE WHEN old_status IS NOT NULL THEN old_status || ' -> ' || new_status 
                       WHEN old_type IS NOT NULL THEN old_type || ' -> ' || new_type
                       WHEN old_amount IS NOT NULL THEN 'Amount: ' || old_amount || ' -> ' || new_amount
                       ELSE 'Created' END AS change_details,
    change_reason AS reason
FROM Audit_Payments
ORDER BY timestamp DESC;

-- Query execution:
-- SELECT * FROM ComplianceAuditLog;

