const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const getConnection = require('../models/db');

const dataDir = path.join(__dirname, '..', 'data');

function mapFreelancer(row) {
    return { id: row.USER_ID, name: row.NAME, email: row.EMAIL, role: row.ROLE };
}

// GET /api/freelancers
router.get('/', async(req, res) => {
    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT user_id, name, email, role FROM Users WHERE role = 'freelancer'`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return res.json(result.rows.map(mapFreelancer));
    } catch (error) {
        // Fallback to JSON file
        try {
            const content = await fs.readFile(path.join(dataDir, 'freelancers.json'), 'utf8');
            const list = JSON.parse(content) || [];
            return res.json(list.map(f => ({ id: f.id, name: f.name, email: f.email, role: f.role })));
        } catch (e) {
            return res.json([]);
        }
    } finally {
        if (conn) await conn.close();
    }
});

// GET /api/freelancers/:id
router.get('/:id', async(req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT user_id, name, email, role FROM Users WHERE user_id = :id AND role = 'freelancer'`, { id: Number(id) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ error: 'Freelancer not found' });
        }
        return res.json(mapFreelancer(result.rows[0]));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch freelancer', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// POST /api/freelancers/hire — Client hires a freelancer for a job
router.post('/hire', async(req, res) => {
    const { jobId, freelancerId, clientId, changedBy } = req.body;
    if (!jobId || !freelancerId || !clientId) {
        return res.status(400).json({ error: 'jobId, freelancerId, and clientId are required' });
    }
    let conn;
    try {
        conn = await getConnection();
        // Insert application with status 'pending' (hire request)
        await conn.execute(
            `INSERT INTO Applications (app_id, job_id, freelancer_id, status, proposal)
             VALUES (app_seq.NEXTVAL, :jobId, :freelancerId, 'pending', :proposal)`, {
                jobId: Number(jobId),
                freelancerId: Number(freelancerId),
                proposal: `Hire request from client ${changedBy || clientId}`
            }, { autoCommit: true }
        );
        // Get the created app_id
        const result = await conn.execute(
            `SELECT app_id FROM Applications WHERE job_id = :jobId AND freelancer_id = :freelancerId ORDER BY app_id DESC`, { jobId: Number(jobId), freelancerId: Number(freelancerId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const appId = result.rows[0] && result.rows[0].APP_ID;
        res.status(201).json({ message: 'Hire request sent', appId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send hire request', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// PUT /api/freelancers/hire/:appId/respond — Freelancer accepts or rejects hire
router.put('/hire/:appId/respond', async(req, res) => {
    const { appId } = req.params;
    const { status, changedBy } = req.body; // status: 'accepted' or 'rejected'
    if (!status || !['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'status must be accepted or rejected' });
    }
    let conn;
    try {
        conn = await getConnection();
        // Update application status via stored procedure
        await conn.execute(
            `BEGIN update_application_status_p(:appId, :status, :changedBy, :reason); END;`, {
                appId: Number(appId),
                status,
                changedBy: changedBy || 'FREELANCER',
                reason: status === 'accepted' ? 'Freelancer accepted hire request' : 'Freelancer rejected hire request'
            }, { autoCommit: true }
        );

        // If accepted, update job status to 'in-progress'
        if (status === 'accepted') {
            const appResult = await conn.execute(
                `SELECT job_id, freelancer_id FROM Applications WHERE app_id = :appId`, { appId: Number(appId) }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            if (appResult.rows.length > 0) {
                const jobId = appResult.rows[0].JOB_ID;
                await conn.execute(
                    `BEGIN update_job_status_p(:jobId, :status, :changedBy, :reason); END;`, {
                        jobId,
                        status: 'in-progress',
                        changedBy: changedBy || 'FREELANCER',
                        reason: 'Freelancer accepted hire - job now in progress'
                    }, { autoCommit: true }
                );
            }
        }
        res.json({ message: `Hire request ${status}`, appId: Number(appId) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to respond to hire request', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

module.exports = router;