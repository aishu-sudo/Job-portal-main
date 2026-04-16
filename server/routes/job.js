const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const getConnection = require('../models/db');

function mapJobRow(row) {
    return {
        jobId: row.JOB_ID,
        title: row.TITLE,
        description: row.DESCRIPTION,
        budget: row.BUDGET,
        clientId: row.CLIENT_ID
    };
}

router.get('/browse', async(req, res) => {
    let conn;
    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT job_id, title, description, budget, client_id
             FROM Jobs
             ORDER BY job_id DESC`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows.map(mapJobRow));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 2️ Apply for a Job
router.post('/:jobId/apply', async(req, res) => {
    const { freelancerId } = req.body;
    const { jobId } = req.params;
    let conn;

    if (!freelancerId) {
        return res.status(400).json({ error: 'freelancerId is required' });
    }

    try {
        conn = await getConnection();
        await conn.execute(
            `INSERT INTO Applications (app_id, job_id, freelancer_id, status)
             VALUES (app_seq.NEXTVAL, :jobId, :freelancerId, 'pending')`, { jobId, freelancerId }, { autoCommit: true }
        );

        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to apply for job', details: error.message });
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
            `SELECT job_id, title, description, budget, client_id
             FROM Jobs
             WHERE ROWNUM <= 10`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows.map(mapJobRow));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top rated jobs', details: error.message });
    } finally {
        if (conn) await conn.close();
    }
});

// 6️ Job Details (Optional)
router.get('/:jobId', async(req, res) => {
    const { jobId } = req.params;
    let conn;

    try {
        conn = await getConnection();
        const result = await conn.execute(
            `SELECT job_id, title, description, budget, client_id
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