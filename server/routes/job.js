const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const getConnection = require('../models/db');

// DELETE /api/jobs/:jobId — permanently delete a job
router.delete('/:jobId', async(req, res) => {
    const { jobId } = req.params;
    let conn;
    try {
        conn = await getConnection();
        await conn.execute(
            'DELETE FROM Jobs WHERE job_id = :jobId', { jobId: Number(jobId) }, { autoCommit: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete job', details: e.message });
    } finally {
        if (conn) await conn.close();
    }
});

function mapJobRow(row) {
    return {
        jobId: row.JOB_ID,
        title: row.TITLE,
        description: row.DESCRIPTION,
        budget: row.BUDGET,
        category: row.CATEGORY,
        status: row.STATUS,
        clientId: row.CLIENT_ID,
        createdAt: row.CREATED_AT
    };
}

// POST / - Create a new job
router.post('/', async(req, res) => {
    // ...existing code...
});

// ...other route definitions...

module.exports = router;
const { title, description, budget, category, clientId } = req.body;
if (!title || budget == null || budget === '' || !clientId) {
    return res.status(400).json({ error: 'title, budget, and clientId are required' });
}
let conn;
try {
    conn = await getConnection();

    // Get client name for audit trail
    // Always fetch client name for audit
    let clientName = null;
    try {
        const clientResult = await conn.execute(
            `SELECT name FROM Users WHERE user_id = :clientId`, { clientId: Number(clientId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (clientResult.rows && clientResult.rows.length > 0) {
            clientName = clientResult.rows[0].NAME;
        }
    } catch (e) {
        console.log('Could not fetch client name:', e.message);
    }
    if (!clientName) {
        // fallback to clientId string if name not found
        clientName = `Client-${clientId}`;
    }

    // Check for duplicate job (same client, title, budget, category, status 'open')
    const dupJobResult = await conn.execute(
        `SELECT job_id FROM Jobs WHERE client_id = :clientId AND title = :title AND budget = :budget AND category = :category AND status = 'open'`, {
            clientId: Number(clientId),
            title,
            budget: Number(budget),
            category: category || 'general'
        }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    let jobId;
    if (dupJobResult.rows && dupJobResult.rows.length > 0) {
        // Duplicate found, return existing jobId
        jobId = dupJobResult.rows[0].JOB_ID;
    } else {
        // Insert new job
        await conn.execute(
            `BEGIN insert_job_p(:title, :description, :budget, :category, :clientId); END;`, {
                title,
                description: description || '',
                budget: Number(budget),
                category: category || 'general',
                clientId: Number(clientId)
            }, { autoCommit: true }
        );
        // Get the new job id
        const jobResult = await conn.execute(
            `SELECT job_id FROM Jobs WHERE client_id = :clientId ORDER BY job_id DESC FETCH FIRST 1 ROW ONLY`, { clientId: Number(clientId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        jobId = jobResult.rows[0].JOB_ID;
    }
    // Create audit record for job creation ONLY if not already exists for this job
    if (jobId) {
        const auditCheck = await conn.execute(
            `SELECT COUNT(*) AS CNT FROM Audit_Jobs WHERE job_id = :jobId AND new_status = 'open' AND operation_type = 'INSERT'`, { jobId: jobId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (!auditCheck.rows[0].CNT) {
            await conn.execute(
                `INSERT INTO Audit_Jobs (audit_id, job_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
                     VALUES (audit_job_seq.NEXTVAL, :jobId, NULL, 'open', 'INSERT', SYSDATE, :changedBy, 'Job created by client')`, { jobId: jobId, changedBy: clientName }, { autoCommit: true }
            );
        }
    }
    // Return the job
    const result = await conn.execute(
        `SELECT job_id, title, description, budget, category, status, client_id, created_at
             FROM Jobs WHERE job_id = :jobId`, { jobId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(201).json(mapJobRow(result.rows[0]));
} catch (error) {
    res.status(500).json({ error: 'Failed to create job', details: error.message });
} finally {
    if (conn) await conn.close();
}
});

// POST /projects - Create job from client project posting
router.post('/projects', async(req, res) => {
    const { description, title, budget, category } = req.body;

    // Get clientId from request body or header
    let clientId = req.body.clientId || req.headers['client-id'];

    console.log('📝 Project posting request received', { clientId, title, budget, category });

    if (!description || !clientId) {
        console.error('❌ Missing description or clientId:', { hasDescription: !!description, hasClientId: !!clientId });
        return res.status(400).json({ error: 'description and clientId are required' });
    }

    let conn;
    try {
        conn = await getConnection();

        // Get client name for audit trail
        let clientName = 'SYSTEM';
        try {
            const clientResult = await conn.execute(
                `SELECT name FROM Users WHERE user_id = :clientId`, { clientId: Number(clientId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            if (clientResult.rows && clientResult.rows.length > 0) {
                clientName = clientResult.rows[0].NAME;
            }
        } catch (e) {
            console.log('Could not fetch client name:', e.message);
        }

        // Create job from project posting
        await conn.execute(
            `BEGIN insert_job_p(:title, :description, :budget, :category, :clientId); END;`, {
                title: title || 'Project',
                description: description,
                budget: Number(budget) || 0,
                category: category || 'general',
                clientId: Number(clientId)
            }, { autoCommit: true }
        );
        console.log('✅ Job inserted successfully');

        // Get the newly created job and create audit record
        const jobResult = await conn.execute(
            `SELECT job_id FROM Jobs WHERE client_id = :clientId ORDER BY job_id DESC FETCH FIRST 1 ROW ONLY`, { clientId: Number(clientId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log('📊 Job query result:', jobResult.rows);

        if (jobResult.rows && jobResult.rows.length > 0) {
            const jobId = jobResult.rows[0].JOB_ID;
            // Check if an audit entry already exists for this job as 'open'
            const auditCheck = await conn.execute(
                `SELECT COUNT(*) AS CNT FROM Audit_Jobs WHERE job_id = :jobId AND new_status = 'open' AND operation_type = 'INSERT'`, { jobId: jobId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            if (!auditCheck.rows[0].CNT) {
                await conn.execute(
                    `INSERT INTO Audit_Jobs (audit_id, job_id, old_status, new_status, operation_type, timestamp, changed_by, change_reason)
                     VALUES (audit_job_seq.NEXTVAL, :jobId, NULL, 'open', 'INSERT', SYSDATE, :changedBy, 'Project posted by client')`, { jobId: jobId, changedBy: clientName }, { autoCommit: true }
                );
            }
        }

        const jobId = jobResult.rows && jobResult.rows.length > 0 ? jobResult.rows[0].JOB_ID : null;
        if (!jobId) {
            return res.status(500).json({ error: 'Failed to retrieve created job ID' });
        }
        res.status(201).json({ success: true, message: 'Project posted successfully', jobId: jobId });
    } catch (error) {
        console.error('Project posting error:', error);
        res.status(500).json({ error: 'Failed to post project', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

router.get('/browse', async(req, res) => {
    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT job_id, title, description, budget, category, status, client_id, created_at
             FROM Jobs
             WHERE status = 'open'
             ORDER BY created_at DESC`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log('📋 Browse: Returning', result.rows.length, 'jobs');
        if (result.rows.length > 0) {
            console.log(' Latest job:', { jobId: result.rows[0].JOB_ID, title: result.rows[0].TITLE, created_at: result.rows[0].CREATED_AT });
        }
        res.json(result.rows.map(mapJobRow));
    } catch (error) {
        console.error(' Browse error:', error.message);
        res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 2️ Apply for a Job
router.post('/:jobId/apply', async(req, res) => {
    const { freelancerId, applicantName } = req.body;
    const { jobId } = req.params;
    let conn;

    if (!freelancerId) {
        return res.status(400).json({ error: 'freelancerId is required' });
    }

    try {
        conn = await getConnection();
        await conn.execute(
            `INSERT INTO Applications (app_id, job_id, freelancer_id, status, applicant_name)
             VALUES (app_seq.NEXTVAL, :jobId, :freelancerId, 'pending', :applicantName)`, { jobId: Number(jobId), freelancerId: Number(freelancerId), applicantName: applicantName || null }, { autoCommit: true }
        );

        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        console.error('Application submission error:', error);
        res.status(500).json({ error: 'Failed to apply for job', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Get applications for a client's jobs
router.get('/applications/client/:clientId', async(req, res) => {
    const { clientId } = req.params;
    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT a.app_id, a.job_id, a.freelancer_id, a.status, a.proposal, a.bid_amount, a.created_at,
                    a.applicant_name,
                    j.title AS job_title, j.budget AS job_budget, j.status AS job_status,
                    u.name AS freelancer_name, u.email AS freelancer_email
             FROM Applications a
             JOIN Jobs j ON a.job_id = j.job_id
             JOIN Users u ON a.freelancer_id = u.user_id
             WHERE j.client_id = :clientId
             ORDER BY a.created_at DESC`, { clientId: Number(clientId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows.map(r => ({
            appId: r.APP_ID,
            jobId: r.JOB_ID,
            freelancerId: r.FREELANCER_ID,
            status: r.STATUS,
            proposal: r.PROPOSAL,
            bidAmount: r.BID_AMOUNT,
            createdAt: r.CREATED_AT,
            jobTitle: r.JOB_TITLE,
            jobBudget: r.JOB_BUDGET,
            jobStatus: r.JOB_STATUS,
            applicantName: r.APPLICANT_NAME || null,
            freelancerName: r.APPLICANT_NAME || r.FREELANCER_NAME,
            freelancerEmail: r.FREELANCER_EMAIL
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch applications', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Accept or Reject an application
router.put('/applications/:appId/respond', async(req, res) => {
    const { appId } = req.params;
    const { status, changedBy } = req.body;
    if (!status || !['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'status must be accepted or rejected' });
    }
    let conn;
    try {
        conn = await getConnection();
        // Update application status via stored procedure (creates audit record)
        await conn.execute(
            `BEGIN update_application_status_p(:appId, :status, :changedBy, :reason); END;`, {
                appId: Number(appId),
                status,
                changedBy: changedBy || 'CLIENT',
                reason: status === 'accepted' ? 'Client accepted application' : 'Client rejected application'
            }, { autoCommit: true }
        );

        // If accepted, update job status + create payment record
        if (status === 'accepted') {
            const appResult = await conn.execute(
                `SELECT a.job_id, a.freelancer_id, a.bid_amount, j.budget, j.client_id
                 FROM Applications a JOIN Jobs j ON a.job_id = j.job_id
                 WHERE a.app_id = :appId`, { appId: Number(appId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            if (appResult.rows.length > 0) {
                const row = appResult.rows[0];
                const jobId = row.JOB_ID;
                const amount = row.BID_AMOUNT || row.BUDGET;
                const clientId = row.CLIENT_ID;
                const freelancerId = row.FREELANCER_ID;

                // Update job status to 'in-progress' via stored procedure (audit record)
                await conn.execute(
                    `BEGIN update_job_status_p(:jobId, :status, :changedBy, :reason); END;`, {
                        jobId,
                        status: 'in-progress',
                        changedBy: changedBy || 'CLIENT',
                        reason: 'Application accepted - job now in progress'
                    }, { autoCommit: true }
                );

                // Create payment record (client_payment)
                await conn.execute(
                    `INSERT INTO Payments (payment_id, job_id, amount, type, status, client_id, freelancer_id)
                     VALUES (payment_seq.NEXTVAL, :jobId, :amount, 'client_payment', 'pending', :clientId, :freelancerId)`, { jobId, amount, clientId, freelancerId }, { autoCommit: true }
                );
            }
        }
        res.json({ message: `Application ${status}`, appId: Number(appId) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update application', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 3️Filter by Category
router.get('/category/:categoryName', async(req, res) => {
    const categoryName = req.params.categoryName.toLowerCase();
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT job_id, title, description, budget, client_id
             FROM Jobs
             WHERE LOWER(title) LIKE :query OR LOWER(description) LIKE :query`, { query: `%${categoryName}%` }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows.map(mapJobRow));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch category jobs', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 4️ Filter by Skill or Language
router.get('/filter', async(req, res) => {
    const { skill, language } = req.query;
    let conn;

    try {
        conn = await getConnection();
        let baseQuery = `SELECT job_id, title, description, budget, client_id FROM Jobs WHERE 1=1`;
        const binds = {};

        if (skill) {
            binds.skill = `%${skill.toLowerCase()}%`;
            baseQuery += ` AND LOWER(description) LIKE :skill`;
        }
        if (language) {
            binds.language = `%${language.toLowerCase()}%`;
            baseQuery += ` AND LOWER(title) LIKE :language`;
        }

        const result = await conn.execute(baseQuery, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows.map(mapJobRow));
    } catch (error) {
        res.status(500).json({ error: 'Failed to filter jobs', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 5️ Top Rated Jobs
router.get('/top-rated', async(req, res) => {
    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT job_id, title, description, budget, category, status, client_id, created_at
             FROM (SELECT * FROM Jobs ORDER BY job_id DESC)
             WHERE ROWNUM <= 10`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows.map(mapJobRow));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top rated jobs', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// ========================================
// 🔄 UPDATE ENDPOINTS (PROVENANCE TRACKING)
// ========================================

// 7️ Update Job Status (with Audit Trail)
router.put('/:jobId/status', async(req, res) => {
    const { jobId } = req.params;
    const { status, reason, changedBy } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['open', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') });
    }

    let conn;
    try {
        conn = await getConnection();

        let auditChangedBy = changedBy || 'SYSTEM';
        if (changedBy && changedBy.includes('(')) {
            auditChangedBy = changedBy;
        }

        // Guard: read the actual current status from Jobs table.
        // If it already matches the requested status, no real change is happening —
        // skip the stored proc so no duplicate audit row is written.
        const currentJobResult = await conn.execute(
            `SELECT status FROM Jobs WHERE job_id = :jobId`, { jobId: Number(jobId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (!currentJobResult.rows || currentJobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const currentStatus = currentJobResult.rows[0].STATUS;

        if (currentStatus === status) {
            return res.json({ message: 'Job status unchanged', jobId, newStatus: status });
        }

        await conn.execute(
            `BEGIN update_job_status_p(:jobId, :status, :changedBy, :reason); END;`, {
                jobId: Number(jobId),
                status,
                changedBy: auditChangedBy,
                reason: reason || 'Status updated'
            }, { autoCommit: true }
        );

        res.json({ message: 'Job status updated successfully', jobId, newStatus: status });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update job status', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
})

// 8️ Update Job Budget (with Audit Trail)
router.put('/:jobId/budget', async(req, res) => {
    const { jobId } = req.params;
    const { budget, reason, changedBy } = req.body;

    if (!budget) {
        return res.status(400).json({ error: 'budget is required' });
    }

    let conn;
    try {
        conn = await getConnection();

        // Extract user name from changedBy (format: "UserName (ROLE)")
        let auditChangedBy = changedBy || 'SYSTEM';
        if (changedBy && changedBy.includes('(')) {
            // Keep the full format "UserName (ROLE)" for better audit trail
            auditChangedBy = changedBy;
        }

        // Check last budget for this job
        const lastBudgetResult = await conn.execute(
            `SELECT new_budget FROM Audit_Jobs WHERE job_id = :jobId AND new_budget IS NOT NULL ORDER BY timestamp DESC FETCH FIRST 1 ROW ONLY`, { jobId: Number(jobId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const lastBudget = lastBudgetResult.rows && lastBudgetResult.rows.length > 0 ? lastBudgetResult.rows[0].NEW_BUDGET : null;
        if (Number(lastBudget) !== Number(budget)) {
            await conn.execute(
                `BEGIN update_job_budget_p(:jobId, :budget, :changedBy, :reason); END;`, {
                    jobId: Number(jobId),
                    budget: Number(budget),
                    changedBy: auditChangedBy,
                    reason: reason || 'Budget updated'
                }, { autoCommit: true }
            );
        }

        res.json({ message: 'Job budget updated successfully', jobId, newBudget: budget });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update job budget', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// ========================================
// 🔍 PROVENANCE/AUDIT ENDPOINTS
// ========================================

// 9️ Get Job Status Transitions (HOW-PROVENANCE)
router.get('/:jobId/audit/status-history', async(req, res) => {
    const { jobId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT 
                audit_id, job_id, old_status, new_status, 
                operation_type, timestamp, changed_by, change_reason
             FROM Audit_Jobs 
             WHERE job_id = :jobId AND (old_status IS NOT NULL OR new_status IS NOT NULL)
             ORDER BY timestamp DESC`, { jobId: Number(jobId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            jobId: Number(jobId),
            statusHistory: result.rows || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch status history', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 10️ Get Job Budget History (WHY-PROVENANCE)
router.get('/:jobId/audit/budget-history', async(req, res) => {
    const { jobId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT 
                audit_id, job_id, old_budget, new_budget, 
                operation_type, timestamp, changed_by, change_reason
             FROM Audit_Jobs 
             WHERE job_id = :jobId AND (old_budget IS NOT NULL OR new_budget IS NOT NULL)
             ORDER BY timestamp DESC`, { jobId: Number(jobId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            jobId: Number(jobId),
            budgetHistory: result.rows || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch budget history', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 11️ Get Complete Job Audit Trail (WHERE-PROVENANCE)
router.get('/:jobId/audit/complete', async(req, res) => {
    const { jobId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT 
                audit_id, job_id, old_status, new_status, old_budget, new_budget,
                operation_type, timestamp, changed_by, change_reason
             FROM Audit_Jobs 
             WHERE job_id = :jobId
             ORDER BY timestamp DESC`, { jobId: Number(jobId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            jobId: Number(jobId),
            completeAuditTrail: result.rows || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit trail', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 12️ Get All Jobs Audit Logs (Global View)
router.get('/audit/all-jobs', async(req, res) => {
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT 
                aj.audit_id, aj.job_id, j.title AS job_title, 
                aj.old_status, aj.new_status, aj.old_budget, aj.new_budget,
                aj.operation_type, aj.timestamp, aj.changed_by, aj.change_reason
             FROM Audit_Jobs aj
             JOIN Jobs j ON aj.job_id = j.job_id
             ORDER BY aj.timestamp DESC`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            totalRecords: result.rows.length,
            auditLogs: result.rows || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 13️ Get Job Action Summary (Who did what)
router.get('/:jobId/audit/actions-summary', async(req, res) => {
    const { jobId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT 
                changed_by, COUNT(*) as total_actions, 
                MAX(timestamp) as last_action_time
             FROM Audit_Jobs 
             WHERE job_id = :jobId
             GROUP BY changed_by
             ORDER BY total_actions DESC`, { jobId: Number(jobId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json({
            jobId: Number(jobId),
            actionsSummary: result.rows || []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch actions summary', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 14️ Get Client's Accepted/Active Jobs (only jobs with accepted applications)
router.get('/client/:clientId/my-projects', async(req, res) => {
    const { clientId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT DISTINCT j.job_id, j.title, j.description, j.budget, j.category, j.status, j.client_id, j.created_at
             FROM Jobs j
             INNER JOIN Applications a ON j.job_id = a.job_id
             WHERE j.client_id = :clientId AND a.status = 'accepted'
             ORDER BY j.created_at DESC`, { clientId: Number(clientId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows.map(mapJobRow));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch my projects', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// Get All Jobs For A Client
router.get('/client/:clientId/jobs', async(req, res) => {
    const { clientId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT job_id, title, description, budget, category, status, client_id, created_at
             FROM Jobs
             WHERE client_id = :clientId
             ORDER BY created_at DESC, job_id DESC`, { clientId: Number(clientId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows.map(mapJobRow));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch client jobs', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 6️ Job Details (MUST be last - catches /:jobId pattern)
router.get('/:jobId', async(req, res) => {
    const { jobId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT job_id, title, description, budget, category, status, client_id, created_at
             FROM Jobs
             WHERE job_id = :jobId`, { jobId }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json(mapJobRow(result.rows[0]));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch job details', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;